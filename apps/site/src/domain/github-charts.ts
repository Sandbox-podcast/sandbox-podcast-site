import { z } from 'zod';
import { isoWeekOf } from './weeks.ts';

export const trackingStatusSchema = z.enum(['candidate', 'tracked', 'ignored', 'blocked']);
export type TrackingStatus = z.infer<typeof trackingStatusSchema>;
export const chartCategorySchema = z.enum([
  'Agents',
  'Coding',
  'MCP',
  'LLM',
  'RAG',
  'Research',
  'Image',
  'Video',
  'Voice',
  'Infrastructure',
  'Data',
  'Local AI',
  'Other',
]);
export const githubChartConfigSchema = z
  .object({
    version: z.string().min(1).max(80).default('github-momentum-v1'),
    risingVersion: z.string().min(1).max(80).default('github-rising-v1'),
    size: z.number().int().min(3).max(20).default(20),
    minimumCandidates: z.number().int().min(3).max(20).default(20),
    qualificationStars: z.number().int().min(0).default(100),
    eligibilityStars: z.number().int().min(0).default(200),
    eligibilityVelocity: z.number().int().min(0).default(100),
    growthFloor: z.number().int().positive().default(200),
    maximumRisingStars: z.number().int().positive().default(25000),
    toleranceDays: z.number().int().min(0).max(2).default(1),
    recentDays: z.number().int().min(1).max(365).default(90),
    blacklist: z.array(z.string().regex(/^[\w.-]+\/[\w.-]+$/)).default([]),
    momentum: z
      .object({
        starVelocity: z.number().nonnegative().default(0.45),
        relativeGrowth: z.number().nonnegative().default(0.2),
        forkVelocity: z.number().nonnegative().default(0.15),
        contributorActivity: z.number().nonnegative().default(0.1),
        repositoryActivity: z.number().nonnegative().default(0.1),
      })
      .prefault({}),
    rising: z
      .object({
        acceleration: z.number().nonnegative().default(0.4),
        relativeGrowth: z.number().nonnegative().default(0.3),
        starVelocity: z.number().nonnegative().default(0.2),
        freshness: z.number().nonnegative().default(0.1),
      })
      .prefault({}),
  })
  .superRefine((config, context) => {
    for (const name of ['momentum', 'rising'] as const)
      if (
        Math.abs(Object.values(config[name]).reduce((sum, weight) => sum + weight, 0) - 1) > 0.00001
      )
        context.addIssue({
          code: 'custom',
          path: [name],
          message: 'Les poids doivent totaliser 1.',
        });
    if (config.minimumCandidates > config.size)
      context.addIssue({
        code: 'custom',
        path: ['minimumCandidates'],
        message: 'Le minimum ne peut pas dépasser la taille du classement.',
      });
  });
export type GithubChartConfig = z.infer<typeof githubChartConfigSchema>;
export const DEFAULT_GITHUB_CHART_CONFIG = githubChartConfigSchema.parse({});

export const githubRepositorySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  full_name: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  owner: z.object({ login: z.string().min(1) }),
  description: z.string().nullable(),
  homepage: z.string().nullable().optional(),
  html_url: z.url(),
  language: z.string().nullable(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  pushed_at: z.iso.datetime().nullable(),
  default_branch: z.string(),
  archived: z.boolean(),
  fork: z.boolean(),
  disabled: z.boolean().default(false),
  private: z.boolean().default(false),
  stargazers_count: z.number().int().nonnegative(),
  forks_count: z.number().int().nonnegative(),
  subscribers_count: z.number().int().nonnegative().nullable().optional(),
  open_issues_count: z.number().int().nonnegative(),
  topics: z.array(z.string()).default([]),
});
export type GithubRepository = z.infer<typeof githubRepositorySchema>;
export interface DailyGithubSnapshot {
  projectId: string;
  date: string;
  stars: number;
  forks: number;
  watchers: number | null;
  openIssues: number;
  contributors: number | null;
  commits: number | null;
  releases: number | null;
  pushedAt: string | null;
  collectedAt: string;
}
export interface GithubChartProject {
  id: string;
  entityId: string;
  slug: string;
  name: string;
  category: string;
  fullName: string;
  description: string | null;
  language: string | null;
  createdAt: string;
  status: TrackingStatus;
  manualStatus: TrackingStatus | null;
  archived: boolean;
  fork: boolean;
  disabled: boolean;
}
export interface GithubComputedMetrics {
  stars: number;
  stars7d: number | null;
  growthPercentage: number | null;
  forks: number;
  forks7d: number | null;
  contributorsDelta: number | null;
  contributors: number | null;
  activityScore: number | null;
  acceleration: number | null;
  freshness: number;
  baselineDate: string | null;
  previousBaselineDate: string | null;
  collectedAt: string;
  insufficientHistory: boolean;
}
const DAY = 86400000;
export function utcDate(value: Date = new Date()): string {
  return value.toISOString().slice(0, 10);
}
export function dateDaysAgo(date: string, days: number): string {
  return utcDate(new Date(Date.parse(`${date}T00:00:00Z`) - days * DAY));
}

