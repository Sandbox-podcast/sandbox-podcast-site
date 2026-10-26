import {
  AUTOMATION_BRANCH,
  AUTOMATION_REPOSITORY,
  AUTOMATION_SITE_ORIGIN,
  automationChartEditionSchema,
  automationNewsFeedSchema,
  automationWatchdogStateSchema,
  automationWorkflowRunsSchema,
  completedDiscovery,
  discoveryAutomationCycle,
  newsAutomationCycle,
  planChartsAutomation,
  planNewsAutomation,
  trustedAutomationRuns,
  type AutomationCycle,
  type AutomationTarget,
  type AutomationWatchdogState,
} from '../domain/automation-watchdog.ts';
export { configureAutomationWatchdogRuntime } from '../domain/automation-watchdog.ts';
import { latestNewsProcessingFailed } from './news-run-failure.ts';

export interface AutomationWatchdogStateStore {
  get(key: AutomationTarget): Promise<unknown>;
  put(key: AutomationTarget, value: AutomationWatchdogState): Promise<void>;
}
export interface AutomationWatchdogResult {
  target: AutomationTarget;
  status:
    | 'disabled'
    | 'not_due'
    | 'fresh'
    | 'active'
    | 'cooldown'
    | 'exhausted'
    | 'dispatched'
    | 'due'
    | 'error';
  dueKey?: string;
  attempts?: number;
  reason?: string;
}

