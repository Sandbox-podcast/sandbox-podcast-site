import { describe, expect, it, vi } from 'vitest';
import {
  drainNewsQueue,
  planNewsWorkers,
  NEWS_PARALLEL_PROCESSING_BUDGET_MS,
} from '../src/domain/news-worker';

describe('traitement horaire News', () => {
  it('conserve les publications partielles tout en signalant les erreurs natives', async () => {
    const batch = vi
      .fn()
      .mockResolvedValueOnce({ candidates: 5, published: 2, skipped: 2, failures: 1 })
      .mockResolvedValue({ candidates: 0, published: 0, skipped: 0 });
    expect(await drainNewsQueue(batch)).toMatchObject({
      candidates: 5,
      published: 2,
      skipped: 2,
      failures: 1,
      drained: true,
    });
  });
  it('arrête trois lots entièrement en erreur sans réserver toute la file', async () => {
    const batch = vi
      .fn()
      .mockResolvedValue({ candidates: 5, published: 0, skipped: 0, failures: 5 });
    expect(await drainNewsQueue(batch)).toMatchObject({
      batches: 3,
      candidates: 15,
      failures: 15,
      drained: false,
    });
    expect(batch).toHaveBeenCalledTimes(3);
  });
  it('utilise le temps libéré par la collecte séparée sans rogner la marge du dernier lot', async () => {
    let clock = 0;
    const batch = vi.fn(async () => {
      clock += 6 * 60_000;
      return { candidates: 5, published: 5, skipped: 0 };
    });
    const result = await drainNewsQueue(batch, {
      now: () => clock,
      budgetMs: NEWS_PARALLEL_PROCESSING_BUDGET_MS,
    });
    expect(result).toMatchObject({ batches: 4, candidates: 20, published: 20 });
    expect(clock).toBeLessThanOrEqual(NEWS_PARALLEL_PROCESSING_BUDGET_MS);
    expect(clock + 14 * 60_000).toBeGreaterThan(NEWS_PARALLEL_PROCESSING_BUDGET_MS);
  });
  it('dimensionne le parallélisme sans lancer de modèles pour les reprises différées', () => {
    expect(planNewsWorkers({ pending: 500, ready: 0 })).toEqual({
      count: 0,
      matrix: { worker: [] },
    });
    expect(planNewsWorkers({ pending: 500, ready: 21 })).toEqual({
      count: 2,
      matrix: { worker: [1, 2] },
    });
    expect(planNewsWorkers({ pending: 500, ready: 500 }).count).toBe(8);
    expect(planNewsWorkers({ pending: 1 }).count).toBe(1);
    expect(() => planNewsWorkers({ pending: -1 })).toThrow();
  });
  it('poursuit au-delà du premier lot et traverse un lot entièrement rejeté', async () => {
    const batch = vi
      .fn()
      .mockResolvedValueOnce({ candidates: 5, published: 0, skipped: 5 })
      .mockResolvedValueOnce({ candidates: 5, published: 5, skipped: 0 })
      .mockResolvedValue({ candidates: 0, published: 0, skipped: 0 });
    expect(await drainNewsQueue(batch)).toMatchObject({
      batches: 2,
      candidates: 10,
      published: 5,
      skipped: 5,
      drained: true,
    });
  });
  it('borne le traitement et conserve le signal d’échec après un crash', async () => {
    const batch = vi
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue({ candidates: 5, published: 5, skipped: 0 });
    const report = await drainNewsQueue(batch, { maxBatches: 3 });
    expect(report).toMatchObject({ batches: 3, published: 10, failures: 1, drained: false });
  });
  it('garde le temps nécessaire à un lot entier avant le timeout du job', async () => {
    let clock = 0;
    const batch = vi.fn(async () => {
      clock += 8 * 60_000;
      return { candidates: 5, published: 5, skipped: 0 };
    });
    expect(await drainNewsQueue(batch, { now: () => clock, budgetMs: 22 * 60_000 })).toMatchObject({
      batches: 2,
      published: 10,
    });
  });
});
