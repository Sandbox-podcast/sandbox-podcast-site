import { z } from 'zod';
import { planChartsRecovery } from './charts-refresh-runner.ts';

/** À appeler uniquement au démarrage du Worker Cloudflare, qui interdit eval. */
export function configureAutomationWatchdogRuntime() {
  z.config({ jitless: true });
}

export const AUTOMATION_SITE_ORIGIN = 'https://www.sandboxpodcast.fr';
export const AUTOMATION_REPOSITORY = 'Sandbox-podcast/sandbox-podcast-site';
export const AUTOMATION_BRANCH = 'main';
export const AUTOMATION_TARGETS = ['news', 'charts', 'discovery'] as const;
export type AutomationTarget = (typeof AUTOMATION_TARGETS)[number];

export const automationWatchdogStateSchema = z.object({
  dueKey: z.string().min(1).max(100),
  attempts: z.number().int().min(0).max(3),
  lastAttemptAt: z.iso.datetime(),
  cooldownUntil: z.iso.datetime(),
  status: z.enum(['reserved', 'accepted', 'failed', 'uncertain']),
  satisfied: z.boolean().optional(),
  errorCode: z.enum(['http_rejected', 'dispatch_uncertain']).optional(),
});
export type AutomationWatchdogState = z.infer<typeof automationWatchdogStateSchema>;

const workflowRunSchema = z.object({
  id: z.number().int().positive(),
  head_branch: z.string().nullable(),
  repository: z.object({ full_name: z.string() }),
  head_repository: z.object({ full_name: z.string() }).nullable().optional(),
  path: z.string(),
  display_title: z.string(),
  event: z.string(),
  status: z.enum(['queued', 'in_progress', 'waiting', 'requested', 'pending', 'completed']),
  conclusion: z.string().nullable(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});
export const automationWorkflowRunsSchema = z.object({
  workflow_runs: z.array(workflowRunSchema).max(100),
});
export type AutomationWorkflowRun = z.infer<typeof workflowRunSchema>;

export const automationNewsFeedSchema = z.object({
  checkedAt: z.iso.datetime().nullable(),
  sources: z.array(z.object({ ok: z.boolean() })),
  items: z.array(z.object({ id: z.string(), publishedAt: z.string() })),
});

export const automationChartEditionSchema = z.object({
  chart: z.enum(['github', 'skills', 'models']),
  weekId: z.string().min(1),
  publishedAt: z
    .string()
    .min(1)
    .max(100)
    .refine((value) => Number.isFinite(Date.parse(value))),
  entries: z.array(z.object({ rank: z.number().int().positive() })).min(1),
});

export interface AutomationCycle {
  key: string;
  startsAt: string;
  dueAt: string;
}

export function newsAutomationCycle(now: Date): AutomationCycle {
  const start = new Date(now);
  start.setUTCMinutes(37, 0, 0);
  if (start.getTime() > now.getTime()) start.setUTCHours(start.getUTCHours() - 1);
  return {
    key: start.toISOString(),
    startsAt: start.toISOString(),
    dueAt: new Date(start.getTime() + 5 * 60_000).toISOString(),
  };
}

export function discoveryAutomationCycle(now: Date): AutomationCycle {
  const start = new Date(now);
  start.setUTCHours(1, 17, 0, 0);
  return {
    key: start.toISOString().slice(0, 10),
    startsAt: start.toISOString(),
    dueAt: new Date(start.getTime() + 10 * 60_000).toISOString(),
  };
}

export function planNewsAutomation({
  now,
  checkedAt,
  lastRunFailed,
  respectGrace = true,
}: {
  now: Date;
  checkedAt: string | null;
  lastRunFailed: boolean;
  respectGrace?: boolean;
}) {
  const cycle = newsAutomationCycle(now);
  if (now.getTime() < Date.parse(respectGrace ? cycle.dueAt : cycle.startsAt))
    return { needed: false, reason: 'not_due' as const, cycle };
  const collectedAt = checkedAt ? Date.parse(checkedAt) : NaN;
  if (
    !Number.isFinite(collectedAt) ||
    collectedAt < Date.parse(cycle.startsAt) ||
    collectedAt > now.getTime() + 5 * 60_000
  )
    return { needed: true, reason: 'missing_collection' as const, cycle };
  return lastRunFailed
    ? { needed: true, reason: 'failed_processing' as const, cycle }
    : { needed: false, reason: 'fresh' as const, cycle };
}

export function planChartsAutomation(
  editions: readonly { chart: string; value: unknown }[],
  now: Date,
) {
  const recovery = planChartsRecovery(editions, now);
  const start = new Date(recovery.slot);
  const dueAt = new Date(start.getTime() + (3 * 60 + 17 + 12) * 60_000).toISOString();
  return {
    needed: now.getTime() >= Date.parse(dueAt) && recovery.needed,
    reason:
      now.getTime() < Date.parse(dueAt)
        ? ('not_due' as const)
        : recovery.needed
          ? ('missing_editions' as const)
          : ('fresh' as const),
    cycle: { key: recovery.slot, startsAt: recovery.slot, dueAt },
  };
}

/** Un run de PR ou de fork n'autorise ni ne bloque une publication sur main. */
export function trustedAutomationRuns(
  runs: readonly AutomationWorkflowRun[],
  workflow: 'news-refresh.yml' | 'charts-refresh.yml',
  now: Date,
) {
  return runs
    .filter(
      (run) =>
        run.head_branch === AUTOMATION_BRANCH &&
        run.repository.full_name.toLowerCase() === AUTOMATION_REPOSITORY.toLowerCase() &&
        (!run.head_repository ||
          run.head_repository.full_name.toLowerCase() === AUTOMATION_REPOSITORY.toLowerCase()) &&
        run.path === `.github/workflows/${workflow}` &&
        ['schedule', 'workflow_dispatch'].includes(run.event) &&
        Date.parse(run.created_at) <= now.getTime() + 30_000 &&
        Date.parse(run.updated_at) <= now.getTime() + 30_000 &&
        Date.parse(run.updated_at) >= Date.parse(run.created_at),
    )
    .toSorted((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
}

export function latestNewsRunFailed(
  runs: readonly AutomationWorkflowRun[],
  cycle: AutomationCycle,
  checkedAt: string | null,
) {
  const latest = runs[0];
  return (
    latest?.status === 'completed' &&
    ['failure', 'timed_out', 'action_required', 'startup_failure'].includes(
      latest.conclusion ?? '',
    ) &&
    Date.parse(latest.created_at) >= Date.parse(cycle.startsAt) &&
    (!checkedAt || Date.parse(latest.updated_at) >= Date.parse(checkedAt))
  );
}

export function completedDiscovery(runs: readonly AutomationWorkflowRun[], cycle: AutomationCycle) {
  return runs.some(
    (run) =>
      ['SANDBOX CHARTS discovery', 'SANDBOX CHARTS 17 1 * * *'].includes(run.display_title) &&
      run.status === 'completed' &&
      run.conclusion === 'success' &&
      Date.parse(run.created_at) >= Date.parse(cycle.startsAt),
  );
}
