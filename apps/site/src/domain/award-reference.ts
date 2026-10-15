import { z } from 'zod';
import { calculateReferenceRanking, referenceInputSchema } from './reference-ranking.ts';

const proofSchema = z.object({
  referenceRanking: z.object({ schemaVersion: z.literal(1), input: referenceInputSchema }),
});

/** Rejoue la preuve publiée avant de réutiliser ses rangs pour une distinction. */
export function validAwardReference(
  source: { config: unknown; chart: string; week: string; scoringVersion: string },
  entries: readonly { entity: string; rank: number; score: number }[],
): boolean {
  const proof = proofSchema.safeParse(source.config);
  if (!proof.success) return false;
  const { input } = proof.data.referenceRanking;
  if (
    source.scoringVersion !== `${source.chart}-reference-v3` ||
    input.profile.version !== source.scoringVersion ||
    input.profile.chart !== source.chart ||
    input.date !== source.week.slice(0, 10)
  )
    return false;
  const report = calculateReferenceRanking(input);
  return (
    report.publishable &&
    report.rows.length === entries.length &&
    report.rows.every((row) =>
      entries.some(
        (entry) =>
          entry.entity === row.entity && entry.rank === row.rank && entry.score === row.score,
      ),
    )
  );
}
