import { z } from 'zod';

export const starObservationSchema = z
  .object({
    projectId: z.string().min(1),
    observedAt: z.iso.datetime(),
    stars: z.number().int().nonnegative(),
  })
  .strict();
export type StarObservation = z.infer<typeof starObservationSchema>;
export const burstPolicySchema = z
  .object({
    version: z.string().min(1).default('github-bursts-v1'),
    growthFloor: z.number().int().positive().default(200),
    toleranceFraction: z.number().positive().max(0.25).default(0.25),
    windows: z
      .array(
        z
          .object({
            hours: z.number().int().min(1).max(48),
            minimumGain: z.number().int().positive(),
            minimumRelativeGrowth: z.number().positive().max(10),
            exceptionalGain: z.number().int().positive(),
          })
          .strict(),
      )
      .min(1)
      .max(6)
      .default([
        { hours: 1, minimumGain: 25, minimumRelativeGrowth: 0.05, exceptionalGain: 250 },
        { hours: 6, minimumGain: 100, minimumRelativeGrowth: 0.1, exceptionalGain: 1000 },
        { hours: 24, minimumGain: 300, minimumRelativeGrowth: 0.15, exceptionalGain: 3000 },
      ]),
  })
  .strict()
  .superRefine((policy, ctx) => {
    if (new Set(policy.windows.map((window) => window.hours)).size !== policy.windows.length)
      ctx.addIssue({ code: 'custom', message: 'Fenêtre dupliquée.' });
    if (policy.windows.some((window) => window.exceptionalGain < window.minimumGain))
      ctx.addIssue({ code: 'custom', message: 'Seuil exceptionnel inférieur au gain minimal.' });
  });
export type BurstPolicy = z.infer<typeof burstPolicySchema>;
export const DEFAULT_BURST_POLICY = burstPolicySchema.parse({});
export interface GithubBurst {
  projectId: string;
  observedAt: string;
  baselineAt: string;
  windowHours: number;
  elapsedHours: number;
  stars: number;
  baselineStars: number;
  gain: number;
  starsPerHour: number;
  relativeGrowth: number;
  acceleration: number | null;
  policyVersion: string;
  policy: BurstPolicy;
}
const HOUR = 3600000;

/** Compare uniquement des observations réelles du même dépôt, sans extrapoler une fenêtre absente. */
export function detectGithubBursts(
  rawCurrent: StarObservation,
  rawHistory: readonly StarObservation[],
  policy = DEFAULT_BURST_POLICY,
): GithubBurst[] {
  const current = starObservationSchema.parse(rawCurrent);
  burstPolicySchema.parse(policy);
  const byTime = new Map<string, StarObservation>();
  for (const raw of rawHistory) {
    const row = starObservationSchema.parse(raw);
    if (row.projectId !== current.projectId || row.observedAt >= current.observedAt) continue;
    const existing = byTime.get(row.observedAt);
    if (existing && existing.stars !== row.stars)
      throw new Error('Compteurs contradictoires au même instant.');
    byTime.set(row.observedAt, row);
  }
  const history = [...byTime.values()];
  const nearest = (at: number, hours: number) =>
    history
      .filter(
        (row) =>
          Math.abs(Date.parse(row.observedAt) - at) <= hours * HOUR * policy.toleranceFraction,
      )
      .toSorted(
        (a, b) =>
          Math.abs(Date.parse(a.observedAt) - at) - Math.abs(Date.parse(b.observedAt) - at) ||
          a.observedAt.localeCompare(b.observedAt),
      )[0];
  return policy.windows.flatMap((window) => {
    const baseline = nearest(Date.parse(current.observedAt) - window.hours * HOUR, window.hours);
    if (!baseline) return [];
    const elapsedHours = (Date.parse(current.observedAt) - Date.parse(baseline.observedAt)) / HOUR;
    const gain = current.stars - baseline.stars;
    const relativeGrowth = gain / Math.max(policy.growthFloor, baseline.stars);
    if (
      gain < window.minimumGain ||
      (relativeGrowth < window.minimumRelativeGrowth && gain < window.exceptionalGain)
    )
      return [];
    const earlier = nearest(Date.parse(baseline.observedAt) - window.hours * HOUR, window.hours);
    const oldVelocity = earlier
      ? (baseline.stars - earlier.stars) /
        ((Date.parse(baseline.observedAt) - Date.parse(earlier.observedAt)) / HOUR)
      : null;
    const starsPerHour = gain / elapsedHours;
    return [
      {
        projectId: current.projectId,
        observedAt: current.observedAt,
        baselineAt: baseline.observedAt,
        windowHours: window.hours,
        elapsedHours,
        stars: current.stars,
        baselineStars: baseline.stars,
        gain,
        starsPerHour,
        relativeGrowth,
        acceleration:
          oldVelocity !== null && oldVelocity > 0 ? starsPerHour / oldVelocity - 1 : null,
        policyVersion: policy.version,
        policy,
      },
    ];
  });
}
