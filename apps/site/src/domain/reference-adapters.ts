import {
  scoreModels,
  scoreSkills,
  type ModelScoreInput,
  type SkillScoreInput,
  type ScoredExternalEntity,
} from './external-charts.ts';
import {
  rankGithubProjects,
  eligibleProject,
  dateDaysAgo,
  type GithubChartConfig,
  type GithubChartProject,
  type GithubComputedMetrics,
  type ScorecardEvidence,
} from './github-charts.ts';
import { REFERENCE_PROFILES } from './reference-profiles.ts';
import {
  referencePercentiles,
  type ReferenceInput,
  type ReferenceObservation,
  type ReferenceProfile,
} from './reference-ranking.ts';

// Liste conservatrice. Une licence inconnue reste à qualifier, sans assimiler public et open source.
export const OPEN_SOURCE_LICENSE_IDS = new Set([
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'MPL-2.0',
  'GPL-2.0',
  'GPL-3.0',
  'LGPL-2.1',
  'LGPL-3.0',
  'AGPL-3.0',
  'Unlicense',
  '0BSD',
  'BSL-1.0',
  'Zlib',
  'EPL-2.0',
]);
export interface SourceEvidence {
  observedOn: string;
  evidenceUrl: string;
  sampleSize?: number;
}

/** Un identifiant d'évaluateur actif ne peut pas désigner deux modèles classants. */
export function conflictingModelIdentities(
  candidates: readonly {
    entity: { slug: string };
    sources: readonly { ref: { provider: string; externalId: string } }[];
  }[],
): Set<string> {
  const identities = new Map<string, Set<string>>();
  for (const candidate of candidates)
    for (const { ref } of candidate.sources) {
      if (ref.provider !== 'arena' && ref.provider !== 'artificial-analysis') continue;
      const key = JSON.stringify([ref.provider, ref.externalId]);
      const entities = identities.get(key) ?? new Set<string>();
      entities.add(candidate.entity.slug);
      identities.set(key, entities);
    }
  return new Set(
    [...identities.values()]
      .filter((entities) => entities.size > 1)
      .flatMap((entities) => [...entities]),
  );
}

function observed(
  entity: string,
  source: string,
  score: number | undefined,
  evidence: SourceEvidence | undefined,
  rawValue?: number | null,
): ReferenceObservation[] {
  if (score === undefined || !evidence) return [];
  return [
    {
      entity,
      source,
      score,
      ...evidence,
      ...(rawValue !== undefined && rawValue !== null ? { rawValue } : {}),
    },
  ];
}
/** Retire une évaluation trop ancienne, trop peu votée ou sans date de preuve. */
export function withAdmissibleModelEvaluations(
  item: ModelScoreInput,
  date: string,
): ModelScoreInput {
  const profile = REFERENCE_PROFILES.models;
  const arena = admissibleEvidence(item, 'arena-text', profile, date)
    ? item.metrics.arenaQuality
    : null;
  const analysis = admissibleEvidence(item, 'artificial-analysis', profile, date)
    ? item.metrics.artificialAnalysisIntelligence
    : null;
  if (
    arena === item.metrics.arenaQuality &&
    analysis === item.metrics.artificialAnalysisIntelligence
  )
    return item;
  return {
    ...item,
    metrics: { ...item.metrics, arenaQuality: arena, artificialAnalysisIntelligence: analysis },
  };
}

function admissibleEvidence(
  item: { referenceEvidence?: Record<string, SourceEvidence> },
  source: string,
  profile: ReferenceProfile,
  date: string,
): boolean {
  const evidence = item.referenceEvidence?.[source];
  const definition = profile.sources.find((entry) => entry.id === source);
  if (!evidence || !definition) return false;
  const age = (Date.parse(date) - Date.parse(evidence.observedOn)) / 86400000;
  return (
    Number.isFinite(age) &&
    age >= 0 &&
    age <= definition.maximumAgeDays &&
    (evidence.sampleSize ?? 0) >= definition.minimumSampleSize
  );
}
function normalized<T extends { entity: { slug: string } }>(
  candidates: readonly T[],
  value: (item: T) => number | null,
): Map<string, number> {
  return referencePercentiles(
    new Map(
      candidates.flatMap((item) => {
        const number = value(item);
        return number !== null && Number.isFinite(number)
          ? [[item.entity.slug, number] as const]
          : [];
      }),
    ),
  );
}

