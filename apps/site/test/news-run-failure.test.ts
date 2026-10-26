import { describe, expect, it, vi } from 'vitest';
import { latestNewsProcessingFailed } from '../src/pipeline/news-run-failure';
import {
  AUTOMATION_REPOSITORY,
  newsAutomationCycle,
  type AutomationWorkflowRun,
} from '../src/domain/automation-watchdog';

const cycle = newsAutomationCycle(new Date('2026-10-26T05:37:00Z'));
const run: AutomationWorkflowRun = {
  id: 123,
  repository: { full_name: AUTOMATION_REPOSITORY },
  head_branch: 'main',
  path: '.github/workflows/news-refresh.yml',
  display_title: 'SANDBOX quotidien News et classements',
  event: 'schedule',
  status: 'completed',
  conclusion: 'failure',
  created_at: '2026-10-26T03:37:00Z',
  updated_at: '2026-10-26T04:15:00Z',
};
const jobs = (failed: string) => ({
  total_count: 5,
  jobs: ['collect', 'Rédaction News 1', 'health', 'freshness', 'recovery'].map((name) => ({
    name,
    status: 'completed',
    conclusion: name === failed ? 'failure' : 'success',
  })),
});

describe('résultats News dans le workflow quotidien commun', () => {
  it.each(['freshness', 'recovery'])('ne relance pas News après un échec de %s', async (failed) => {
    const read = vi.fn().mockResolvedValue(jobs(failed));
    expect(await latestNewsProcessingFailed([run], cycle, '2026-10-26T03:40:00Z', read)).toBe(
      false,
    );
    expect(read).toHaveBeenCalledWith(
      `https://api.github.com/repos/${AUTOMATION_REPOSITORY}/actions/runs/123/jobs?per_page=100`,
    );
  });
  it.each(['collect', 'Rédaction News 1', 'health'])(
    'reprend un échec News de %s',
    async (failed) => {
      expect(await latestNewsProcessingFailed([run], cycle, null, async () => jobs(failed))).toBe(
        true,
      );
    },
  );
  it('conserve les anciens runs et relances manuelles sans lecture des jobs', async () => {
    const read = vi.fn();
    expect(
      await latestNewsProcessingFailed(
        [{ ...run, display_title: 'SANDBOX News due' }],
        cycle,
        null,
        read,
      ),
    ).toBe(true);
    expect(
      await latestNewsProcessingFailed([{ ...run, conclusion: 'success' }], cycle, null, read),
    ).toBe(false);
    expect(await latestNewsProcessingFailed([run], cycle, '2026-10-26T05:00:00Z', read)).toBe(
      false,
    );
    expect(read).not.toHaveBeenCalled();
  });
  it.each([
    { total_count: 5, jobs: [] },
    { total_count: 0, jobs: [] },
    { ...jobs('health'), total_count: 101 },
    { total_count: 1, jobs: [{ name: 'health', status: 'in_progress', conclusion: null }] },
  ])('refuse un historique incomplet ou invalide', async (value) => {
    await expect(
      latestNewsProcessingFailed([run], cycle, null, async () => value),
    ).rejects.toThrow();
  });
});
