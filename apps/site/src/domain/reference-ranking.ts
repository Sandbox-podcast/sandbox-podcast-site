import { z } from 'zod';

const id = z
  .string()
  .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/)
  .max(120);
const unit = z.number().min(0).max(1);
export const referenceSourceSchema = z
  .object({
    id,
    family: id,
    upstream: id,
    dataset: id,
    label: z.string().min(1).max(180),
    methodologyUrl: z.url().refine((url) => url.startsWith('https://')),
    relevance: unit.positive(),
    rigor: unit.positive(),
    reproducibility: unit.positive(),
    manipulationResistance: unit.positive(),
    maximumAgeDays: z.number().int().min(0).max(365),
    minimumSampleSize: z.number().int().nonnegative().default(0),
    rationale: z.string().min(20).max(2000),
  })
  .strict();
export const referenceProfileSchema = z
  .object({
    version: id,
    chart: z.enum(['github', 'rising', 'skills', 'models']),
    status: z.enum(['experimental', 'reviewed']),
    objective: z.string().min(20).max(1000),
    families: z
      .array(z.object({ id, label: z.string().min(1), weight: unit.positive() }).strict())
      .min(2)
      .max(20),
    sources: z.array(referenceSourceSchema).min(2).max(40),
    disagreementPenalty: z.number().min(0).max(0.5),
    sensitivityVariation: z.number().positive().max(0.5).default(0.2),
    size: z.number().int().min(1).max(100).default(20),
    minimumCandidates: z.number().int().min(2).max(100).default(20),
  })
  .strict()
  .superRefine((profile, ctx) => {
    const fail = (message: string) => {
      ctx.addIssue({ code: 'custom', message });
    };
    const families = new Set(profile.families.map((family) => family.id));
    if (families.size !== profile.families.length) fail('Famille dupliquée.');
    if (new Set(profile.sources.map((source) => source.id)).size !== profile.sources.length)
      fail('Source dupliquée.');
    // Un miroir du même jeu de mesures ne reçoit pas un second vote.
    if (
      new Set(profile.sources.map((source) => `${source.upstream}/${source.dataset}`)).size !==
      profile.sources.length
    )
      fail('Jeu de mesures compté plusieurs fois.');
    if (Math.abs(profile.families.reduce((sum, family) => sum + family.weight, 0) - 1) > 1e-8)
      fail('Les poids des familles doivent totaliser 1.');
    if (profile.sources.some((source) => !families.has(source.family)))
      fail('Source sans famille connue.');
    if (
      profile.families.some(
        (family) => !profile.sources.some((source) => source.family === family.id),
      )
    )
      fail('Famille sans source.');
    if (profile.minimumCandidates > profile.size)
      fail('Minimum supérieur à la taille du classement.');
  });
export type ReferenceProfile = z.infer<typeof referenceProfileSchema>;
export type ReferenceSource = z.infer<typeof referenceSourceSchema>;

export const referenceObservationSchema = z
  .object({
    entity: id,
    source: id,
    score: z.number().min(0).max(100),
    rawValue: z.number().optional(),
    observedOn: z.iso.date(),
    evidenceUrl: z.url().refine((url) => url.startsWith('https://')),
    sampleSize: z.number().int().nonnegative().optional(),
  })
  .strict();
export type ReferenceObservation = z.infer<typeof referenceObservationSchema>;
export const referenceInputSchema = z
  .object({
    profile: referenceProfileSchema,
    date: z.iso.date(),
    candidates: z.array(id).max(20000),
    observations: z.array(referenceObservationSchema).max(800000),
  })
  .strict()
  .superRefine((input, ctx) => {
    const entities = new Set(input.candidates);
    const sources = new Set(input.profile.sources.map((source) => source.id));
    const keys = new Set<string>();
    if (entities.size !== input.candidates.length)
      ctx.addIssue({ code: 'custom', message: 'Candidat dupliqué.' });
    for (const observation of input.observations) {
      const key = `${observation.entity}/${observation.source}`;
      if (!entities.has(observation.entity) || !sources.has(observation.source) || keys.has(key))
        ctx.addIssue({ code: 'custom', message: 'Observation inconnue ou dupliquée.' });
      keys.add(key);
    }
  });
export type ReferenceInput = z.infer<typeof referenceInputSchema>;

