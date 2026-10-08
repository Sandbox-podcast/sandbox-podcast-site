import { z } from 'zod';

export const externalProviderSchema = z.enum([
  'skills-sh',
  'github',
  'huggingface',
  'arena',
  'openrouter',
  'artificial-analysis',
]);
export type ExternalProvider = z.infer<typeof externalProviderSchema>;

export const externalSourceRefSchema = z.object({
  provider: externalProviderSchema,
  externalId: z.string().min(1).max(512),
  url: z.url().refine((value) => value.startsWith('https://')),
  label: z.string().min(1).max(120),
});
export type ExternalSourceRef = z.infer<typeof externalSourceRefSchema>;

export const externalEntitySchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  type: z.enum(['skill', 'model']),
  name: z.string().min(1).max(180),
  organization: z.string().max(180).nullable(),
  description: z.string().max(2000).nullable(),
  category: z.string().min(1).max(80),
  license: z.string().max(180).nullable(),
  openWeights: z.boolean().nullable(),
  sourceUrl: z.url().refine((value) => value.startsWith('https://')),
  websiteUrl: z
    .url()
    .refine((value) => value.startsWith('https://'))
    .nullable(),
  sources: z.array(externalSourceRefSchema).min(1),
});
export type ExternalEntity = z.infer<typeof externalEntitySchema>;

export const externalObservationSchema = z.object({
  entitySlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  source: externalSourceRefSchema,
  observedOn: z.iso.date(),
  collectedAt: z.iso.datetime(),
  metrics: z.record(z.string(), z.unknown()),
});
export type ExternalObservation = z.infer<typeof externalObservationSchema>;

export interface SkillScoreInput {
  entity: ExternalEntity;
  metrics: {
    installs: number;
    installs7d: number;
    stars: number;
    stars7d: number;
    forks: number;
    freshness: number;
  };
  sourceObservedAt: string[];
}

export interface ModelScoreInput {
  entity: ExternalEntity;
  metrics: {
    arenaQuality: number | null;
    artificialAnalysisIntelligence: number | null;
    arenaCoding: number | null;
    artificialAnalysisCoding: number | null;
    arenaAgent: number | null;
    artificialAnalysisAgentic: number | null;
    arenaVision: number | null;
    arenaSearch: number | null;
    verifiedReasoning: Record<string, number>;
    verifiedMaths: Record<string, number>;
    downloads30d: number | null;
    likes: number | null;
    openRouterWeeklyRank: number | null;
    openRouterThroughputRank: number | null;
    contextLength: number | null;
    promptPricePerMillion: number | null;
    completionPricePerMillion: number | null;
  };
  sourceObservedAt: string[];
}

export interface ScoredExternalEntity<T extends ExternalEntity = ExternalEntity> {
  entity: T;
  rank: number;
  score: number;
  dimensions: Record<string, number>;
  metrics: Record<string, number>;
  sourceObservedAt: string[];
}

function percentile(
  values: ReadonlyMap<string, number>,
  higherIsBetter = true,
): Map<string, number> {
  const sorted = [...values.entries()].toSorted((a, b) =>
    higherIsBetter ? a[1] - b[1] : b[1] - a[1],
  );
  const scores = new Map<string, number>();
  for (let start = 0; start < sorted.length;) {
    const value = sorted[start]?.[1];
    let end = start + 1;
    while (end < sorted.length && sorted[end]?.[1] === value) end++;
    const averageRank = (start + end - 1) / 2;
    const score = sorted.length < 2 ? 100 : (averageRank / (sorted.length - 1)) * 100;
    for (let index = start; index < end; index++) {
      const slug = sorted[index]?.[0];
      if (slug) scores.set(slug, Math.round(score * 100) / 100);
    }
    start = end;
  }
  return scores;
}

function combine(scores: readonly (number | null)[], weights: readonly number[]): number | null {
  let weighted = 0;
  let coverage = 0;
  for (let index = 0; index < scores.length; index++) {
    const score = scores[index];
    const weight = weights[index];
    if (score !== null && score !== undefined && weight !== undefined && weight > 0) {
      weighted += score * weight;
      coverage += weight;
    }
  }
  return coverage ? Math.round((weighted / coverage) * 100) / 100 : null;
}

function metricPercentiles<T extends { entity: ExternalEntity }>(
  candidates: readonly T[],
  value: (item: T) => number | null,
  higherIsBetter = true,
): Map<string, number> {
  return percentile(
    new Map(
      candidates.flatMap((item) => {
        const number = value(item);
        return number !== null && Number.isFinite(number) ? [[item.entity.slug, number]] : [];
      }),
    ),
    higherIsBetter,
  );
}

