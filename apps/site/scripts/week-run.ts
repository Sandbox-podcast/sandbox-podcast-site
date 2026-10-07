/**
 * Mise à jour hebdomadaire des classements.
 *
 *   node scripts/week-run.ts --week 2026-W41                      # une semaine, tous les classements
 *   node scripts/week-run.ts --from 2026-W26 --to 2026-W41        # une plage (historique de démonstration)
 *   node scripts/week-run.ts --week 2026-W41 --chart github --dry # simulation, rien n'est écrit
 *   node scripts/week-run.ts --from 2026-W26 --to 2026-W41 --rebuild-mock
 *
 * Règle d'or : un snapshot publié ne se modifie pas. `--rebuild-mock` ne supprime que des snapshots dont la
 * provenance est `mock`, jamais des relevés réels.
 */
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { computeMovements } from '../src/domain/movements.ts';
import type { Snapshot } from '../src/domain/schema.ts';
import { compareWeeks, nextWeek } from '../src/domain/weeks.ts';
import { loadContent } from '../src/lib/load.ts';
import { mockConnector, mockPublishedAt } from '../src/pipeline/mock/index.ts';
import { assertAppendOnly, runWeek } from '../src/pipeline/run-week.ts';

const { values } = parseArgs({
  options: {
    week: { type: 'string' },
    from: { type: 'string' },
    to: { type: 'string' },
    chart: { type: 'string' },
    connector: { type: 'string', default: 'mock' },
    dry: { type: 'boolean', default: false },
    'rebuild-mock': { type: 'boolean', default: false },
    quiet: { type: 'boolean', default: false },
  },
});

if (values.connector !== 'mock') {
  console.error(
    `Connecteur « ${values.connector} » indisponible : seul le connecteur mock est branché (docs/site/data-strategy.md).`,
  );
  process.exit(1);
}

const from = values.week ?? values.from;
const to = values.week ?? values.to;
if (!from || !to) {
  console.error('Indiquez --week AAAA-Wnn, ou --from et --to.');
  process.exit(1);
}

const root = process.cwd();
const content = loadContent(root);
const charts = content.charts.filter((c) => !values.chart || c.slug === values.chart);
if (charts.length === 0) {
  console.error(`Classement inconnu : ${values.chart ?? ''}`);
  process.exit(1);
}

/** Écriture lisible : en-tête développé, une entrée par ligne pour des diffs Git exploitables. */
function serialize(snapshot: Snapshot): string {
  const { entries, ...head } = snapshot;
  const headJson = JSON.stringify(head, null, 2).slice(0, -2);
  const lines = entries.map((e) => `    ${JSON.stringify(e)}`).join(',\n');
  return `${headJson},\n  "entries": [\n${lines}\n  ]\n}\n`;
}

let written = 0;
for (const chart of charts) {
  const profile = content.scoring.find((p) => p.id === chart.scoring);
  if (!profile) throw new Error(`Profil de scoring introuvable : ${chart.scoring}`);
  const dir = join(root, 'data', 'snapshots', chart.slug);
  mkdirSync(dir, { recursive: true });

  if (values['rebuild-mock']) {
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const week = file.replace('.json', '');
      if (compareWeeks(week, from) < 0 || compareWeeks(week, to) > 0) continue;
      const existing = (content.snapshots[chart.slug] ?? []).find((s) => s.week === week);
      if (existing && existing.provenance !== 'mock') {
        throw new Error(
          `${chart.slug} ${week} : provenance ${existing.provenance}, suppression refusée.`,
        );
      }
      if (!values.dry) rmSync(join(dir, file));
    }
  }
  const existingWeeks = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace('.json', ''))
        .filter(
          (w) => !values['rebuild-mock'] || compareWeeks(w, from) < 0 || compareWeeks(w, to) > 0,
        )
    : [];

  const history: Snapshot[] = (content.snapshots[chart.slug] ?? []).filter((s) =>
    existingWeeks.includes(s.week),
  );

  for (let week = from; compareWeeks(week, to) <= 0; week = nextWeek(week)) {
    assertAppendOnly(existingWeeks, week);
    const result = await runWeek({
      chart,
      profile,
      entities: content.entities,
      week,
      connector: mockConnector,
      publishedAt: mockPublishedAt(week),
    });
    if (!values.dry) writeFileSync(join(dir, `${week}.json`), serialize(result.snapshot));
    existingWeeks.push(week);
    history.push(result.snapshot);
    written += 1;

    if (!values.quiet) {
      const { moves, out } = computeMovements(history, history.length - 1, chart.size);
      const names = new Map(content.entities.map((e) => [e.slug, e.name] as const));
      const line = result.snapshot.entries
        .slice(0, chart.size)
        .map((e) => `${String(e.rank)}.${names.get(e.entity) ?? e.entity}`)
        .join('  ');
      console.log(`${chart.slug} ${week}  ${line}`);
      const notable = moves.filter((m) => m.kind !== 'stable' && history.length > 1);
      if (notable.length > 0 || out.length > 0) {
        const parts = [
          ...notable.map(
            (m) =>
              `${m.kind.toUpperCase()} ${names.get(m.entity) ?? m.entity}${m.delta ? ` ${String(m.delta)}` : ''}`,
          ),
          ...out.map((o) => `OUT ${names.get(o.entity) ?? o.entity}`),
        ];
        console.log(`    ${parts.join(' | ')}`);
      }
    }
  }
}
console.log(
  `${values.dry ? '[dry] ' : ''}${String(written)} snapshot(s) ${values.dry ? 'simulés' : 'écrits'}.`,
);
