import { z } from 'zod';
import {
  dateDaysAgo,
  isUnresolvedGithubRepository,
  qualifiesRepository,
  rankGithubProjects,
  utcDate,
  type DailyGithubSnapshot,
} from '../domain/github-charts.ts';
import {
  beginChartsJob,
  hasCompletedChartsCollection,
  collectionBatch,
  finishChartsJob,
  freezeWeeklyCharts,
  markSynced,
  ignoreUnresolvedRepository,
  promoteCandidates,
  readChartsConfig,
  recentDailySnapshots,
  requireChartsDatabase,
  saveDailyBatch,
  saveScorecardBatch,
  scorecardsForProjects,
  setRepositoryError,
  upsertDiscoveredRepositories,
  weeklyCandidates,
  unobservedGithubCandidates,
} from '../lib/charts-store.ts';
import { GithubClient, GithubRateLimitError } from './github-client.ts';
import { ScorecardClient } from './scorecard-client.ts';
import { githubDiscoveryPlan } from '../domain/github-discovery.ts';
import { OBSERVED_SCORING_VERSIONS } from '../domain/chart-publication.ts';
import { githubReferenceInput, OPEN_SOURCE_LICENSE_IDS } from '../domain/reference-adapters.ts';
import { createReferenceArtifact, type ReferenceArtifact } from '../lib/reference-artifact.ts';
import { rankGithubProjects as githubBaseRanking } from '../domain/github-charts.ts';
import { refreshSlotForDate, refreshSlotId, isRefreshSlotId } from '../domain/chart-refresh.ts';
import { reviewedReferenceVersion } from '../lib/reference-publication.ts';

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
    for (const query of githubDiscoveryPlan(utcDate())) {
      if (Date.now() > deadline) {
        summary.status = 'partial';
        summary.details.push(
          'Budget de durée atteint, les prochains appels reprendront la découverte.',
        );
        break;
      }
      for (let page = 1; page <= 2; page++) {
        try {
          const result = await client.searchQuery(query, page);
          summary.processed += result.repositories.length;
          await upsertDiscoveredRepositories(result.repositories);
          summary.succeeded += result.repositories.length;
          if (result.incomplete || (page === 2 && result.next)) {
            summary.status = 'partial';
            summary.details.push(`Partition non exhaustive : ${query}`);
          }
          if (!result.next) break;
        } catch (error) {
          summary.failed++;
          summary.details.push(
            `${query} : ${error instanceof Error ? error.message : 'recherche indisponible'}`,
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
  scorecard = new ScorecardClient(),
): Promise<ChartsJobSummary> {
  return runLogged('github_daily_sync', async (summary) => {
    const date = utcDate(now);
    const slotId = refreshSlotId(now);
    const collectedAt = now.toISOString();
    const config = await readChartsConfig();
    const deadline = Date.now() + 220000;
    // Réserver du temps au second évaluateur, même avec une longue file de découverte.
    const collectionDeadline = deadline - 40000;
    let phase: 'tracked' | 'candidate' = 'tracked';
    let candidateAttempts = 0;
    let afterId: string | undefined;
    while (Date.now() < collectionDeadline) {
      if (phase === 'candidate' && candidateAttempts >= 100) break;
      const pending = await collectionBatch(slotId, 100, afterId, phase);
      if (!pending.length) {
        if (phase === 'candidate') break;
        phase = 'candidate';
        afterId = undefined;
        continue;
      }
      if (phase === 'candidate') candidateAttempts += pending.length;
      afterId = pending.at(-1)?.repo.id;
      const history = await recentDailySnapshots(
        pending.map((item) => item.repo.id),
        date,
      );
      for (let at = 0; at < pending.length; at += 20) {
        if (Date.now() >= collectionDeadline) break;
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
            summary.remaining = (await collectionBatch(slotId, 10000, undefined, 'tracked')).length;
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
            const message = reason ?? 'indisponible';
            summary.failed++;
            summary.details.push(`${item.repo.fullName} : ${message}`);
            await setRepositoryError(item.repo.id, message);
            if (isUnresolvedGithubRepository(message))
              await ignoreUnresolvedRepository(item.repo.id, message);
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
            collectedAt,
          });
          updated.push(repo);
          if (qualifiesRepository(repo, config, now)) qualified.push(item.repo.id);
          summary.succeeded++;
        }
        await upsertDiscoveredRepositories(updated);
        summary.snapshotsCreated += await saveDailyBatch(daily);
        await markSynced(
          daily.map((snapshot) => snapshot.projectId),
          collectedAt,
        );
        await promoteCandidates(qualified);
      }
    }
    if (Date.now() < deadline) {
      const candidates = await weeklyCandidates(date, slotId, config);
      if (candidates.length >= config.minimumCandidates) {
        const leading = [
          ...new Map(
            [
              ...rankGithubProjects(candidates, config, false, 80),
              ...rankGithubProjects(candidates, config, true, 80),
            ].map((item) => [item.project.entityId, item]),
          ).values(),
        ];
        const existing = await scorecardsForProjects(
          leading.map((item) => item.project),
          date,
          slotId,
        );
        const pending = leading.filter((item) => !existing.has(item.project.entityId));
        const observations: {
          entityId: string;
          fullName: string;
          score: number;
          overallScore: number;
          checksUsed: number;
          checkScores: Record<string, number>;
          assessedOn: string;
          collectedAt: string;
        }[] = [];
        for (let offset = 0; offset < pending.length && Date.now() + 9000 < deadline; offset += 8) {
          const batch = pending.slice(offset, offset + 8);
          const results = await Promise.allSettled(
            batch.map((item) => scorecard.repository(item.project.fullName)),
          );
          results.forEach((result, index) => {
            const item = batch[index];
            if (!item) return;
            if (result.status === 'rejected') {
              summary.failed++;
              summary.details.push(`${item.project.fullName} : OpenSSF indisponible.`);
            } else if (
              result.value &&
              result.value.assessedOn <= date &&
              result.value.assessedOn >= dateDaysAgo(date, 14)
            ) {
              observations.push({
                entityId: item.project.entityId,
                fullName: item.project.fullName,
                score: result.value.score,
                overallScore: result.value.overallScore,
                checksUsed: result.value.checksUsed,
                checkScores: result.value.checkScores,
                assessedOn: result.value.assessedOn,
                collectedAt: new Date().toISOString(),
              });
            }
          });
        }
        summary.snapshotsCreated += await saveScorecardBatch(observations);
        const missing = pending.length - observations.length;
        if (missing) summary.status = 'partial';
        summary.details.push(
          `OpenSSF : ${existing.size.toString()} relevés réutilisés, ${observations.length.toString()} nouveaux sur ${leading.length.toString()} dépôts prioritaires; ${missing.toString()} sans relevé admissible.`,
        );
      }
    }
    summary.remaining = (await collectionBatch(slotId, 10000, undefined, 'tracked')).length;
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
    slotId?: string | undefined;
    dryRun?: boolean | undefined;
    publish?: boolean | undefined;
  } = {},
) {
  requireChartsDatabase();
  const date = z.iso.date().parse(options.date ?? utcDate());
  if (date > utcDate()) throw new Error('Une semaine future ne peut pas être calculée.');
  const slotId =
    options.slotId ?? (options.date ? refreshSlotForDate(date) : refreshSlotId(new Date()));
  if (!isRefreshSlotId(slotId) || slotId.slice(0, 10) !== date)
    throw new Error('Le créneau doit appartenir à la date calculée.');
  const week = slotId;
  const config = await readChartsConfig();
  const candidates = await weeklyCandidates(date, slotId, config);
  const scorecards = await scorecardsForProjects(
    candidates.map(({ project }) => project),
    date,
    slotId,
  );
  const [unobserved, risingUnobserved] = await Promise.all([
    unobservedGithubCandidates(date, config),
    unobservedGithubCandidates(date, config, 14),
  ]);
  const referenceRanking = createReferenceArtifact(
    githubReferenceInput(candidates, config, scorecards, date, false, unobserved),
  );
  const risingReferenceRanking = createReferenceArtifact(
    githubReferenceInput(candidates, config, scorecards, date, true, risingUnobserved),
  );
  const present = (proof: ReferenceArtifact, isRising: boolean) => {
    const allowed = new Set(proof.input.candidates);
    const base = new Map(
      githubBaseRanking(
        candidates.filter(({ project }) => allowed.has(project.slug)),
        config,
        isRising,
        Math.max(1, candidates.length),
      ).map((row) => [row.project.slug, row]),
    );
    return proof.report.rows.map((row) => {
      const item = base.get(row.entity);
      if (!item) throw new Error('Projet classé sans données GitHub.');
      const scorecard = scorecards.get(item.project.entityId);
      return {
        ...item,
        rank: row.rank,
        score: row.score,
        sourceScores: { github: item.score, 'openssf-scorecard': (scorecard?.score ?? 0) * 10 },
        sourceWeights: {
          github: proof.input.profile.families[0]?.weight ?? 0,
          'openssf-scorecard': proof.input.profile.families[1]?.weight ?? 0,
        },
        ...(scorecard ? { scorecard } : {}),
      };
    });
  };
  const corroborated = present(referenceRanking, false);
  const corroboratedRising = present(risingReferenceRanking, true);
  const observedEdition = (risingChart: boolean) => {
    const licensed = candidates.filter(({ project }) =>
      OPEN_SOURCE_LICENSE_IDS.has(project.license ?? ''),
    );
    const ranked = rankGithubProjects(licensed, config, risingChart, Math.max(1, licensed.length));
    return ranked.length >= config.minimumCandidates ? ranked.slice(0, config.size) : [];
  };
  const publishReference = referenceRanking.report.publishable;
  const openssfCovered =
    referenceRanking.report.sourceCoverage.find((item) => item.source === 'openssf-practices')
      ?.observed ?? 0;
  const openssfCannotCorroborate = !publishReference && openssfCovered < config.minimumCandidates;
  const observedGithub = openssfCannotCorroborate ? observedEdition(false) : [];
  const observedRising = openssfCannotCorroborate ? observedEdition(true) : [];
  const entries = corroborated;
  const rising = corroboratedRising;
  const uncertainCandidates = referenceRanking.report.excluded.filter(
    (item) => item.canEnterTop,
  ).length;
  const risingUncertainCandidates = risingReferenceRanking.report.excluded.filter(
    (item) => item.canEnterTop,
  ).length;
  const insufficientHistory = !publishReference;
  const result = {
    week,
    date,
    insufficientHistory,
    observedFallback: observedGithub.length > 0 || observedRising.length > 0,
    eligible: entries.length,
    uncertainCandidates,
    risingUncertainCandidates,
    trackedWithSnapshot: candidates.length,
    scoringVersion: referenceRanking.input.profile.version,
    referenceRanking,
    risingReferenceRanking,
    entries,
    rising,
    observedPreview: observedGithub.slice(0, config.size).map((item) => ({
      fullName: item.project.fullName,
      stars7d: item.metrics.stars7d,
      score: item.score,
    })),
    observedRisingCount: observedRising.length,
    written: 0,
    dryRun: options.dryRun === true,
  };
  const githubToFreeze = publishReference ? entries : observedGithub;
  const risingToFreeze = publishReference
    ? risingReferenceRanking.report.publishable
      ? rising
      : []
    : observedRising;
  if (options.dryRun || (githubToFreeze.length === 0 && risingToFreeze.length === 0)) return result;
  result.written = await freezeWeeklyCharts(
    week,
    date,
    config,
    [
      publishReference
        ? { chart: 'github', entries: githubToFreeze, referenceRanking }
        : {
            chart: 'github',
            entries: githubToFreeze,
            scoringVersion: OBSERVED_SCORING_VERSIONS.github,
          },
      publishReference
        ? {
            chart: 'rising',
            entries: risingToFreeze,
            referenceRanking: risingReferenceRanking,
          }
        : {
            chart: 'rising',
            entries: risingToFreeze,
            scoringVersion: OBSERVED_SCORING_VERSIONS.rising,
          },
    ],
    options.publish ?? true,
  );
  return result;
}
export async function freezeGithubWeek(
  options: {
    date?: string | undefined;
    slotId?: string | undefined;
    dryRun?: boolean | undefined;
    publish?: boolean | undefined;
  } = {},
): Promise<ChartsJobSummary> {
  if (options.dryRun) {
    const result = await calculateGithubWeek(options);
    return {
      ...emptySummary(),
      status: result.insufficientHistory
        ? result.observedFallback
          ? 'partial'
          : 'insufficient_history'
        : 'success',
      details: [
        result.observedFallback
          ? `${result.week} : simulation, la progression observée serait publiée, ${result.entries.length.toString()} dépôts corroborés, ${result.uncertainCandidates.toString()} pourraient modifier un Top OpenSSF, aucune écriture.`
          : `${result.week} : ${result.entries.length.toString()} éligibles, ${result.uncertainCandidates.toString()} dépôts non corroborés pouvant modifier le Top 20, ${result.rising.length.toString()} Rising, aucune écriture.`,
      ],
    };
  }
  return runLogged('weekly_ranking', async (summary) => {
    const date = z.iso.date().parse(options.date ?? utcDate());
    const slotId =
      options.slotId ?? (options.date ? refreshSlotForDate(date) : refreshSlotId(new Date()));
    if (!(await hasCompletedChartsCollection('github_daily_sync', slotId))) {
      summary.status = 'skipped';
      summary.details.push('La collecte du créneau doit se terminer avant de figer les éditions.');
      return;
    }
    const result = await calculateGithubWeek({ ...options, date, slotId });
    summary.processed = result.trackedWithSnapshot;
    summary.succeeded = result.eligible;
    summary.snapshotsCreated = result.written;
    summary.status = result.insufficientHistory
      ? result.written
        ? 'partial'
        : 'insufficient_history'
      : (options.publish ?? true) && !reviewedReferenceVersion(result.scoringVersion)
        ? 'partial'
        : result.risingUncertainCandidates
          ? 'partial'
          : 'success';
    summary.details.push(
      result.insufficientHistory
        ? result.written
          ? `${result.week} : édition observée publiée sur la progression de sept jours. Le profil corroboré reste bloqué : ${result.eligible.toString()} dépôts complets, ${result.uncertainCandidates.toString()} pourraient modifier un Top OpenSSF.`
          : `Historique ou corroboration insuffisants : ${result.eligible.toString()}/${(await readChartsConfig()).minimumCandidates.toString()} candidats éligibles, ${result.uncertainCandidates.toString()} dépôts peuvent modifier le Top 20. Aucun classement publié.`
        : `${result.week} figée, ${result.written.toString()} classement(s) créé(s). ${result.risingUncertainCandidates.toString()} candidats Rising restent non corroborés. Une relance conserve les éditions existantes.`,
    );
    if (
      !result.insufficientHistory &&
      (options.publish ?? true) &&
      !reviewedReferenceVersion(result.scoringVersion)
    )
      summary.details.push(
        'Le profil attend sa revue : le classement reste en brouillon et ne constitue pas une publication.',
      );
  });
}