export function scoreSkills(
  candidates: readonly SkillScoreInput[],
  size = 10,
): ScoredExternalEntity[] {
  if (!Number.isSafeInteger(size) || size < 1) throw new Error('Taille Skills invalide.');
  const installGrowth = metricPercentiles(candidates, (item) => item.metrics.installs7d);
  const githubGrowth = metricPercentiles(candidates, (item) => item.metrics.stars7d);
  const installReach = metricPercentiles(candidates, (item) => item.metrics.installs);
  const freshness = metricPercentiles(candidates, (item) => item.metrics.freshness);

  return candidates
    .flatMap((item) => {
      const dimensions = {
        ...(installGrowth.has(item.entity.slug)
          ? { growth: installGrowth.get(item.entity.slug) ?? 0 }
          : {}),
        ...(githubGrowth.has(item.entity.slug)
          ? { githubGrowth: githubGrowth.get(item.entity.slug) ?? 0 }
          : {}),
        ...(installReach.has(item.entity.slug)
          ? { reach: installReach.get(item.entity.slug) ?? 0 }
          : {}),
        ...(freshness.has(item.entity.slug)
          ? { freshness: freshness.get(item.entity.slug) ?? 0 }
          : {}),
      };
      const score = combine(
        [dimensions.growth ?? null, dimensions.githubGrowth ?? null, dimensions.freshness ?? null],
        [0.5, 0.3, 0.2],
      );
      return score === null
        ? []
        : [
            {
              entity: item.entity,
              score,
              dimensions: { ...dimensions, momentum: score },
              metrics: {
                installs: item.metrics.installs,
                installs7d: item.metrics.installs7d,
                stars: item.metrics.stars,
                stars7d: item.metrics.stars7d,
                forks: item.metrics.forks,
                freshness: item.metrics.freshness,
              },
              sourceObservedAt: item.sourceObservedAt,
            },
          ];
    })
    .toSorted((a, b) => b.score - a.score || a.entity.slug.localeCompare(b.entity.slug))
    .slice(0, size)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

function safeNaturalLog(value: number | null): number | null {
  return value !== null && value > 0 ? Math.log(value) : null;
}

export function scoreModels(
  candidates: readonly ModelScoreInput[],
  size = 10,
): ScoredExternalEntity[] {
  if (!Number.isSafeInteger(size) || size < 1) throw new Error('Taille Models invalide.');
  const arenaQuality = metricPercentiles(candidates, (item) => item.metrics.arenaQuality);
  const aaQuality = metricPercentiles(
    candidates,
    (item) => item.metrics.artificialAnalysisIntelligence,
  );
  const arenaCoding = metricPercentiles(candidates, (item) => item.metrics.arenaCoding);
  const aaCoding = metricPercentiles(candidates, (item) => item.metrics.artificialAnalysisCoding);
  const arenaAgent = metricPercentiles(candidates, (item) => item.metrics.arenaAgent);
  const aaAgent = metricPercentiles(candidates, (item) => item.metrics.artificialAnalysisAgentic);
  const arenaVision = metricPercentiles(candidates, (item) => item.metrics.arenaVision);
  const arenaSearch = metricPercentiles(candidates, (item) => item.metrics.arenaSearch);
  const reachDownloads = metricPercentiles(candidates, (item) => item.metrics.downloads30d);
  const reachOpenRouter = metricPercentiles(
    candidates,
    (item) => item.metrics.openRouterWeeklyRank,
    false,
  );
  const throughput = metricPercentiles(
    candidates,
    (item) => item.metrics.openRouterThroughputRank,
    false,
  );
  const context = metricPercentiles(candidates, (item) =>
    safeNaturalLog(item.metrics.contextLength),
  );
  const blendedPrice = new Map(
    candidates.map((item) => {
      const prompt = item.metrics.promptPricePerMillion;
      const completion = item.metrics.completionPricePerMillion;
      return [
        item.entity.slug,
        prompt !== null && completion !== null ? (prompt * 3 + completion) / 4 : null,
      ] as const;
    }),
  );
  const price = percentile(
    new Map(
      [...blendedPrice.entries()].flatMap(([slug, value]) =>
        value !== null && value >= 0 ? [[slug, value]] : [],
      ),
    ),
    false,
  );
  const benchmarkDimension = (
    select: (item: ModelScoreInput) => Record<string, number>,
  ): Map<string, number> => {
    const benchmarkIds = new Set(candidates.flatMap((item) => Object.keys(select(item))));
    const perEntity = new Map<string, number[]>();
    for (const benchmarkId of benchmarkIds) {
      const normalized = metricPercentiles(candidates, (item) => select(item)[benchmarkId] ?? null);
      for (const item of candidates) {
        const value = normalized.get(item.entity.slug);
        if (value === undefined) continue;
        const values = perEntity.get(item.entity.slug) ?? [];
        values.push(value);
        perEntity.set(item.entity.slug, values);
      }
    }
    return new Map(
      [...perEntity].map(([slug, values]) => [
        slug,
        Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100,
      ]),
    );
  };
  const reasoning = benchmarkDimension((item) => item.metrics.verifiedReasoning);
  const maths = benchmarkDimension((item) => item.metrics.verifiedMaths);

  const rows = candidates.flatMap((item) => {
    const slug = item.entity.slug;
    const quality = combine(
      [arenaQuality.get(slug) ?? null, aaQuality.get(slug) ?? null],
      [0.5, 0.5],
    );
    if (quality === null) return [];
    const coding = combine([arenaCoding.get(slug) ?? null, aaCoding.get(slug) ?? null], [0.5, 0.5]);
    const agents = combine([arenaAgent.get(slug) ?? null, aaAgent.get(slug) ?? null], [0.5, 0.5]);
    const reach = combine(
      [reachDownloads.get(slug) ?? null, reachOpenRouter.get(slug) ?? null],
      [0.5, 0.5],
    );
    const value = combine([quality, price.get(slug) ?? null], [0.6, 0.4]);
    const dimensions = {
      quality,
      ...(coding !== null ? { coding } : {}),
      ...(reasoning.has(slug) ? { reasoning: reasoning.get(slug) ?? 0 } : {}),
      ...(maths.has(slug) ? { maths: maths.get(slug) ?? 0 } : {}),
      ...(agents !== null ? { agents } : {}),
      ...(arenaVision.has(slug) ? { multimodal: arenaVision.get(slug) ?? 0 } : {}),
      ...(arenaSearch.has(slug) ? { research: arenaSearch.get(slug) ?? 0 } : {}),
      ...(context.has(slug) ? { longContext: context.get(slug) ?? 0 } : {}),
      ...(throughput.has(slug) ? { speed: throughput.get(slug) ?? 0 } : {}),
      ...(price.has(slug) ? { price: price.get(slug) ?? 0 } : {}),
      ...(reach !== null ? { reach } : {}),
      ...(value !== null ? { value } : {}),
    };
    const metrics: Record<string, number> = {};
    const add = (key: string, number: number | null) => {
      if (number !== null && Number.isFinite(number)) metrics[key] = number;
    };
    add('arenaQuality', item.metrics.arenaQuality);
    add('artificialAnalysisIntelligence', item.metrics.artificialAnalysisIntelligence);
    add('arenaCoding', item.metrics.arenaCoding);
    add('artificialAnalysisCoding', item.metrics.artificialAnalysisCoding);
    add('arenaAgent', item.metrics.arenaAgent);
    add('artificialAnalysisAgentic', item.metrics.artificialAnalysisAgentic);
    add('arenaVision', item.metrics.arenaVision);
    add('arenaSearch', item.metrics.arenaSearch);
    add('downloads30d', item.metrics.downloads30d);
    add('likes', item.metrics.likes);
    add('contextLength', item.metrics.contextLength);
    add('promptPricePerMillion', item.metrics.promptPricePerMillion);
    add('completionPricePerMillion', item.metrics.completionPricePerMillion);
    add('blendedPricePerMillion', blendedPrice.get(slug) ?? null);
    add('openRouterWeeklyRank', item.metrics.openRouterWeeklyRank);
    add('openRouterThroughputRank', item.metrics.openRouterThroughputRank);
    for (const [key, number] of Object.entries(item.metrics.verifiedReasoning))
      add(`verified_${key}`, number);
    for (const [key, number] of Object.entries(item.metrics.verifiedMaths))
      add(`verified_${key}`, number);
    return [
      {
        entity: item.entity,
        score: quality,
        dimensions,
        metrics,
        sourceObservedAt: item.sourceObservedAt,
      },
    ];
  });

  return rows
    .toSorted((a, b) => b.score - a.score || a.entity.slug.localeCompare(b.entity.slug))
    .slice(0, size)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export function normalizeModelAlias(value: string): string {
  const withoutNamespace = value.trim().split('/').at(-1) ?? value;
  return withoutNamespace.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function slugifyExternalId(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
  return slug || 'external-item';
}
