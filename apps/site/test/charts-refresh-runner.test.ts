import { describe, expect, it, vi } from 'vitest';
import { refreshCharts, verifyPublishedEdition } from '../src/domain/charts-refresh-runner.ts';
import { chartsJobHttpStatus } from '../src/domain/charts-job-status.ts';

const now = new Date('2026-10-15T09:00:00Z');
const slot = '2026-10-15T00:00Z';
const edition = (chart: string, weekId = slot) => ({
  chart,
  weekId,
  publishedAt: '2026-10-15T03:30:00Z',
  entries: [{ rank: 1 }],
});
const summary = (status = 'success', remaining = 0) => ({
  status,
  remaining,
  processed: 20,
  succeeded: 20,
  failed: 0,
  snapshotsCreated: 20,
});

describe('chaîne de mise à jour et contrôle de publication', () => {
  it('refuse une publication future, une date impossible ou des positions incohérentes sans lever', () => {
    expect(
      verifyPublishedEdition(
        { ...edition('models'), publishedAt: '2026-10-16T03:30:00Z' },
        'models',
        now,
      ).ok,
    ).toBe(false);
    expect(verifyPublishedEdition(edition('models', '2026-02-31'), 'models', now)).toMatchObject({
      ok: false,
      reason: 'Date d’édition invalide.',
    });
    for (const entries of [[{ rank: 1 }, { rank: 1 }], [{ rank: 1 }, { rank: 3 }], [{ rank: 2 }]])
      expect(verifyPublishedEdition({ ...edition('models'), entries }, 'models', now).ok).toBe(
        false,
      );
  });
  it('refuse un classement ancien, même republié aujourd’hui, et une édition future', () => {
    expect(verifyPublishedEdition(edition('github', '2026-10-10'), 'github', now).ok).toBe(false);
    expect(verifyPublishedEdition(edition('github', '2026-10-16T00:00Z'), 'github', now).ok).toBe(
      false,
    );
    expect(verifyPublishedEdition(edition('github'), 'github', now, slot).ok).toBe(true);
    expect(verifyPublishedEdition(edition('models'), 'github', now).ok).toBe(false);
    expect(verifyPublishedEdition({ status: 'pending', entries: [] }, 'github', now).ok).toBe(
      false,
    );
  });

  it('ne confond pas succès du cron et édition effectivement publiée', async () => {
    const job = vi.fn().mockResolvedValue(summary());
    const current = vi.fn(async (chart: string) => edition(chart, '2026-10-10'));
    const result = await refreshCharts({ job, current, wait: vi.fn() }, now);
    expect(result.ok).toBe(false);
    expect(result.results.every((row) => !row.ok)).toBe(true);
    expect(job).toHaveBeenCalledWith('skills-freeze');
    expect(job).toHaveBeenCalledWith('models-freeze');
  });

  it('reprend une collecte partielle et poursuit les autres sources après une panne', async () => {
    let githubAttempts = 0;
    const job = vi.fn(async (name: string) => {
      if (name === 'github-daily' && ++githubAttempts === 1) return summary('partial', 100);
      if (name === 'models-daily') throw new Error('source indisponible');
      return summary();
    });
    const result = await refreshCharts(
      { job, current: async (chart) => edition(chart), wait: vi.fn() },
      now,
    );
    expect(githubAttempts).toBe(2);
    expect(job.mock.calls.filter(([name]) => name === 'models-daily')).toHaveLength(3);
    expect(job).toHaveBeenCalledWith('github-freeze');
    expect(job).toHaveBeenCalledWith('skills-freeze');
    expect(job).toHaveBeenCalledWith('models-freeze');
    // Une réponse perdue est sans conséquence si le résultat public existe bien.
    expect(result.ok).toBe(true);
  });

  it('borne les reprises et signale un brouillon non publié', async () => {
    const job = vi.fn(async (name: string) =>
      summary(name.endsWith('-freeze') ? 'awaiting_review' : 'partial', 1),
    );
    const result = await refreshCharts(
      { job, current: async (chart) => edition(chart, '2026-10-14T12:00Z'), wait: vi.fn() },
      now,
    );
    expect(job).toHaveBeenCalledTimes(12);
    expect(result.ok).toBe(false);
  });

  it('distingue l’attente explicite de Rising d’un échec de publication', async () => {
    const job = vi.fn().mockResolvedValue(summary());
    const result = await refreshCharts(
      {
        job,
        current: async (chart) =>
          chart === 'rising'
            ? {
                chart: 'rising',
                status: 'pending',
                entries: [],
                message: 'Rising attend au moins vingt projets éligibles.',
              }
            : edition(chart),
        wait: vi.fn(),
      },
      now,
    );
    expect(result.ok).toBe(true);
    expect(result.results.find((row) => row.chart === 'rising')).toMatchObject({
      ok: false,
      pending: true,
      edition: null,
    });
    expect(job.mock.calls.filter(([name]) => name === 'github-daily')).toHaveLength(1);
  });

  it('ne transforme pas une réponse manquante ou une erreur Rising en attente normale', () => {
    for (const value of [
      { status: 'pending', entries: [] },
      { chart: 'rising', status: 'failed', entries: [], message: 'Source indisponible' },
    ])
      expect(verifyPublishedEdition(value, 'rising', now)).not.toHaveProperty('pending');
    expect(
      verifyPublishedEdition(
        {
          chart: 'rising',
          status: 'pending',
          entries: [],
          message: 'Rising attend au moins vingt projets éligibles.',
        },
        'skills',
        now,
      ),
    ).not.toHaveProperty('pending');
  });
  it('renvoie un échec HTTP pour les collectes partielles et les gels bloqués', () => {
    for (const status of [
      'partial',
      'failed',
      'insufficient_history',
      'awaiting_review',
      'unknown',
    ])
      expect(chartsJobHttpStatus(status)).toBe(503);
    expect(chartsJobHttpStatus('success')).toBe(200);
    expect(chartsJobHttpStatus('skipped')).toBe(200);
  });
});
