import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { newsFeedSchema } from '../src/domain/news-preview.ts';
import {
  AUTOMATION_REPOSITORY,
  automationWorkflowRunsSchema,
  completedDiscovery,
  discoveryAutomationCycle,
  newsAutomationCycle,
  planNewsAutomation,
  trustedAutomationRuns,
  type AutomationWorkflowRun,
} from '../src/domain/automation-watchdog.ts';
import { latestNewsProcessingFailed } from '../src/pipeline/news-run-failure.ts';

type Environment = Readonly<Record<string, string | undefined>>;
export const WORKFLOW_PREFLIGHT_READ_TIMEOUT_MS = 30_000;
export const WORKFLOW_PREFLIGHT_HISTORY_PAGE_LIMIT = 5;

async function json(url: URL, token?: string): Promise<unknown> {
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(WORKFLOW_PREFLIGHT_READ_TIMEOUT_MS),
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        }
      : {},
  });
  if (!response.ok) throw new Error(`Lecture du contrôle impossible : HTTP ${response.status}.`);
  return response.json() as Promise<unknown>;
}

/** Relit les seuls passages terminés de ce workflow sur le dépôt et la branche autorisés. */
async function completedRuns(
  workflow: 'news-refresh.yml' | 'charts-refresh.yml',
  since: string,
  env: Environment,
  now: Date,
): Promise<AutomationWorkflowRun[]> {
  const repository = z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/u)
    .parse(env['GITHUB_REPOSITORY']);
  if (repository.toLowerCase() !== AUTOMATION_REPOSITORY.toLowerCase())
    throw new Error('Dépôt non autorisé pour ce contrôle.');
  const currentRun = z.string().regex(/^\d+$/u).parse(env['GITHUB_RUN_ID']);
  const token = z.string().min(1).parse(env['GITHUB_TOKEN']);
  const result: AutomationWorkflowRun[] = [];
  for (let page = 1; page <= WORKFLOW_PREFLIGHT_HISTORY_PAGE_LIMIT; page++) {
    const url = new URL(
      `https://api.github.com/repos/${repository}/actions/workflows/${workflow}/runs`,
    );
    url.search = new URLSearchParams({
      branch: 'main',
      status: 'completed',
      per_page: '100',
      page: String(page),
    }).toString();
    const runs = automationWorkflowRunsSchema.parse(await json(url, token)).workflow_runs;
    result.push(
      ...trustedAutomationRuns(runs, workflow, now).filter(
        (run) => String(run.id) !== currentRun && run.status === 'completed',
      ),
    );
    if (runs.length < 100 || runs.some((run) => Date.parse(run.created_at) < Date.parse(since)))
      return trustedAutomationRuns(result, workflow, now);
  }
  throw new Error('Historique du cycle incomplet après cinq pages ; aucun travail lancé.');
}

function publicOrigin(value: string | undefined): URL {
  const origin = new URL(z.url().parse(value ?? 'https://www.sandboxpodcast.fr'));
  if (
    origin.protocol !== 'https:' ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  )
    throw new Error('SANDBOX_NEWS_ORIGIN doit être une origine HTTPS sans chemin ni identifiants.');
  return origin;
}

export async function workflowPreflight(
  kind: 'news' | 'discovery',
  env: Environment = process.env,
  now = new Date(),
): Promise<{ collectNeeded: boolean; processNeeded: boolean; runNeeded: boolean; reason: string }> {
  if (kind === 'news' && (env['AUTOMATION_MODE'] ?? 'due') === 'refresh')
    return { collectNeeded: true, processNeeded: true, runNeeded: true, reason: 'manual_refresh' };
  if (kind === 'news') {
    z.literal('due').parse(env['AUTOMATION_MODE'] ?? 'due');
    const cycle = newsAutomationCycle(now);
    const [feedValue, runs] = await Promise.all([
      json(new URL('/api/news', publicOrigin(env['SANDBOX_NEWS_ORIGIN']))),
      completedRuns('news-refresh.yml', cycle.startsAt, env, now),
    ]);
    const feed = newsFeedSchema.parse(feedValue);
    const lastRunFailed = await latestNewsProcessingFailed(runs, cycle, feed.checkedAt, (url) =>
      json(new URL(url), env['GITHUB_TOKEN']),
    );
    const plan = planNewsAutomation({
      now,
      checkedAt: feed.sources.some((source) => source.ok) ? feed.checkedAt : null,
      lastRunFailed,
      respectGrace: false,
    });
    return {
      collectNeeded: plan.needed && plan.reason === 'missing_collection',
      processNeeded: plan.needed,
      runNeeded: plan.needed,
      reason: plan.reason,
    };
  }
  const cycle = discoveryAutomationCycle(now);
  const runs = await completedRuns('charts-refresh.yml', cycle.startsAt, env, now);
  const complete = completedDiscovery(runs, cycle);
  const needed = now.getTime() >= Date.parse(cycle.startsAt) && !complete;
  return {
    collectNeeded: false,
    processNeeded: false,
    runNeeded: needed,
    reason: needed ? 'missing_discovery' : complete ? 'fresh' : 'not_due',
  };
}

async function main(): Promise<void> {
  const kind = z.enum(['news', 'discovery']).parse(process.argv[2]);
  const plan = await workflowPreflight(kind);
  if (process.env['GITHUB_OUTPUT'])
    await appendFile(
      process.env['GITHUB_OUTPUT'],
      `collect-needed=${plan.collectNeeded}\nprocess-needed=${plan.processNeeded}\nrun-needed=${plan.runNeeded}\n`,
    );
  console.log(JSON.stringify(plan));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    console.error(
      'Précontrôle indisponible ou invalide : aucun travail automatique lancé. Vérifier le fil public et les accès Actions en lecture.',
    );
    process.exitCode = 1;
  });
}
