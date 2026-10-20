import { z } from 'zod';
import {
  detectGithubBursts,
  DEFAULT_BURST_POLICY,
  burstPolicySchema,
  type StarObservation,
  type GithubBurst,
} from '../domain/github-bursts.ts';
import { parseGithubTrending } from '../domain/github-discovery.ts';
import { OPEN_SOURCE_LICENSE_IDS } from '../domain/reference-adapters.ts';
import {
  beginChartsJob,
  finishChartsJob,
  requireChartsDatabase,
  upsertDiscoveredRepositories,
} from '../lib/charts-store.ts';
import {
  burstCollectionBatch,
  saveBurstBatch,
  saveTrendingObservation,
  starObservationHistory,
} from '../lib/github-bursts-store.ts';
import { GithubClient, GithubRateLimitError } from './github-client.ts';
import type { ChartsJobSummary } from './github-jobs.ts';

export async function collectGithubBursts(
  client = new GithubClient(),
  now = new Date(),
): Promise<ChartsJobSummary> {
  const summary: ChartsJobSummary = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    snapshotsCreated: 0,
    status: 'success',
    details: [],
  };
  if (process.env['CHARTS_BURST_COLLECTION_ENABLED'] !== 'true')
    return { ...summary, status: 'skipped', details: ['Détection intrajournalière désactivée.'] };
  requireChartsDatabase();
  if (!process.env['GITHUB_TOKEN'])
    throw new Error('GITHUB_TOKEN requis pour les poussées GitHub.');
  const id = await beginChartsJob('github_bursts');
  if (!id)
    return { ...summary, status: 'skipped', details: ['Collecte intrajournalière déjà en cours.'] };
  try {
    const maximum = z.coerce
      .number()
      .int()
      .min(20)
      .max(1000)
      .parse(process.env['GITHUB_BURST_POOL_SIZE'] ?? 200);
    const policy = process.env['GITHUB_BURST_POLICY_JSON']
      ? burstPolicySchema.parse(JSON.parse(process.env['GITHUB_BURST_POLICY_JSON']) as unknown)
      : DEFAULT_BURST_POLICY;
    const observedAt = now.toISOString();
    const deadline = Date.now() + 220000;
    const pending = await burstCollectionBatch(maximum, observedAt);
    const history = await starObservationHistory(
      pending.map(({ repo }) => repo.id),
      observedAt,
    );
    const byProject = new Map<string, StarObservation[]>();
    for (const row of history) {
      const items = byProject.get(row.projectId) ?? [];
      items.push(row);
      byProject.set(row.projectId, items);
    }
    for (let start = 0; start < pending.length; start += 20) {
      if (Date.now() > deadline) {
        summary.status = 'partial';
        summary.remaining = pending.length - start;
        break;
      }
      const batch = pending.slice(start, start + 20);
      const fetched = await client.batch(
        batch.map(({ repo }) => repo.fullName),
        new Date(now.getTime() - 86400000).toISOString(),
      );
      const observations: StarObservation[] = [];
      const events: GithubBurst[] = [];
      const repositories = [];
      for (const result of fetched) {
        summary.processed++;
        const project = batch.find(
          ({ repo }) => repo.fullName.toLowerCase() === result.fullName.toLowerCase(),
        );
        const repo = result.repository;
        if (
          !repo ||
          repo.id !== project?.repo.githubId ||
          repo.private ||
          repo.archived ||
          repo.fork ||
          repo.disabled ||
          !OPEN_SOURCE_LICENSE_IDS.has(repo.license?.spdx_id ?? '')
        ) {
          summary.failed++;
          continue;
        }
        repositories.push(repo);
        const sample = { projectId: project.repo.id, stars: repo.stargazers_count, observedAt };
        const prior = byProject.get(project.repo.id) ?? [];
        const last = prior.at(-1);
        if (last && last.stars >= 100 && sample.stars < last.stars * 0.8) {
          summary.failed++;
          summary.details.push(`${repo.full_name} : chute de compteur à vérifier.`);
          continue;
        }
        observations.push(sample);
        events.push(...detectGithubBursts(sample, prior, policy));
        summary.succeeded++;
      }
      await upsertDiscoveredRepositories(repositories);
      const saved = await saveBurstBatch(observations, events);
      summary.snapshotsCreated += saved.observations;
      summary.details.push(
        `${saved.events.toString()} poussées mesurées sur ${saved.observations.toString()} nouveaux relevés.`,
      );
    }
    if (summary.failed && summary.status === 'success') summary.status = 'partial';
  } catch (error) {
    summary.status =
      error instanceof GithubRateLimitError && summary.succeeded ? 'partial' : 'failed';
    summary.failed++;
    summary.details.push(
      error instanceof Error ? error.message : 'Collecte intrajournalière indisponible.',
    );
  }
  await finishChartsJob(id, summary);
  return summary;
}