export interface ReferenceRow {
  entity: string;
  rank: number;
  score: number;
  mean: number;
  disagreement: number;
  coverage: number;
  contributions: {
    source: string;
    family: string;
    score: number;
    weight: number;
    points: number;
    observedOn: string;
    evidenceUrl: string;
  }[];
  sensitivity: { bestRank: number; worstRank: number };
}
export interface ReferenceReport {
  version: string;
  date: string;
  candidateCount: number;
  eligibleCount: number;
  sourceCoverage: { source: string; observed: number; total: number; weight: number }[];
  excluded: { entity: string; missing: string[]; upperBound: number; canEnterTop: boolean }[];
  rejectedObservations: { entity: string; source: string; reason: 'future' | 'stale' | 'sample' }[];
  blockers: string[];
  publishable: boolean;
  rows: ReferenceRow[];
  sensitivityScenarios: number;
}

const round = (value: number) => Math.round(value * 1000000) / 1000000;
const compareId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export function referenceWeights(profile: ReferenceProfile): Record<string, number> {
  const merit = (source: ReferenceSource) =>
    source.relevance * source.rigor * source.reproducibility * source.manipulationResistance;
  const result: Record<string, number> = {};
  for (const family of profile.families) {
    const sources = profile.sources.filter((source) => source.family === family.id);
    const total = sources.reduce((sum, source) => sum + merit(source), 0);
    for (const source of sources) result[source.id] = (family.weight * merit(source)) / total;
  }
  return result;
}

/** Moyenne et désaccord entre familles. Les poids restent identiques pour tous les candidats. */
function aggregate(
  profile: ReferenceProfile,
  scores: ReadonlyMap<string, number>,
  weights: Record<string, number>,
) {
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const mean =
    profile.sources.reduce(
      (sum, source) => sum + (scores.get(source.id) ?? 0) * (weights[source.id] ?? 0),
      0,
    ) / total;
  const disagreement = profile.families.reduce((sum, family) => {
    const sources = profile.sources.filter((source) => source.family === family.id);
    const weight = sources.reduce((value, source) => value + (weights[source.id] ?? 0), 0);
    if (!weight) return sum;
    const score =
      sources.reduce(
        (value, source) => value + (scores.get(source.id) ?? 0) * (weights[source.id] ?? 0),
        0,
      ) / weight;
    return sum + (weight / total) * Math.abs(score - mean);
  }, 0);
  return {
    score: Math.max(0, mean - profile.disagreementPenalty * disagreement),
    mean,
    disagreement,
  };
}

/** Percentile de rang moyen dans le pool observé de chaque source, avant toute intersection. */
export function referencePercentiles(
  values: ReadonlyMap<string, number>,
  higherIsBetter = true,
): Map<string, number> {
  if ([...values.values()].some((value) => !Number.isFinite(value)))
    throw new Error('Mesure non finie.');
  const sorted = [...values].toSorted(
    (a, b) => (higherIsBetter ? a[1] - b[1] : b[1] - a[1]) || compareId(a[0], b[0]),
  );
  const result = new Map<string, number>();
  for (let start = 0; start < sorted.length;) {
    let end = start + 1;
    while (end < sorted.length && sorted[end]?.[1] === sorted[start]?.[1]) end++;
    const score = sorted.length < 2 ? 50 : ((start + end - 1) / 2 / (sorted.length - 1)) * 100;
    for (let index = start; index < end; index++) {
      const entry = sorted[index];
      if (entry) result.set(entry[0], score);
    }
    start = end;
  }
  return result;
}

