import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assignClosedRisingStars } from '../src/lib/badges-store.ts';
import { assignClosedAwards } from '../src/lib/awards-store.ts';
import { beginChartsJob, finishChartsJob } from '../src/lib/charts-store.ts';
import { runAllBadgeAwards } from '../src/pipeline/badges-jobs.ts';

vi.mock('../src/lib/badges-store.ts', () => ({ assignClosedRisingStars: vi.fn() }));
vi.mock('../src/lib/awards-store.ts', () => ({ assignClosedAwards: vi.fn() }));
vi.mock('../src/lib/charts-store.ts', () => ({
  beginChartsJob: vi.fn(),
  finishChartsJob: vi.fn(),
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(beginChartsJob).mockResolvedValue('job-fixture');
  vi.mocked(finishChartsJob).mockResolvedValue(undefined);
  vi.mocked(assignClosedRisingStars).mockResolvedValue({
    considered: 1,
    eligible: 1,
    created: 1,
    existing: 0,
    weeks: ['2026-W41'],
    dryRun: false,
  });
  vi.mocked(assignClosedAwards).mockResolvedValue({
    considered: 6,
    eligible: 2,
    created: 2,
    existing: 0,
    failed: 0,
    dryRun: false,
    candidates: [],
    errors: [],
  });
});
describe('job commun des sept Awards', () => {
  it('journalise les deux chemins après le gel sous un seul bail', async () => {
    const result = await runAllBadgeAwards();
    expect(beginChartsJob).toHaveBeenCalledWith('badge_awards');
    expect(result).toMatchObject({
      processed: 7,
      succeeded: 3,
      failed: 0,
      snapshotsCreated: 3,
      status: 'success',
    });
    expect(finishChartsJob).toHaveBeenCalledWith('job-fixture', result);
  });
  it('ne lance aucune attribution lorsque le bail est déjà pris', async () => {
    vi.mocked(beginChartsJob).mockResolvedValue(null);
    expect((await runAllBadgeAwards()).status).toBe('skipped');
    expect(assignClosedAwards).not.toHaveBeenCalled();
    expect(assignClosedRisingStars).not.toHaveBeenCalled();
    expect(finishChartsJob).not.toHaveBeenCalled();
  });
  it('termine les autres distinctions après une panne et masque le message de connexion', async () => {
    vi.mocked(assignClosedRisingStars).mockRejectedValue(
      new Error('connexion-fixture-ne-pas-journaliser'),
    );
    const result = await runAllBadgeAwards();
    expect(assignClosedAwards).toHaveBeenCalled();
    expect(result).toMatchObject({ succeeded: 2, failed: 1, status: 'failed' });
    expect(result.details.join(' ')).not.toContain('connexion-fixture-ne-pas-journaliser');
    expect(finishChartsJob).toHaveBeenCalledWith('job-fixture', result);
  });
  it('borne une reprise explicite à son type, sa période et sa catégorie', async () => {
    const options = { type: 'annual' as const, period: '2025', scope: 'models' };
    await runAllBadgeAwards(options);
    expect(assignClosedRisingStars).not.toHaveBeenCalled();
    expect(assignClosedAwards).toHaveBeenCalledWith(options);
  });
});
