import { z } from 'zod';
import {
  AUTOMATION_REPOSITORY,
  latestNewsRunFailed,
  type AutomationCycle,
  type AutomationWorkflowRun,
} from '../domain/automation-watchdog.ts';

const jobsSchema = z.object({
  total_count: z.number().int().min(0).max(100),
  jobs: z
    .array(
      z.object({
        name: z.string(),
        status: z.literal('completed'),
        conclusion: z.string().nullable(),
      }),
    )
    .max(100),
});

/** Un échec Charts dans le workflow commun ne relance pas la rédaction News. */
export async function latestNewsProcessingFailed(
  runs: readonly AutomationWorkflowRun[],
  cycle: AutomationCycle,
  checkedAt: string | null,
  readJobs: (url: string) => Promise<unknown>,
): Promise<boolean> {
  if (!latestNewsRunFailed(runs, cycle, checkedAt)) return false;
  const latest = runs[0];
  if (!latest) return false;
  if (latest.display_title !== 'SANDBOX quotidien News et classements') return true;
  const result = jobsSchema.parse(
    await readJobs(
      `https://api.github.com/repos/${AUTOMATION_REPOSITORY}/actions/runs/${latest.id}/jobs?per_page=100`,
    ),
  );
  if (
    result.total_count !== result.jobs.length ||
    !result.jobs.some((job) => job.name === 'collect') ||
    !result.jobs.some((job) => job.name === 'health')
  )
    throw new Error('Historique des jobs News incomplet.');
  return result.jobs.some(
    (job) =>
      !['freshness', 'recovery'].includes(job.name) &&
      ['failure', 'timed_out', 'action_required', 'startup_failure'].includes(job.conclusion ?? ''),
  );
}
