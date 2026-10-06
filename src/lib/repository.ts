import { explainMovement, type Explanation } from '../domain/explain.ts';
import { entityHistory, reigns, type EntityHistory, type Reign } from '../domain/history.ts';
import { computeMovements, isBaseline } from '../domain/movements.ts';
import type {
  ChartDef,
  Entity,
  Episode,
  Host,
  Mention,
  Movement,
  OutMovement,
  Provenance,
  ScoringProfile,
  Snapshot,
  SnapshotEntry,
  Source,
  Story,
  Take,
  Topic,
  Unit,
} from '../domain/schema.ts';
import { compareWeeks, nextWeek, previousWeek, weekEnd, weekStart } from '../domain/weeks.ts';
import { siteConfig } from '../config/site.ts';
import { contentVersion, loadContent, type Content } from './load.ts';
import { validateContent } from './validate.ts';

/**
 * Accès au contenu pour les pages : un index en mémoire, construit une fois, et des « vues » qui assemblent
 * snapshots, mouvements, historique et avis. Les pages n'ont jamais à connaître la forme des fichiers.
 */
interface Index {
  c: Content;
  entities: Map<string, Entity>;
  charts: Map<string, ChartDef>;
  profiles: Map<string, ScoringProfile>;
  hosts: Map<string, Host>;
  topics: Map<string, Topic>;
  sources: Map<string, Source>;
  episodes: Map<number, Episode>;
  stories: Map<string, Story>;
}

let cached: Index | undefined;
let cachedVersion = -1;

export function index(): Index {
  const version = contentVersion();
  if (cached && cachedVersion === version) return cached;
  const c = loadContent();
  const errors = validateContent(c, { live: siteConfig.dataMode === 'live' }).filter(
    (i) => i.level === 'error',
  );
  if (errors.length > 0) {
    throw new Error(
      `Contenu invalide (${String(errors.length)} erreur(s)) :\n${errors.map((e) => `  - ${e.where} : ${e.message}`).join('\n')}`,
    );
  }
  cached = {
    c,
    entities: new Map(c.entities.map((e) => [e.slug, e])),
    charts: new Map(c.charts.map((e) => [e.slug, e])),
    profiles: new Map(c.scoring.map((e) => [e.id, e])),
    hosts: new Map(c.hosts.map((e) => [e.slug, e])),
    topics: new Map(c.topics.map((e) => [e.slug, e])),
    sources: new Map(c.sources.map((e) => [e.id, e])),
    episodes: new Map(c.episodes.map((e) => [e.number, e])),
    stories: new Map(c.stories.map((e) => [e.slug, e])),
  };
  cachedVersion = version;
  return cached;
}

export const content = (): Content => index().c;

