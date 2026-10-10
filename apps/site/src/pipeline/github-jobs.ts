import { z } from 'zod';
import {
  dateDaysAgo,
  qualifiesRepository,
  rankGithubProjects,
  utcDate,
  type DailyGithubSnapshot,
} from '../domain/github-charts.ts';
import {
  beginChartsJob,
  chartsJobDashboard,
  collectionBatch,
  finishChartsJob,
  freezeWeeklyCharts,
  markSynced,
  promoteCandidates,
  readChartsConfig,
  recentDailySnapshots,
  requireChartsDatabase,
  saveDailyBatch,
  setRepositoryError,
  upsertDiscoveredRepositories,
  weeklyCandidates,
} from '../lib/charts-store.ts';
import { GithubClient, GithubRateLimitError } from './github-client.ts';

export const DISCOVERY_TOPICS = [
  'artificial-intelligence',
  'llm',
  'large-language-model',
  'ai-agent',
  'agents',
  'mcp',
  'model-context-protocol',
  'rag',
  'ai-coding',
  'coding-agent',
  'voice-ai',
  'text-to-image',
  'video-generation',
  'local-llm',
  'inference',
  'vector-database',
];
export interface ChartsJobSummary {
  processed: number;
  succeeded: number;
  failed: number;
  snapshotsCreated: number;
  status: string;
  details: string[];
  remaining?: number;
}
const emptySummary = (): ChartsJobSummary => ({
  processed: 0,
  succeeded: 0,
  failed: 0,
  snapshotsCreated: 0,
  status: 'success',
  details: [],
});
function pipelineReady(): void {
  requireChartsDatabase();
  if (!process.env['GITHUB_TOKEN'])
    throw new Error('GITHUB_TOKEN requis pour les jobs SANDBOX CHARTS.');
}
async function runLogged(
  kind: string,
  operation: (summary: ChartsJobSummary) => Promise<void>,
): Promise<ChartsJobSummary> {
  pipelineReady();
  const id = await beginChartsJob(kind);
  if (!id) return { ...emptySummary(), status: 'skipped', details: ['Ce job est déjà en cours.'] };
  const summary = emptySummary();
  try {
    await operation(summary);
    if (summary.failed && summary.status === 'success') summary.status = 'partial';
  } catch (error) {
    summary.status = 'failed';
    summary.failed++;
    summary.details.push(error instanceof Error ? error.message : 'Erreur du job.');
  }
  await finishChartsJob(id, summary);
  return summary;
}
export async function discoverGithub(client = new GithubClient()): Promise<ChartsJobSummary> {
  return runLogged('github_discovery', async (summary) => {
    const deadline = Date.now() + 220000;
    for (const topic of DISCOVERY_TOPICS) {
      if (Date.now() > deadline) {
        summary.status = 'partial';
        summary.details.push(
          'Budget de durée atteint, les prochains appels reprendront la découverte.',
        );
        break;
      }
      for (let page = 1; page <= 2; page++) {
        try {
          const result = await client.search(topic, page);
          summary.processed += result.repositories.length;
          await upsertDiscoveredRepositories(result.repositories);
          summary.succeeded += result.repositories.length;
          if (!result.next) break;
        } catch (error) {
          summary.failed++;
          summary.details.push(
            `${topic} : ${error instanceof Error ? error.message : 'recherche indisponible'}`,
          );
          if (error instanceof GithubRateLimitError) {
            summary.status = 'partial';
            return;
          }
          break;
        }
      }
    }
  });
}
export async function collectGithub(
  client = new GithubClient(),
  now = new Date(),
): Promise<ChartsJobSummary> {
  return runLogged('github_daily_sync', async (summary) => {
    const date = utcDate(now);
    const config = await readChartsConfig();
    const deadline = Date.now() + 220000;
    let afterId: string | undefined;
    while (Date.now() < deadline) {
      const pending = await collectionBatch(date, 100, afterId);
      if (!pending.length) break;
      afterId = pending.at(-1)?.repo.id;
      const history = await recentDailySnapshots(
        pending.map((item) => item.repo.id),
        date,
      );
      for (let at = 0; at < pending.length; at += 20) {
        if (Date.now() >= deadline) break;
        const chunk = pending.slice(at, at + 20);
        let fetched;
        try {
          fetched = await client.batch(
            chunk.map((item) => item.repo.fullName),
            `${dateDaysAgo(date, 7)}T00:00:00Z`,
          );
        } catch (error) {
          summary.failed += chunk.length;
          summary.processed += chunk.length;
          summary.details.push(error instanceof Error ? error.message : 'Collecte indisponible.');
          if (error instanceof GithubRateLimitError) {
            summary.status = 'partial';
            summary.remaining = (await collectionBatch(date, 10000)).length;
            return;
          }
          continue;
        }
        const daily: DailyGithubSnapshot[] = [];
        const qualified: string[] = [];
        const updated = [];
        for (const result of fetched) {
          const item = chunk.find((candidate) => candidate.repo.fullName === result.fullName);
          if (!item) continue;
          summary.processed++;
          const repo = result.repository;
          const previous = history.filter((snapshot) => snapshot.projectId === item.repo.id).at(-1);
          const reason =
            result.error ??
            (!repo
              ? 'Réponse GitHub absente.'
              : repo.private
                ? 'Le dépôt est devenu privé.'
                : repo.id !== item.repo.githubId
                  ? 'Identité GitHub modifiée, contrôle manuel requis.'
                  : previous &&
                      previous.stars >= 100 &&
                      repo.stargazers_count < previous.stars * 0.8
                    ? 'Chute de stars supérieure à 20 %, contrôle manuel requis.'
                    : null);
          if (reason || !repo) {
            summary.failed++;
            summary.details.push(`${item.repo.fullName} : ${reason ?? 'indisponible'}`);
            await setRepositoryError(item.repo.id, reason ?? 'indisponible');
            continue;
          }
          daily.push({
            projectId: item.repo.id,
            date,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            watchers: repo.subscribers_count ?? null,
            openIssues: repo.open_issues_count,
            contributors: null,
            commits: result.commits7d,
            releases: null,
            pushedAt: repo.pushed_at,
            collectedAt: new Date().toISOString(),
          });
          updated.push(repo);
          if (qualifiesRepository(repo, config, now)) qualified.push(item.repo.id);
          summary.succeeded++;
        }
        await upsertDiscoveredRepositories(updated);
        summary.snapshotsCreated += await saveDailyBatch(daily);
        await markSynced(
          daily.map((snapshot) => snapshot.projectId),
          new Date().toISOString(),
        );
        await promoteCandidates(qualified);
      }
    }
    summary.remaining = (await collectionBatch(date, 10000)).length;
    if (summary.remaining) {
      summary.status = 'partial';
      summary.details.push(
        `${summary.remaining.toString()} dépôts restent à collecter ou à contrôler. Relancer la collecte est idempotent.`,
      );
    }
    summary.details = summary.details.slice(0, 100);
  });
}
export async function calculateGithubWeek(
  options: {
    date?: string | undefined;
    dryRun?: boolean | undefined;
    publish?: boolean | undefined;
  } = {},
) {
  requireChartsDatabase();
  const date = z.iso.date().parse(options.date ?? utcDate());
  if (date > utcDate()) throw new Error('Une semaine future ne peut pas être calculée.');
  const week = date;
  const config = await readChartsConfig();
  const candidates = await weeklyCandidates(date, config);
  const entries = rankGithubProjects(candidates, config);
  const rising = rankGithubProjects(candidates, config, true);
  const insufficientHistory = entries.length < config.minimumCandidates;
  const result = {
    week,
    date,
    insufficientHistory,
    eligible: entries.length,
    trackedWithSnapshot: candidates.length,
    scoringVersion: config.version,
    entries,
    rising,
    written: 0,
    dryRun: options.dryRun === true,
  };
  if (options.dryRun || insufficientHistory) return result;
  result.written = await freezeWeeklyCharts(
    week,
    date,
    config,
    [
      { chart: 'github', entries },
      { chart: 'rising', entries: rising },
    ],
    options.publish ?? true,
  );
  return result;
}
export async function freezeGithubWeek(
  options: { dryRun?: boolean | undefined; publish?: boolean | undefined } = {},
): Promise<ChartsJobSummary> {
  if (options.dryRun) {
    const result = await calculateGithubWeek(options);
    return {
      ...emptySummary(),
      status: result.insufficientHistory ? 'insufficient_history' : 'success',
      details: [
        `${result.week} : ${result.entries.length.toString()} éligibles, ${result.rising.length.toString()} Rising, aucune écriture.`,
      ],
    };
  }
  return runLogged('weekly_ranking', async (summary) => {
    const sync = (await chartsJobDashboard()).jobs.find((job) => job.kind === 'github_daily_sync');
    if (
      !sync?.finishedAt ||
      utcDate(new Date(sync.finishedAt)) !== utcDate() ||
      !['success', 'partial'].includes(sync.status)
    ) {
      summary.status = 'skipped';
      summary.details.push('La collecte du jour doit se terminer avant de figer la semaine.');
      return;
    }
    const result = await calculateGithubWeek(options);
    summary.processed = result.trackedWithSnapshot;
    summary.succeeded = result.eligible;
    summary.snapshotsCreated = result.written;
    summary.status = result.insufficientHistory ? 'insufficient_history' : 'success';
    summary.details.push(
      result.insufficientHistory
        ? `Historique ou pool insuffisant : ${result.eligible.toString()}/${(await readChartsConfig()).minimumCandidates.toString()} candidats éligibles. Aucun classement publié.`
        : `${result.week} figée, ${result.written.toString()} classement(s) créé(s). Une relance conserve les éditions existantes.`,
    );
  });
}