export function calculateReferenceRanking(raw: unknown): ReferenceReport {
  const input = referenceInputSchema.parse(raw);
  const { profile, date } = input;
  const weights = referenceWeights(profile);
  const byEntity = new Map<string, Map<string, ReferenceObservation>>();
  const sources = new Map(profile.sources.map((source) => [source.id, source]));
  const rejectedObservations: ReferenceReport['rejectedObservations'] = [];
  for (const observation of input.observations) {
    const source = sources.get(observation.source);
    if (!source) throw new Error('Source inconnue.');
    const age = (Date.parse(date) - Date.parse(observation.observedOn)) / 86400000;
    const reason =
      age < 0
        ? 'future'
        : age > source.maximumAgeDays
          ? 'stale'
          : (observation.sampleSize ?? 0) < source.minimumSampleSize
            ? 'sample'
            : null;
    if (reason) {
      rejectedObservations.push({ entity: observation.entity, source: source.id, reason });
      continue;
    }
    const observations =
      byEntity.get(observation.entity) ?? new Map<string, ReferenceObservation>();
    observations.set(source.id, observation);
    byEntity.set(observation.entity, observations);
  }
  const excluded: ReferenceReport['excluded'] = [];
  const rows: ReferenceRow[] = [];
  for (const entity of [...input.candidates].toSorted(compareId)) {
    const observations = byEntity.get(entity) ?? new Map<string, ReferenceObservation>();
    const missing = profile.sources
      .filter((source) => !observations.has(source.id))
      .map((source) => source.id);
    const scores = new Map([...observations].map(([key, observation]) => [key, observation.score]));
    if (missing.length) {
      for (const source of missing) scores.set(source, 100);
      // Pour une pénalité <= 0,5, le score est monotone dans chacune de ses entrées.
      excluded.push({
        entity,
        missing,
        upperBound: round(aggregate(profile, scores, weights).score),
        canEnterTop: false,
      });
      continue;
    }
    const result = aggregate(profile, scores, weights);
    rows.push({
      entity,
      rank: 0,
      ...result,
      coverage: 1,
      contributions: profile.sources.map((source) => {
        const observation = observations.get(source.id);
        if (!observation) throw new Error('Observation requise absente.');
        const weight = weights[source.id] ?? 0;
        return {
          source: source.id,
          family: source.family,
          score: observation.score,
          weight,
          points: observation.score * weight,
          observedOn: observation.observedOn,
          evidenceUrl: observation.evidenceUrl,
        };
      }),
      sensitivity: { bestRank: 0, worstRank: 0 },
    });
  }
  const ranked = rows.toSorted((a, b) => b.score - a.score || compareId(a.entity, b.entity));
  ranked.forEach((row, index) => {
    row.rank = index + 1;
    row.sensitivity = { bestRank: row.rank, worstRank: row.rank };
  });
  const scenarios: Record<string, number>[] = [];
  for (const family of profile.families)
    for (const factor of [1 - profile.sensitivityVariation, 1 + profile.sensitivityVariation, 0]) {
      scenarios.push(
        Object.fromEntries(
          profile.sources.map((source) => [
            source.id,
            (weights[source.id] ?? 0) * (source.family === family.id ? factor : 1),
          ]),
        ),
      );
    }
  for (const source of profile.sources) {
    scenarios.push({ ...weights, [source.id]: 0 });
    for (const factor of [1 - profile.sensitivityVariation, 1 + profile.sensitivityVariation])
      scenarios.push({ ...weights, [source.id]: (weights[source.id] ?? 0) * factor });
  }
  for (const scenario of scenarios) {
    const scores = ranked
      .map((row) => ({
        row,
        score: aggregate(
          profile,
          new Map(row.contributions.map((item) => [item.source, item.score])),
          scenario,
        ).score,
      }))
      .toSorted((a, b) => b.score - a.score || compareId(a.row.entity, b.row.entity));
    scores.forEach(({ row }, index) => {
      row.sensitivity.bestRank = Math.min(row.sensitivity.bestRank, index + 1);
      row.sensitivity.worstRank = Math.max(row.sensitivity.worstRank, index + 1);
    });
  }
  const cutoff = ranked.length >= profile.size ? ranked[profile.size - 1]?.score : undefined;
  for (const item of excluded)
    item.canEnterTop = cutoff === undefined || item.upperBound >= cutoff - 1e-6;
  const blockers: string[] = [];
  if (ranked.length < profile.minimumCandidates) blockers.push('insufficient-candidates');
  if (excluded.some((item) => item.canEnterTop)) blockers.push('unresolved-contenders');
  return {
    version: profile.version,
    date,
    candidateCount: input.candidates.length,
    eligibleCount: ranked.length,
    sourceCoverage: profile.sources.map((source) => ({
      source: source.id,
      weight: weights[source.id] ?? 0,
      observed: [...byEntity.values()].filter((value) => value.has(source.id)).length,
      total: input.candidates.length,
    })),
    excluded,
    rejectedObservations,
    blockers,
    publishable: blockers.length === 0,
    rows: ranked.slice(0, profile.size).map((row) => ({
      ...row,
      score: round(row.score),
      mean: round(row.mean),
      disagreement: round(row.disagreement),
    })),
    sensitivityScenarios: scenarios.length,
  };
}