/** Ne regarde jamais le futur ; J-7 reste dans une tolérance bornée et antérieure à la collecte. */
export function closestBaseline(
  snapshots: readonly DailyGithubSnapshot[],
  date: string,
  days: number,
  tolerance: number,
): DailyGithubSnapshot | undefined {
  const target = Date.parse(`${dateDaysAgo(date, days)}T00:00:00Z`);
  return snapshots
    .filter(
      (item) =>
        item.date < date &&
        Math.abs(Date.parse(`${item.date}T00:00:00Z`) - target) <= tolerance * DAY,
    )
    .toSorted(
      (a, b) =>
        Math.abs(Date.parse(`${a.date}T00:00:00Z`) - target) -
          Math.abs(Date.parse(`${b.date}T00:00:00Z`) - target) || a.date.localeCompare(b.date),
    )[0];
}
export function githubMetrics(
  project: GithubChartProject,
  current: DailyGithubSnapshot,
  history: readonly DailyGithubSnapshot[],
  config: GithubChartConfig,
): GithubComputedMetrics {
  const prior = closestBaseline(history, current.date, 7, config.toleranceDays);
  const earlier = prior ? closestBaseline(history, prior.date, 7, config.toleranceDays) : undefined;
  const interval = prior ? (Date.parse(current.date) - Date.parse(prior.date)) / DAY : null;
  const stars7d = prior ? current.stars - prior.stars : null;
  // La vitesse pour l'accélération est ramenée à 7 jours si le relevé manque à J-7.
  const velocity = stars7d !== null && interval ? (stars7d * 7) / interval : null;
  const previousInterval =
    prior && earlier ? (Date.parse(prior.date) - Date.parse(earlier.date)) / DAY : null;
  const previousVelocity =
    prior && earlier && previousInterval
      ? ((prior.stars - earlier.stars) * 7) / previousInterval
      : null;
  const daysSincePush = current.pushedAt
    ? Math.max(0, (Date.parse(current.collectedAt) - Date.parse(current.pushedAt)) / DAY)
    : null;
  const age = Math.max(0, (Date.parse(current.collectedAt) - Date.parse(project.createdAt)) / DAY);
  return {
    stars: current.stars,
    stars7d,
    growthPercentage:
      prior && prior.stars > 0 && stars7d !== null ? (stars7d / prior.stars) * 100 : null,
    forks: current.forks,
    forks7d: prior ? current.forks - prior.forks : null,
    contributors: current.contributors,
    contributorsDelta:
      current.contributors !== null &&
      prior?.contributors !== null &&
      prior?.contributors !== undefined
        ? current.contributors - prior.contributors
        : null,
    activityScore:
      daysSincePush === null ? null : Math.round(100 * Math.exp(-daysSincePush / 30) * 100) / 100,
    acceleration:
      velocity !== null && previousVelocity !== null && previousVelocity > 0
        ? ((velocity - previousVelocity) / previousVelocity) * 100
        : null,
    freshness: 100 * Math.exp(-age / 180),
    baselineDate: prior?.date ?? null,
    previousBaselineDate: earlier?.date ?? null,
    collectedAt: current.collectedAt,
    insufficientHistory: prior === undefined,
  };
}
export function qualifiesRepository(
  repo: GithubRepository,
  config: GithubChartConfig,
  now: Date,
): boolean {
  return (
    repo.stargazers_count >= config.qualificationStars &&
    !repo.archived &&
    !repo.fork &&
    !repo.disabled &&
    !repo.private &&
    !config.blacklist.map((item) => item.toLowerCase()).includes(repo.full_name.toLowerCase()) &&
    Date.parse(repo.updated_at) >= now.getTime() - config.recentDays * DAY
  );
}
export function eligibleProject(
  project: GithubChartProject,
  metrics: GithubComputedMetrics,
  config: GithubChartConfig,
): boolean {
  return (
    (project.manualStatus ?? project.status) === 'tracked' &&
    !project.archived &&
    !project.fork &&
    !project.disabled &&
    !config.blacklist.map((item) => item.toLowerCase()).includes(project.fullName.toLowerCase()) &&
    !metrics.insufficientHistory &&
    (metrics.stars >= config.eligibilityStars ||
      (metrics.stars7d ?? 0) >= config.eligibilityVelocity)
  );
}