export async function runAutomationWatchdog({
  token,
  enabled,
  dryRun = false,
  now = () => new Date(),
  fetch: transport,
  state,
  onResult,
}: {
  token?: string | undefined;
  enabled: boolean;
  dryRun?: boolean;
  now?: () => Date;
  fetch: typeof fetch;
  state: AutomationWatchdogStateStore;
  onResult?: (result: AutomationWatchdogResult) => void;
}) {
  const instant = now();
  const checkedAt = instant.toISOString();
  const results: AutomationWatchdogResult[] = [];
  const add = (result: AutomationWatchdogResult) => {
    results.push(result);
    onResult?.(result);
  };
  if (!enabled || !token?.trim()) {
    for (const target of ['news', 'charts', 'discovery'] as const)
      add({ target, status: enabled ? 'error' : 'disabled', reason: 'configuration' });
    return { ok: !enabled, checkedAt, enabled, results };
  }
  const apiRoot = `https://api.github.com/repos/${AUTOMATION_REPOSITORY}/actions/workflows/`;
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2026-03-10',
    'User-Agent': 'Sandbox-Automation-Watchdog',
  };
  async function json(url: string, github = false, allowMissing = false): Promise<unknown> {
    const response = await transport(url, {
      ...(github ? { headers } : {}),
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (allowMissing && response.status === 202) return null;
    if (response.status !== 200) throw new Error('upstream_unavailable');
    return response.json() as Promise<unknown>;
  }
  async function previous(target: AutomationTarget) {
    const value = await state.get(target);
    return value === null || value === undefined
      ? null
      : automationWatchdogStateSchema.parse(value);
  }
  async function dispatch(target: AutomationTarget, cycle: AutomationCycle) {
    if (dryRun) {
      add({ target, status: 'due', dueKey: cycle.key, reason: 'dry_run' });
      return;
    }
    const current = await previous(target);
    const sameCycle = current?.dueKey === cycle.key;
    if (current && Date.parse(current.cooldownUntil) > instant.getTime()) {
      add({
        target,
        status: 'cooldown',
        dueKey: cycle.key,
        attempts: current.attempts,
        ...(current.status !== 'accepted'
          ? { reason: current.errorCode ?? 'dispatch_unconfirmed' }
          : {}),
      });
      return;
    }
    if (sameCycle && current.attempts >= 3) {
      add({ target, status: 'exhausted', dueKey: cycle.key, attempts: current.attempts });
      return;
    }
    const reserved: AutomationWatchdogState = {
      dueKey: cycle.key,
      attempts: sameCycle ? current.attempts + 1 : 1,
      lastAttemptAt: checkedAt,
      cooldownUntil: new Date(
        instant.getTime() + (target === 'news' ? 15 : 30) * 60_000,
      ).toISOString(),
      status: 'reserved',
    };
    // Le DO sérialise les cycles. La réservation survit même à un POST sans accusé.
    await state.put(target, reserved);
    const workflow = target === 'news' ? 'news-refresh.yml' : 'charts-refresh.yml';
    let outcome: AutomationWatchdogState;
    try {
      const response = await transport(`${apiRoot}${workflow}/dispatches`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: AUTOMATION_BRANCH,
          inputs: {
            mode: target === 'news' ? 'due' : target === 'charts' ? 'recover' : 'discovery',
          },
        }),
        redirect: 'manual',
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      outcome = response.ok
        ? { ...reserved, status: 'accepted' }
        : { ...reserved, status: 'failed', errorCode: 'http_rejected' };
      await response.body?.cancel();
    } catch {
      outcome = { ...reserved, status: 'uncertain', errorCode: 'dispatch_uncertain' };
    }
    await state.put(target, outcome);
    add({
      target,
      status: outcome.status === 'accepted' ? 'dispatched' : 'error',
      dueKey: cycle.key,
      attempts: outcome.attempts,
      ...(outcome.errorCode ? { reason: outcome.errorCode } : {}),
    });
  }
  async function inspectNews() {
    const [feedValue, runsValue] = await Promise.all([
      json(`${AUTOMATION_SITE_ORIGIN}/api/news`),
      json(`${apiRoot}news-refresh.yml/runs?branch=main&per_page=100`, true),
    ]);
    const feed = automationNewsFeedSchema.parse(feedValue);
    if (feed.checkedAt && Date.parse(feed.checkedAt) > instant.getTime() + 5 * 60_000)
      throw new Error('invalid_collection_time');
    const runs = trustedAutomationRuns(
      automationWorkflowRunsSchema.parse(runsValue).workflow_runs,
      'news-refresh.yml',
      instant,
    );
    const active = runs.filter((run) => run.status !== 'completed');
    if (active.length) {
      const stalled = active.some(
        (run) => instant.getTime() - Date.parse(run.created_at) > 60 * 60_000,
      );
      add({
        target: 'news',
        status: stalled ? 'error' : 'active',
        ...(stalled ? { reason: 'active_run_stalled' } : {}),
      });
      return;
    }
    const checked = feed.sources.some((source) => source.ok) ? feed.checkedAt : null;
    const plan = planNewsAutomation({
      now: instant,
      checkedAt: checked,
      lastRunFailed: await latestNewsProcessingFailed(
        runs,
        newsAutomationCycle(instant),
        checked,
        (url) => json(url, true),
      ),
    });
    if (!plan.needed)
      add({
        target: 'news',
        status: plan.reason === 'not_due' ? 'not_due' : 'fresh',
        dueKey: plan.cycle.key,
      });
    else await dispatch('news', plan.cycle);
  }
  async function inspectCharts() {
    const [runsValue, ...values] = await Promise.all([
      json(`${apiRoot}charts-refresh.yml/runs?branch=main&per_page=100`, true),
      ...['github', 'skills', 'models'].map((chart) =>
        json(`${AUTOMATION_SITE_ORIGIN}/api/charts/${chart}/current`, false, true),
      ),
    ]);
    const runs = trustedAutomationRuns(
      automationWorkflowRunsSchema.parse(runsValue).workflow_runs,
      'charts-refresh.yml',
      instant,
    );
    const active = runs.filter((run) => run.status !== 'completed');
    if (active.length) {
      const stalled = active.some(
        (run) => instant.getTime() - Date.parse(run.created_at) > 45 * 60_000,
      );
      for (const target of ['charts', 'discovery'] as const)
        add({
          target,
          status: stalled ? 'error' : 'active',
          ...(stalled ? { reason: 'active_run_stalled' } : {}),
        });
      return;
    }
    const plan = planChartsAutomation(
      ['github', 'skills', 'models'].map((chart, index) => ({
        chart,
        value: values[index] === null ? null : automationChartEditionSchema.parse(values[index]),
      })),
      instant,
    );
    if (!plan.needed)
      add({
        target: 'charts',
        status: plan.reason === 'not_due' ? 'not_due' : 'fresh',
        dueKey: plan.cycle.key,
      });
    else await dispatch('charts', plan.cycle);
    const cycle = discoveryAutomationCycle(instant);
    const saved = await previous('discovery');
    if (instant.getTime() < Date.parse(cycle.dueAt))
      add({ target: 'discovery', status: 'not_due', dueKey: cycle.key });
    else if ((saved?.dueKey === cycle.key && saved.satisfied) || completedDiscovery(runs, cycle)) {
      if (!saved?.satisfied || saved.dueKey !== cycle.key)
        await state.put('discovery', {
          dueKey: cycle.key,
          attempts: saved?.dueKey === cycle.key ? saved.attempts : 0,
          lastAttemptAt: checkedAt,
          cooldownUntil: checkedAt,
          status: 'accepted',
          satisfied: true,
        });
      add({ target: 'discovery', status: 'fresh', dueKey: cycle.key });
    } else await dispatch('discovery', cycle);
  }
  await Promise.all([
    inspectNews().catch(() => {
      add({ target: 'news', status: 'error', reason: 'inspection_failed' });
    }),
    inspectCharts().catch(() => {
      for (const target of ['charts', 'discovery'] as const)
        if (!results.some((result) => result.target === target))
          add({ target, status: 'error', reason: 'inspection_failed' });
    }),
  ]);
  results.sort(
    (left, right) =>
      ['news', 'charts', 'discovery'].indexOf(left.target) -
      ['news', 'charts', 'discovery'].indexOf(right.target),
  );
  return {
    ok: results.every(
      (result) =>
        !['error', 'exhausted'].includes(result.status) &&
        !(result.status === 'cooldown' && result.reason),
    ),
    checkedAt,
    enabled,
    results,
  };
}