export function githubReferenceInput(
  input: readonly { project: GithubChartProject; metrics: GithubComputedMetrics }[],
  config: GithubChartConfig,
  scorecards: ReadonlyMap<string, ScorecardEvidence>,
  date: string,
  rising = false,
  unobserved: readonly string[] = [],
): ReferenceInput {
  const base = REFERENCE_PROFILES[rising ? 'rising' : 'github'];
  const profile: ReferenceProfile = {
    ...base,
    size: config.size,
    minimumCandidates: config.minimumCandidates,
  };
  const licensed = input.filter(
    ({ project, metrics }) =>
      OPEN_SOURCE_LICENSE_IDS.has(project.license ?? '') &&
      (!(metrics.insufficientHistory || (rising && metrics.acceleration === null)) ||
        !project.discoveredAt ||
        project.discoveredAt.slice(0, 10) <= dateDaysAgo(date, rising ? 14 : 7)),
  );
  const ranked = rankGithubProjects(licensed, config, rising, Math.max(1, licensed.length));
  // L'historique incomplet ne retire pas silencieusement un dépôt suivi du pool.
  const unknown = licensed.filter(
    ({ project, metrics }) =>
      (metrics.insufficientHistory || (rising && metrics.acceleration === null)) &&
      (project.manualStatus ?? project.status) === 'tracked' &&
      !project.archived &&
      !project.fork &&
      !project.disabled &&
      !config.blacklist.some((name) => name.toLowerCase() === project.fullName.toLowerCase()) &&
      (!rising || metrics.stars <= config.maximumRisingStars),
  );
  const candidates = [
    ...new Set([
      ...ranked.map((row) => row.project.slug),
      ...unknown.map((row) => row.project.slug),
      ...unobserved,
    ]),
  ];
  const observations = ranked.flatMap((row) => {
    if (!eligibleProject(row.project, row.metrics, config)) return [];
    const scorecard = scorecards.get(row.project.entityId);
    return [
      ...observed(row.project.slug, rising ? 'github-rising' : 'github-momentum', row.score, {
        observedOn: date,
        evidenceUrl: `https://github.com/${row.project.fullName}`,
      }),
      ...observed(
        row.project.slug,
        'openssf-practices',
        scorecard ? scorecard.score * 10 : undefined,
        scorecard
          ? {
              observedOn: scorecard.assessedOn,
              evidenceUrl: `https://scorecard.dev/viewer/?uri=github.com/${row.project.fullName}`,
            }
          : undefined,
        scorecard?.score,
      ),
    ];
  });
  return { profile, date, candidates, observations };
}

export function skillsReferenceInput(
  candidates: readonly SkillScoreInput[],
  date: string,
  universe = candidates.map((item) => item.entity.slug),
): ReferenceInput {
  const installationCohort = candidates.filter((item) =>
    admissibleEvidence(item, 'skills-installs', REFERENCE_PROFILES.skills, date),
  );
  const repositoryCohort = candidates.filter((item) =>
    admissibleEvidence(item, 'skill-repository', REFERENCE_PROFILES.skills, date),
  );
  const installs = normalized(installationCohort, (item) =>
    item.metrics.installs7d === null ? null : Math.max(0, item.metrics.installs7d),
  );
  const stars = normalized(repositoryCohort, (item) =>
    item.metrics.stars7d === null ? null : Math.max(0, item.metrics.stars7d),
  );
  const freshness = normalized(repositoryCohort, (item) => item.metrics.freshness);
  return {
    profile: REFERENCE_PROFILES.skills,
    date,
    candidates: universe,
    observations: candidates.flatMap((item) => {
      const slug = item.entity.slug;
      const starScore = stars.get(slug);
      const recent = freshness.get(slug);
      const repository =
        starScore !== undefined && recent !== undefined
          ? starScore * 0.6 + recent * 0.4
          : undefined;
      return [
        ...observed(
          slug,
          'skills-installs',
          installs.get(slug),
          item.referenceEvidence?.['skills-installs'],
          item.metrics.installs7d,
        ),
        ...observed(
          slug,
          'skill-repository',
          repository,
          item.referenceEvidence?.['skill-repository'],
        ),
      ];
    }),
  };
}
export function modelsReferenceInput(
  candidates: readonly ModelScoreInput[],
  date: string,
  universe = candidates.map((item) => item.entity.slug),
): ReferenceInput {
  const arena = normalized(
    candidates.filter((item) =>
      admissibleEvidence(item, 'arena-text', REFERENCE_PROFILES.models, date),
    ),
    (item) => item.metrics.arenaQuality,
  );
  const analysis = normalized(
    candidates.filter((item) =>
      admissibleEvidence(item, 'artificial-analysis', REFERENCE_PROFILES.models, date),
    ),
    (item) => item.metrics.artificialAnalysisIntelligence,
  );
  return {
    profile: REFERENCE_PROFILES.models,
    date,
    candidates: universe,
    observations: candidates.flatMap((item) => [
      ...observed(
        item.entity.slug,
        'arena-text',
        arena.get(item.entity.slug),
        item.referenceEvidence?.['arena-text'],
        item.metrics.arenaQuality,
      ),
      ...observed(
        item.entity.slug,
        'artificial-analysis',
        analysis.get(item.entity.slug),
        item.referenceEvidence?.['artificial-analysis'],
        item.metrics.artificialAnalysisIntelligence,
      ),
    ]),
  };
}

/** Les vues secondaires historiques restent disponibles ; le rang principal vient exclusivement du rapport v3. */
export function externalReferenceEntries(
  input: ReferenceInput,
  reportRows: {
    entity: string;
    rank: number;
    score: number;
    disagreement: number;
    sensitivity: { bestRank: number; worstRank: number };
  }[],
  candidates: readonly SkillScoreInput[] | readonly ModelScoreInput[],
): ScoredExternalEntity[] {
  const legacy =
    input.profile.chart === 'skills'
      ? scoreSkills(candidates as readonly SkillScoreInput[], Math.max(1, candidates.length))
      : scoreModels(candidates as readonly ModelScoreInput[], Math.max(1, candidates.length));
  const bySlug = new Map(legacy.map((item) => [item.entity.slug, item]));
  return reportRows.map((row) => {
    const item = bySlug.get(row.entity);
    if (!item) throw new Error(`Candidat v3 sans données de présentation : ${row.entity}.`);
    return {
      ...item,
      rank: row.rank,
      score: row.score,
      dimensions: {
        ...item.dimensions,
        [input.profile.chart === 'skills' ? 'momentum' : 'quality']: row.score,
      },
      metrics: {
        ...item.metrics,
        sourceDisagreement: row.disagreement,
        sensitivityBestRank: row.sensitivity.bestRank,
        sensitivityWorstRank: row.sensitivity.worstRank,
      },
    };
  });
}
