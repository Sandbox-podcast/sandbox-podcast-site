import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { planChartsRecovery, refreshCharts } from '../src/domain/charts-refresh-runner.ts';

const slot = '2026-10-20T00:00Z';
const edition = (chart: string, weekId = slot) => ({
  chart,
  weekId,
  publishedAt: '2026-10-20T03:20:00Z',
  entries: [{ rank: 1 }],
});
const editions = ['github', 'skills', 'models', 'rising'].map((chart) => ({
  chart,
  value: edition(chart),
}));
const recoveryReportSchema = z.object({
  results: z.array(z.object({ chart: z.string(), ok: z.boolean() })),
  recovery: z.object({ needed: z.boolean(), missing: z.array(z.string()) }).optional(),
});
const workflow = readFileSync(
  new URL('../../../.github/workflows/charts-refresh.yml', import.meta.url),
  'utf8',
).replaceAll('\r\n', '\n');

function runRecovery(
  stale: boolean,
  secret = '',
  options: {
    mode?: string;
    output?: string;
    now?: string;
    unavailable?: boolean;
    publicStatus?: number;
    cronStatus?: number;
    risingPending?: boolean;
  } = {},
) {
  const now = options.now ?? '2026-10-20T06:23:00Z';
  const fixture = `
    const NativeDate = Date;
    globalThis.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : ['${now}'])); }
      static now() { return NativeDate.parse('${now}'); }
    };
    let collected = false;
    globalThis.fetch = async (url) => {
      if (${Boolean(options.unavailable)}) throw new Error('API unavailable');
      const path = url.pathname;
      if (path.startsWith('/api/cron/')) {
        console.log('COLLECT:' + path);
        collected = true;
        return Response.json({ status: 'success', processed: 20, succeeded: 20,
          failed: 0, snapshotsCreated: 20, remaining: 0 },
          { status: ${options.cronStatus ?? 200} });
      }
      const chart = path.split('/')[3];
      if (chart === 'rising' && ${Boolean(options.risingPending)})
        return Response.json({ chart, status: 'pending', entries: [] }, { status: 202 });
      return Response.json({ chart,
        weekId: ${stale} && !collected ? '2026-10-19T12:00Z' : '${slot}',
        publishedAt: '2026-10-20T03:20:00Z', entries: [{ rank: 1 }] },
        { status: ${options.publicStatus ?? 200} });
    };
  `;
  return spawnSync(
    process.execPath,
    [
      '--import',
      `data:text/javascript,${encodeURIComponent(fixture)}`,
      new URL('../scripts/charts-refresh.ts', import.meta.url).pathname.replace(
        /^\/([A-Z]:)/,
        '$1',
      ),
      options.mode ?? '--recover',
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        CHARTS_ORIGIN: 'https://example.test',
        CRON_SECRET: secret,
        GITHUB_OUTPUT: options.output ?? '',
        GITHUB_STEP_SUMMARY: '',
      },
    },
  );
}

