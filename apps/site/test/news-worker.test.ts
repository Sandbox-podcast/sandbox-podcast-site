import { describe, expect, it, vi } from 'vitest';
import { drainNewsQueue } from '../src/domain/news-worker';

describe('traitement horaire News', () => {
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