export async function discoverGithubTrending(
  client = new GithubClient(),
  fetcher = fetch,
  now = new Date(),
): Promise<ChartsJobSummary> {
  const summary: ChartsJobSummary = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    snapshotsCreated: 0,
    status: 'success',
    details: [],
  };
  if (process.env['GITHUB_TRENDING_DISCOVERY_ENABLED'] !== 'true')
    return {
      ...summary,
      status: 'skipped',
      skipReason: 'disabled',
      details: ['Découverte GitHub Trending désactivée.'],
    };
  requireChartsDatabase();
  const id = await beginChartsJob('github_trending_discovery');
  if (!id)
    return { ...summary, status: 'skipped', details: ['Découverte Trending déjà en cours.'] };
  try {
    const response = await fetcher('https://github.com/trending?since=daily', {
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
      headers: { Accept: 'text/html' },
    });
    if (
      !response.ok ||
      !response.headers.get('content-type')?.includes('text/html') ||
      Number(response.headers.get('content-length') ?? 0) > 2000000
    )
      throw new Error('Réponse GitHub Trending invalide.');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Page GitHub Trending vide.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      let chunk = await reader.read();
      while (!chunk.done) {
        size += chunk.value.length;
        if (size > 2000000) throw new Error('Page GitHub Trending trop volumineuse.');
        chunks.push(chunk.value);
        chunk = await reader.read();
      }
    } finally {
      await reader.cancel();
    }
    const names = parseGithubTrending(Buffer.concat(chunks).toString('utf8'));
    summary.snapshotsCreated = await saveTrendingObservation(names, now.toISOString());
    for (let start = 0; start < names.length; start += 20) {
      const fetched = await client.batch(
        names.slice(start, start + 20),
        new Date(now.getTime() - 86400000).toISOString(),
      );
      const valid = [];
      for (const item of fetched) {
        summary.processed++;
        const repository = item.repository;
        if (item.error || !repository) {
          summary.failed++;
          summary.details.push(`${item.fullName} : métadonnées GitHub indisponibles.`);
        } else if (
          repository.private ||
          repository.archived ||
          repository.fork ||
          repository.disabled ||
          !OPEN_SOURCE_LICENSE_IDS.has(repository.license?.spdx_id ?? '')
        ) {
          summary.filtered = (summary.filtered ?? 0) + 1;
        } else {
          valid.push(repository);
          summary.succeeded++;
        }
      }
      await upsertDiscoveredRepositories(valid);
    }
    summary.details.push(
      'Trending alimente la découverte. Sa position ne reçoit aucun poids supplémentaire dans le score GitHub.',
    );
    if (summary.failed) summary.status = 'partial';
  } catch (error) {
    summary.status = 'failed';
    summary.failed++;
    summary.details.push(error instanceof Error ? error.message : 'Trending indisponible.');
  }
  await finishChartsJob(id, summary);
  return summary;
}