describe('reprise horaire des classements après un créneau omis', () => {
  it.each(['2026-10-20T03:16:59Z', '2026-10-20T15:16:59Z'])(
    'ne déclenche aucune collecte avant son heure prévue : %s',
    (instant) => {
      expect(planChartsRecovery([], new Date(instant)).needed).toBe(false);
    },
  );

  it.each([
    ['2026-10-20T03:17:00Z', '2026-10-20T00:00Z'],
    ['2026-10-20T15:17:00Z', '2026-10-20T12:00Z'],
  ])('rattrape uniquement le créneau courant dû à %s', (instant, expectedSlot) => {
    expect(planChartsRecovery([], new Date(instant))).toEqual({
      needed: true,
      slot: expectedSlot,
      missing: ['github', 'skills', 'models'],
    });
  });

  it('reprend un seul classement en retard même si son édition a moins de dix-huit heures', () => {
    const stale = editions.map((item) =>
      item.chart === 'models'
        ? { chart: 'models', value: edition('models', '2026-10-19T12:00Z') }
        : item,
    );
    expect(planChartsRecovery(stale, new Date('2026-10-20T04:00:00Z'))).toEqual({
      needed: true,
      slot,
      missing: ['models'],
    });
  });

  it('ne recollecte pas chaque heure uniquement parce que Rising attend son historique', () => {
    expect(
      planChartsRecovery(
        editions.filter((item) => item.chart !== 'rising'),
        new Date('2026-10-20T06:23:00Z'),
      ).needed,
    ).toBe(false);
  });

  it('relit les éditions après le verrou et sort sans secret si un autre passage les a publiées', () => {
    const result = runRecovery(false);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain('COLLECT:');
  });

  it('refuse de collecter sans secret lorsque le créneau dû manque', () => {
    const result = runRecovery(true);
    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain('COLLECT:');
    expect(result.stderr).toContain('SANDBOX_CHARTS_CRON_SECRET manque');
  });

  it('demande la reprise du créneau dû même si le contrôle des dix-huit heures réussit', () => {
    const directory = mkdtempSync(join(tmpdir(), 'charts-recovery-'));
    try {
      const output = join(directory, 'output');
      const result = runRecovery(true, '', {
        mode: '--check',
        output,
        now: '2026-10-20T04:23:00Z',
      });
      expect(result.status).toBe(0);
      expect(readFileSync(output, 'utf8')).toBe('recovery-needed=true\n');
      expect(result.stdout).not.toContain('COLLECT:');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('ne tente aucune collecte à l’aveugle lorsque la lecture publique est indisponible', () => {
    const result = runRecovery(true, 'fixture-secret-not-real', { unavailable: true });
    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain('COLLECT:');
    expect(result.stdout + result.stderr).not.toContain('fixture-secret');
  });

  it('distingue le 503 public indisponible d’un 503 de collecte partiellement persistée', () => {
    const result = runRecovery(true, 'fixture-secret-not-real', { publicStatus: 503 });
    expect(result.status).toBe(1);
    expect(result.stdout).not.toContain('COLLECT:');
    const persisted = runRecovery(true, 'fixture-secret-not-real', { cronStatus: 503 });
    expect(persisted.status).toBe(0);
    expect(persisted.stdout.match(/COLLECT:/g)).toHaveLength(6);
  });

  it('reprend les trois chaînes périmées même si Rising répond 202 en attente d’historique', () => {
    const directory = mkdtempSync(join(tmpdir(), 'charts-recovery-'));
    try {
      const output = join(directory, 'output');
      const check = runRecovery(true, '', { mode: '--check', output, risingPending: true });
      expect(check.status).toBe(1);
      expect(readFileSync(output, 'utf8')).toBe('recovery-needed=true\n');
      const recovered = runRecovery(true, 'fixture-secret-not-real', { risingPending: true });
      expect(recovered.status).toBe(1);
      expect(recovered.stdout.match(/COLLECT:/g)).toHaveLength(6);
      const value: unknown = JSON.parse(recovered.stdout.slice(recovered.stdout.indexOf('{')));
      const report = recoveryReportSchema.parse(value);
      expect(report.results).toEqual(
        expect.arrayContaining([
          { chart: 'github', ok: true },
          { chart: 'skills', ok: true },
          { chart: 'models', ok: true },
          { chart: 'rising', ok: false },
        ]),
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('ne collecte aucune chaîne lorsque seul Rising répond 202 en attente d’historique', () => {
    const directory = mkdtempSync(join(tmpdir(), 'charts-recovery-'));
    try {
      const output = join(directory, 'output');
      const check = runRecovery(false, '', { mode: '--check', output, risingPending: true });
      expect(check.status).toBe(1);
      expect(readFileSync(output, 'utf8')).toBe('recovery-needed=false\n');
      expect(check.stdout).not.toContain('COLLECT:');
      const recovered = runRecovery(false, '', { risingPending: true });
      expect(recovered.status).toBe(1);
      expect(recovered.stdout).not.toContain('COLLECT:');
      const value: unknown = JSON.parse(recovered.stdout);
      const report = recoveryReportSchema.parse(value);
      expect(report.recovery).toEqual({ needed: false, missing: [] });
      expect(report.results).toContainEqual({ chart: 'rising', ok: false });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('laisse les chaînes déjà publiées au créneau dû sans nouvelle collecte', async () => {
    const jobs: string[] = [];
    const result = await refreshCharts(
      {
        job: async (name) => {
          jobs.push(name);
          return {
            status: 'success',
            processed: 20,
            succeeded: 20,
            failed: 0,
            snapshotsCreated: 20,
          };
        },
        current: async (chart) => edition(chart),
        wait: () => Promise.resolve(),
      },
      new Date('2026-10-20T06:23:00Z'),
      ['models'],
    );
    expect(jobs).toEqual(['models-daily', 'models-freeze']);
    expect(result.ok).toBe(true);
  });

  it('arrête les appels de reprise et le gel lorsque l’horloge passe au créneau suivant', async () => {
    let instant = new Date('2026-10-20T11:59:00Z');
    const jobs: string[] = [];
    const result = await refreshCharts(
      {
        job: async (name) => {
          jobs.push(name);
          instant = new Date('2026-10-20T12:00:00Z');
          return { status: 'partial', processed: 1, succeeded: 1, failed: 0, snapshotsCreated: 1 };
        },
        current: () => Promise.resolve({ status: 'pending', entries: [] }),
        wait: () => Promise.resolve(),
        mayRunJob: () => planChartsRecovery([], instant).slot === slot,
      },
      instant,
    );
    expect(jobs).toEqual(['github-daily']);
    expect(result.ok).toBe(false);
    expect(result.results.every((row) => row.statuses.includes('skipped'))).toBe(true);
  });

  it('effectue une seule reprise bornée avec le secret et contrôle le résultat public', () => {
    const result = runRecovery(true, 'fixture-secret-not-real');
    expect(result.status).toBe(0);
    expect(result.stdout.match(/COLLECT:/g)).toHaveLength(6);
    expect(result.stdout).toContain('Édition publique vérifiée.');
    expect(result.stdout + result.stderr).not.toContain('fixture-secret');
  });

  it('partage le verrou de collecte et garde un budget propre au contrôle public', () => {
    const refresh = workflow.split('\n  refresh:\n')[1]?.split('\n  freshness:\n')[0];
    const daily = readFileSync(
      new URL('../../../.github/workflows/news-refresh.yml', import.meta.url),
      'utf8',
    ).replaceAll('\r\n', '\n');
    const freshness = daily.split('\n  freshness:\n')[1]?.split('\n  recovery:\n')[0];
    const recovery = daily.split('\n  recovery:\n')[1];
    for (const job of [refresh, recovery]) {
      expect(job).toContain('group: charts-collect-publish');
      expect(job).toContain('cancel-in-progress: false');
      expect(job).toContain('timeout-minutes: 30');
    }
    expect(freshness).toContain('timeout-minutes: 10');
    expect(freshness).toContain(
      'recovery-needed: ${{ steps.public-check.outputs.recovery-needed }}',
    );
    expect(recovery).toContain("!cancelled() && needs.freshness.outputs.recovery-needed == 'true'");
    expect(recovery).toContain('scripts/charts-refresh.ts --recover');
    expect(workflow).not.toContain('continue-on-error');
  });
});