function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Introuvable : ${what}`);
  return value;
}

export const getEntity = (slug: string): Entity =>
  must(index().entities.get(slug), `entité ${slug}`);
export const findEntity = (slug: string): Entity | undefined => index().entities.get(slug);
export const getChart = (slug: string): ChartDef =>
  must(index().charts.get(slug), `classement ${slug}`);
export const findChart = (slug: string): ChartDef | undefined => index().charts.get(slug);
export const getProfile = (chart: ChartDef): ScoringProfile =>
  must(index().profiles.get(chart.scoring), `profil ${chart.scoring}`);
export const getHost = (slug: string): Host => must(index().hosts.get(slug), `animateur ${slug}`);
export const getTopic = (slug: string): Topic => must(index().topics.get(slug), `thème ${slug}`);
export const findTopic = (slug: string): Topic | undefined => index().topics.get(slug);
export const getSource = (id: string): Source => must(index().sources.get(id), `source ${id}`);
export const getEpisode = (n: number): Episode | undefined => index().episodes.get(n);
export const getStory = (slug: string): Story | undefined => index().stories.get(slug);

export const allCharts = (): ChartDef[] => content().charts;
export const allEntities = (): Entity[] => content().entities;
export const allEpisodes = (): Episode[] => content().episodes;
export const allStories = (): Story[] => content().stories;
export const allHosts = (): Host[] => content().hosts;
export const allTopics = (): Topic[] => content().topics;

export const entityPath = (entity: Pick<Entity, 'kind' | 'slug'>): string =>
  `/${entity.kind === 'project' ? 'projects' : entity.kind === 'model' ? 'models' : 'tools'}/${entity.slug}`;

export const snapshotsOf = (chart: string): Snapshot[] => content().snapshots[chart] ?? [];
export const weeksOf = (chart: string): string[] => snapshotsOf(chart).map((s) => s.week);

/** Dernière semaine publiée, tous classements confondus. */
export function latestWeek(): string {
  const weeks = allCharts().flatMap((c) => weeksOf(c.slug).slice(-1));
  return must(weeks.sort(compareWeeks).at(-1), 'semaine publiée');
}

/** Toutes les semaines publiées par au moins un classement, de la plus récente à la plus ancienne. */
export function publishedWeeks(): string[] {
  const weeks = new Set(allCharts().flatMap((c) => weeksOf(c.slug)));
  return [...weeks].sort((a, b) => compareWeeks(b, a));
}

// ---------------------------------------------------------------------------------------------
// Métriques d'un classement
// ---------------------------------------------------------------------------------------------

export interface MetricInfo {
  key: string;
  label: string;
  unit: Unit;
  decimals: number;
  source?: Source | undefined;
  description?: string;
}

export function metricInfos(chart: ChartDef): Map<string, MetricInfo> {
  const profile = getProfile(chart);
  const out = new Map<string, MetricInfo>();
  for (const m of profile.metrics) {
    out.set(m.key, {
      key: m.key,
      label: m.label,
      unit: m.unit,
      decimals: m.decimals,
      source: index().sources.get(m.source),
      ...(m.description ? { description: m.description } : {}),
    });
  }
  for (const d of profile.derived) {
    out.set(d.key, { key: d.key, label: d.label, unit: d.unit, decimals: d.decimals });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Avis (OUR TAKE)
// ---------------------------------------------------------------------------------------------

export interface TakeView {
  id: string;
  host: Host;
  text: string;
  publishedAt: string;
}

const toTakeView = (t: Take): TakeView => ({
  id: t.id,
  host: getHost(t.host),
  text: t.text,
  publishedAt: t.publishedAt,
});

export function takeFor(chart: string, week: string, entity: string): TakeView | null {
  const take = content().takes.find(
    (t) => t.chart === chart && t.week === week && t.entity === entity,
  );
  return take ? toTakeView(take) : null;
}

/** Tous les avis sur une entité, du plus récent au plus ancien. */
export function takesForEntity(entity: string): (TakeView & { chart?: ChartDef; week?: string })[] {
  return content()
    .takes.filter((t) => t.entity === entity)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .map((t) => ({
      ...toTakeView(t),
      ...(t.chart ? { chart: getChart(t.chart) } : {}),
      ...(t.week ? { week: t.week } : {}),
    }));
}

// ---------------------------------------------------------------------------------------------
// Vue d'un classement à une semaine donnée
// ---------------------------------------------------------------------------------------------

export interface RowModel {
  entity: Entity;
  rank: number;
  score: number;
  dimensions: Record<string, number>;
  metrics: Record<string, number>;
  movement: Movement;
  previous: SnapshotEntry | undefined;
  explanation: Explanation | null;
  take: TakeView | null;
  /** Rang dans le pool sur les 12 dernières semaines, null si l'entité n'était pas suivie. */
  rankSeries: (number | null)[];
  stats: EntityHistory;
}

export interface BubblingRow {
  entity: Entity;
  rank: number;
  score: number;
  previousRank: number | null;
}

export type OutRow = Omit<OutMovement, 'entity'> & { entity: Entity };

export interface ChartView {
  chart: ChartDef;
  profile: ScoringProfile;
  snapshot: Snapshot;
  week: string;
  weekStartIso: string;
  weekEndIso: string;
  isLatest: boolean;
  baseline: boolean;
  previousWeek: string | null;
  nextWeek: string | null;
  rows: RowModel[];
  bubbling: BubblingRow[];
  out: OutRow[];
  reigns: Reign[];
}

const SPARK_WEEKS = 12;

export function chartView(chartSlug: string, week?: string): ChartView {
  const chart = getChart(chartSlug);
  const profile = getProfile(chart);
  const history = snapshotsOf(chartSlug);
  const idx = week ? history.findIndex((s) => s.week === week) : history.length - 1;
  const snapshot = must(history[idx], `snapshot ${chartSlug} ${week ?? '(dernier)'}`);
  const upTo = history.slice(0, idx + 1);
  const { moves, out } = computeMovements(history, idx, chart.size);
  const previousSnapshot = history[idx - 1];
  const baseline = isBaseline(idx);

  const rows: RowModel[] = moves.map((movement) => {
    const entry = must(
      snapshot.entries.find((e) => e.entity === movement.entity),
      movement.entity,
    );
    const previous = previousSnapshot?.entries.find((e) => e.entity === movement.entity);
    const stats = entityHistory(upTo, movement.entity, chart.size);
    return {
      entity: getEntity(movement.entity),
      rank: entry.rank,
      score: entry.score,
      dimensions: entry.dimensions,
      metrics: entry.metrics,
      movement,
      previous,
      explanation: baseline
        ? null
        : explainMovement({ profile, entry, previous, movement, pool: snapshot.entries }),
      take: takeFor(chartSlug, snapshot.week, movement.entity),
      rankSeries: stats.points.slice(-SPARK_WEEKS).map((p) => p.rank),
      stats,
    };
  });

  const bubbling: BubblingRow[] = snapshot.entries
    .filter((e) => e.rank > chart.size)
    .map((e) => ({
      entity: getEntity(e.entity),
      rank: e.rank,
      score: e.score,
      previousRank: previousSnapshot?.entries.find((p) => p.entity === e.entity)?.rank ?? null,
    }));

  const next = history[idx + 1];
  const prev = history[idx - 1];
  return {
    chart,
    profile,
    snapshot,
    week: snapshot.week,
    weekStartIso: weekStart(snapshot.week).toISOString(),
    weekEndIso: weekEnd(snapshot.week).toISOString(),
    isLatest: idx === history.length - 1,
    baseline,
    previousWeek: prev?.week ?? null,
    nextWeek: next?.week ?? null,
    rows,
    bubbling,
    out: baseline ? [] : out.map((o) => ({ ...o, entity: getEntity(o.entity) })),
    reigns: reigns(upTo),
  };
}

// ---------------------------------------------------------------------------------------------
// Faits marquants de la semaine
// ---------------------------------------------------------------------------------------------

export type HighlightKind = 'number-one' | 'surge' | 'up' | 'new' | 're' | 'down' | 'out';

export interface Highlight {
  kind: HighlightKind;
  chart: ChartDef;
  week: string;
  entity: Entity;
  rank: number | null;
  delta: number;
  /** Chiffre qui accompagne le mouvement (stars gagnées, score…), déjà formaté côté page. */
  stat?: { label: string; value: number; unit: Unit };
}

const PRIORITY: Record<HighlightKind, number> = {
  'number-one': 0,
  surge: 1,
  up: 2,
  new: 3,
  re: 4,
  down: 5,
  out: 6,
};

/** Les mouvements qui comptent cette semaine, tous classements confondus, du plus marquant au moins marquant. */
export function weeklyHighlights(week: string = latestWeek()): Highlight[] {
  const out: Highlight[] = [];
  for (const chart of allCharts()) {
    if (!weeksOf(chart.slug).includes(week)) continue;
    const view = chartView(chart.slug, week);
    if (view.baseline) continue;

    const first = view.rows[0];
    const firstChanged = first !== undefined && first.movement.kind !== 'stable';

    // Les « surges » (gros gain de stars) n'ont de sens que pour les classements GitHub.
    const best =
      chart.entityKind === 'project'
        ? [...view.snapshot.entries].sort(
            (a, b) => (b.metrics['stars7d'] ?? 0) - (a.metrics['stars7d'] ?? 0),
          )[0]
        : undefined;
    const gained = best?.metrics['stars7d'];
    const surgeOnLeader = firstChanged && best?.entity === first.entity.slug;

    if (firstChanged) {
      out.push({
        kind: 'number-one',
        chart,
        week,
        entity: first.entity,
        rank: 1,
        delta: first.movement.delta,
        // Le gain de stars du nouveau leader est affiché avec sa prise de tête, pas sur une seconde ligne.
        ...(surgeOnLeader && gained !== undefined
          ? { stat: { label: 'stars en 7 jours', value: gained, unit: 'count' as const } }
          : {}),
      });
    }
    if (best && gained !== undefined && gained >= 8000 && !surgeOnLeader) {
      out.push({
        kind: 'surge',
        chart,
        week,
        entity: getEntity(best.entity),
        rank: best.rank <= chart.size ? best.rank : null,
        delta: 0,
        stat: { label: 'stars en 7 jours', value: gained, unit: 'count' },
      });
    }

    const climbers = view.rows
      .filter((r) => r.movement.kind === 'up' && r.movement.delta >= 2)
      .sort((a, b) => b.movement.delta - a.movement.delta)
      .slice(0, 2);
    for (const r of climbers) {
      if (r.entity.slug === first?.entity.slug && first.movement.kind !== 'stable') continue;
      out.push({
        kind: 'up',
        chart,
        week,
        entity: r.entity,
        rank: r.rank,
        delta: r.movement.delta,
      });
    }
    for (const r of view.rows.filter(
      (x) => x.movement.kind === 'new' || x.movement.kind === 're',
    )) {
      out.push({
        kind: r.movement.kind === 'new' ? 'new' : 're',
        chart,
        week,
        entity: r.entity,
        rank: r.rank,
        delta: 0,
      });
    }
    const fallers = view.rows
      .filter((r) => r.movement.kind === 'down' && r.movement.delta <= -3)
      .sort((a, b) => a.movement.delta - b.movement.delta)
      .slice(0, 1);
    for (const r of fallers) {
      out.push({
        kind: 'down',
        chart,
        week,
        entity: r.entity,
        rank: r.rank,
        delta: r.movement.delta,
      });
    }
    for (const o of view.out.slice(0, 2)) {
      out.push({ kind: 'out', chart, week, entity: o.entity, rank: o.currentRank, delta: 0 });
    }
  }
  return out.sort(
    (a, b) => PRIORITY[a.kind] - PRIORITY[b.kind] || Math.abs(b.delta) - Math.abs(a.delta),
  );
}

/** Rang d'une entité à la dernière semaine, par classement où elle figure dans le Top. */
export function currentRanks(entity: string): { chart: ChartDef; rank: number; week: string }[] {
  return allCharts().flatMap((chart) => {
    const last = snapshotsOf(chart.slug).at(-1);
    const entry = last?.entries.find((e) => e.entity === entity);
    return entry && entry.rank <= chart.size
      ? [{ chart, rank: entry.rank, week: last?.week ?? '' }]
      : [];
  });
}

export { previousWeek, nextWeek };

// ---------------------------------------------------------------------------------------------
// Fiche d'une entité
// ---------------------------------------------------------------------------------------------

export interface Appearance {
  chart: ChartDef;
  profile: ScoringProfile;
  week: string;
  publishedAt: string;
  provenance: Provenance;
  entry: SnapshotEntry | undefined;
  history: EntityHistory;
  movement: Movement | null;
  explanation: Explanation | null;
  tracked: { info: MetricInfo; series: { week: string; value: number | null }[] };
  /** Rang dans le pool de la dernière semaine, si l'entité y figure sans être dans le Top. */
  bubblingRank: number | null;
}

export interface EntityView {
  entity: Entity;
  appearances: Appearance[];
  takes: ReturnType<typeof takesForEntity>;
}

export function entityView(slug: string): EntityView {
  const entity = getEntity(slug);
  const appearances: Appearance[] = [];
  for (const chart of allCharts()) {
    if (chart.entityKind !== entity.kind) continue;
    const history = snapshotsOf(chart.slug);
    if (!history.some((s) => s.entries.some((e) => e.entity === slug))) continue;
    const profile = getProfile(chart);
    const stats = entityHistory(history, slug, chart.size);
    const lastIdx = history.length - 1;
    const last = history[lastIdx];
    const entry = last?.entries.find((e) => e.entity === slug);
    const infos = metricInfos(chart);
    const trackedInfo = infos.get(chart.trackedMetric);
    const view = entry && entry.rank <= chart.size ? chartView(chart.slug) : null;
    const row = view?.rows.find((r) => r.entity.slug === slug);
    appearances.push({
      chart,
      profile,
      week: last?.week ?? '',
      publishedAt: last?.publishedAt ?? '',
      provenance: last?.provenance ?? 'mock',
      entry,
      history: stats,
      movement: row?.movement ?? null,
      explanation: row?.explanation ?? null,
      tracked: {
        info: must(trackedInfo, `métrique ${chart.trackedMetric}`),
        series: stats.points.map((p) => ({
          week: p.week,
          value: p.metrics[chart.trackedMetric] ?? null,
        })),
      },
      bubblingRank: entry && entry.rank > chart.size ? entry.rank : null,
    });
  }
  // Les classements où l'entité est dans le Top d'abord, puis par rang.
  appearances.sort((a, b) => (a.entry?.rank ?? 999) - (b.entry?.rank ?? 999));
  return { entity, appearances, takes: takesForEntity(slug) };
}

export type { Mention };