export function percentile(value: number, values: readonly number[]): number {
  if (values.length <= 1) return 50;
  const lower = values.filter((item) => item < value).length;
  const equal = values.filter((item) => item === value).length;
  return ((lower + Math.max(0, equal - 1) / 2) / (values.length - 1)) * 100;
}
export interface GithubScoredEntry {
  project: GithubChartProject;
  metrics: GithubComputedMetrics;
  rank: number;
  score: number;
  components: Record<string, number | null>;
  weights: Record<string, number>;
  coverage: number;
}
export function rankGithubProjects(
  input: readonly { project: GithubChartProject; metrics: GithubComputedMetrics }[],
  config: GithubChartConfig,
  rising = false,
): GithubScoredEntry[] {
  const candidates = input.filter(
    (item) =>
      eligibleProject(item.project, item.metrics, config) &&
      (!rising ||
        (item.metrics.stars <= config.maximumRisingStars && (item.metrics.acceleration ?? 0) > 0)),
  );
  const weights: Record<string, number> = rising ? config.rising : config.momentum;
  const raw = (metrics: GithubComputedMetrics): Record<string, number | null> => ({
    starVelocity: metrics.stars7d === null ? null : Math.max(0, metrics.stars7d),
    relativeGrowth:
      metrics.stars7d === null
        ? null
        : (Math.max(0, metrics.stars7d) /
            Math.max(config.growthFloor, metrics.stars - metrics.stars7d)) *
          100,
    forkVelocity: metrics.forks7d === null ? null : Math.max(0, metrics.forks7d),
    contributorActivity:
      metrics.contributorsDelta === null ? null : Math.max(0, metrics.contributorsDelta),
    repositoryActivity: metrics.activityScore,
    acceleration: metrics.acceleration,
    freshness: metrics.freshness,
  });
  const values = candidates.map((item) => raw(item.metrics));
  // Un tri par composante évite une traversée de tout le catalogue pour chaque projet.
  const percentiles = new Map<string, Map<number, number>>();
  for (const key of Object.keys(weights)) {
    const cohort = values
      .flatMap((row) => (row[key] === null || row[key] === undefined ? [] : [row[key]]))
      .toSorted((a, b) => a - b);
    const lookup = new Map<number, number>();
    for (let start = 0; start < cohort.length;) {
      const value = cohort[start];
      let end = start + 1;
      while (end < cohort.length && cohort[end] === value) end++;
      if (value !== undefined)
        lookup.set(
          value,
          cohort.length <= 1 ? 50 : ((start + (end - start - 1) / 2) / (cohort.length - 1)) * 100,
        );
      start = end;
    }
    percentiles.set(key, lookup);
  }
  return candidates
    .map((item, index) => {
      const components = Object.fromEntries(
        Object.keys(weights).map((key) => {
          const value = values[index]?.[key];
          return [
            key,
            value === undefined || value === null
              ? null
              : key === 'repositoryActivity' || key === 'freshness'
                ? value
                : (percentiles.get(key)?.get(value) ?? 50),
          ];
        }),
      );
      const coverage = Object.entries(weights).reduce(
        (sum, [key, weight]) => sum + (components[key] !== null ? weight : 0),
        0,
      );
      const weighted = Object.entries(weights).reduce(
        (sum, [key, weight]) => sum + (components[key] ?? 0) * weight,
        0,
      );
      return {
        ...item,
        rank: 0,
        score: coverage > 0 ? Math.round((weighted / coverage) * 100) / 100 : 0,
        components,
        weights,
        coverage,
      };
    })
    .toSorted(
      (a, b) =>
        b.score - a.score ||
        (b.metrics.stars7d ?? 0) - (a.metrics.stars7d ?? 0) ||
        a.project.slug.localeCompare(b.project.slug),
    )
    .slice(0, config.size)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}
export function weeklyGithubMovement(
  entity: string,
  rank: number,
  previous: readonly { entity: string; rank: number }[],
): {
  previousRank: number | null;
  rankChange: number;
  status: 'new' | 'rising' | 'falling' | 'stable';
} {
  const previousRank = previous.find((item) => item.entity === entity)?.rank ?? null;
  const rankChange = previousRank === null ? 0 : previousRank - rank;
  return {
    previousRank,
    rankChange,
    status:
      previousRank === null
        ? 'new'
        : rankChange > 0
          ? 'rising'
          : rankChange < 0
            ? 'falling'
            : 'stable',
  };
}
export function rankingWeek(date: string): string {
  return isoWeekOf(new Date(`${date}T00:00:00Z`));
}
