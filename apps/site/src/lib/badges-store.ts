import { createHash, randomUUID } from 'node:crypto';
import { and, desc, eq, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, hasDatabaseConfiguration } from '../db/client.ts';
import {
  badgeAwards,
  badgeAwardWithdrawals,
  chartEntities,
  githubProjects,
  weeklyChartEditions,
  weeklyRankings,
} from '../db/schema.ts';
import {
  awardSunday,
  awardWeekSchema,
  emptyRanking,
  githubBadgeIdSchema,
  parisWeek,
  rankingEligibility,
  RISING_STAR_RULE,
  risingStarWinner,
} from '../domain/badges.ts';
import { isCalendarEdition } from '../domain/weeks.ts';

/** Ordre identique à compareWeeks, sans charger toutes les archives et leurs payloads. */
const editionDate = sql`CASE WHEN ${weeklyChartEditions.week} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}(T(00|12):00Z)?$' THEN ${weeklyChartEditions.week}::timestamptz ELSE to_date(${weeklyChartEditions.week}, 'IYYY-"W"IW')::timestamptz END`;

const evidenceJsonSchema = z.json();
type EvidenceJson = z.infer<typeof evidenceJsonSchema>;
function canonicalEvidence(value: EvidenceJson): string {
  if (Array.isArray(value)) return `[${value.map(canonicalEvidence).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalEvidence(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
/** JSONB réordonne les clés : le hash doit rester identique après lecture de la preuve. */
export function badgeEvidenceHash(value: unknown): string {
  return createHash('sha256')
    .update(canonicalEvidence(evidenceJsonSchema.parse(value)))
    .digest('hex');
}

export async function readRankingBadge(githubId: string, now = new Date()) {
  const id = Number(githubBadgeIdSchema.parse(githubId));
  if (!hasDatabaseConfiguration())
    return { project: null, eligibility: emptyRanking('unavailable') };
  const db = getDb();
  const [project] = await db
    .select({
      githubId: githubProjects.githubId,
      slug: chartEntities.slug,
      name: chartEntities.name,
      active: chartEntities.active,
      archived: githubProjects.archived,
      disabled: githubProjects.disabled,
      lastError: githubProjects.lastError,
      status: githubProjects.status,
      manualStatus: githubProjects.manualStatus,
    })
    .from(githubProjects)
    .innerJoin(chartEntities, eq(chartEntities.id, githubProjects.entityId))
    .where(eq(githubProjects.githubId, id))
    .limit(1);
  if (!project) return { project: null, eligibility: emptyRanking('unranked') };
  const [edition] = await db
    .select({ payload: weeklyChartEditions.payload })
    .from(weeklyChartEditions)
    .where(and(eq(weeklyChartEditions.chart, 'github'), isNotNull(weeklyChartEditions.publishedAt)))
    .orderBy(desc(editionDate), desc(weeklyChartEditions.week))
    .limit(1);
  const available =
    project.active &&
    !project.archived &&
    !project.disabled &&
    !project.lastError &&
    (project.manualStatus ?? project.status) === 'tracked';
  return {
    project,
    eligibility: rankingEligibility(edition?.payload ?? null, project.slug, now, available),
  };
}

function publicAwardQuery() {
  return getDb()
    .select({
      id: badgeAwards.id,
      week: badgeAwards.week,
      githubId: badgeAwards.githubId,
      name: badgeAwards.projectName,
      slug: chartEntities.slug,
      editionId: badgeAwards.editionId,
      sourceEdition: weeklyChartEditions.week,
      rank: badgeAwards.rank,
      score: badgeAwards.score,
      ruleVersion: badgeAwards.ruleVersion,
      assignedAt: badgeAwards.assignedAt,
      evidenceHash: badgeAwards.evidenceHash,
      withdrawalReason: badgeAwardWithdrawals.reason,
      withdrawnAt: badgeAwardWithdrawals.withdrawnAt,
    })
    .from(badgeAwards)
    .innerJoin(chartEntities, eq(chartEntities.id, badgeAwards.entityId))
    .innerJoin(weeklyChartEditions, eq(weeklyChartEditions.id, badgeAwards.editionId))
    .leftJoin(badgeAwardWithdrawals, eq(badgeAwardWithdrawals.awardId, badgeAwards.id));
}

function requireRisingIdentity<T extends { week: string | null; githubId: number | null }>(
  row: T,
): T & { week: string; githubId: number } {
  return {
    ...row,
    week: awardWeekSchema.parse(row.week),
    githubId: Number(githubBadgeIdSchema.parse(String(row.githubId))),
  };
}

export async function readBadgeAwards(
  githubId?: number,
  options: { before?: string; limit?: number } = {},
) {
  const limit = z
    .number()
    .int()
    .min(1)
    .max(260)
    .parse(options.limit ?? 260);
  const before = options.before ? awardWeekSchema.parse(options.before) : undefined;
  if (githubId !== undefined) githubBadgeIdSchema.parse(String(githubId));
  const rows = await publicAwardQuery()
    .where(
      and(
        eq(badgeAwards.awardType, 'rising-star'),
        githubId === undefined ? undefined : eq(badgeAwards.githubId, githubId),
        before ? lt(badgeAwards.week, before) : undefined,
      ),
    )
    .orderBy(desc(badgeAwards.week))
    .limit(limit);
  return rows.map(requireRisingIdentity);
}
export type PublicBadgeAward = Awaited<ReturnType<typeof readBadgeAwards>>[number];

export async function readBadgeAwardEdition(week: string) {
  awardWeekSchema.parse(week);
  const [award] = await publicAwardQuery()
    .where(and(eq(badgeAwards.awardType, 'rising-star'), eq(badgeAwards.week, week)))
    .limit(1);
  return award ? requireRisingIdentity(award) : null;
}

/** Les semaines acceptées couvrent 2000 à 2099, au plus 5300 attributions. */
export async function readBadgeAwardSitemapEntries() {
  const rows = await getDb()
    .select({ week: badgeAwards.week, assignedAt: badgeAwards.assignedAt })
    .from(badgeAwards)
    .leftJoin(badgeAwardWithdrawals, eq(badgeAwardWithdrawals.awardId, badgeAwards.id))
    .where(and(eq(badgeAwards.awardType, 'rising-star'), isNull(badgeAwardWithdrawals.awardId)))
    .orderBy(desc(badgeAwards.week))
    .limit(5300);
  return rows.map((row) => ({ ...row, week: awardWeekSchema.parse(row.week) }));
}

export async function readAwardBadge(githubId: string, week: string) {
  const id = Number(githubBadgeIdSchema.parse(githubId));
  awardWeekSchema.parse(week);
  if (!hasDatabaseConfiguration()) return { status: 'unavailable' as const, award: null };
  // Filtre SQL dédié : une URL inconnue ne peut créer ni attribuer un prix.
  const [row] = await getDb()
    .select({ award: badgeAwards, withdrawnAt: badgeAwardWithdrawals.withdrawnAt })
    .from(badgeAwards)
    .leftJoin(badgeAwardWithdrawals, eq(badgeAwardWithdrawals.awardId, badgeAwards.id))
    .where(
      and(
        eq(badgeAwards.githubId, id),
        eq(badgeAwards.week, week),
        eq(badgeAwards.awardType, 'rising-star'),
      ),
    )
    .limit(1);
  return {
    status: row
      ? row.withdrawnAt
        ? ('withdrawn' as const)
        : ('awarded' as const)
      : ('missing' as const),
    award: row?.award ?? null,
  };
}

/** Reprend les dimanches publiés manqués après interruption. Aucun gel n'est modifié. */
export async function assignClosedRisingStars(
  options: { now?: Date; dryRun?: boolean; week?: string } = {},
) {
  const now = options.now ?? new Date();
  const targetWeek = options.week ? awardWeekSchema.parse(options.week) : undefined;
  if (!hasDatabaseConfiguration()) throw new Error('Postgres est requis pour attribuer un Award.');
  const db = getDb();
  const editions = await db
    .select()
    .from(weeklyChartEditions)
    .where(
      and(
        eq(weeklyChartEditions.chart, 'rising'),
        isNotNull(weeklyChartEditions.publishedAt),
        targetWeek
          ? sql`left(${weeklyChartEditions.week}, 10) = ${awardSunday(targetWeek)}`
          : undefined,
      ),
    )
    .orderBy(desc(editionDate), desc(weeklyChartEditions.week))
    .limit(1200);
  const result = {
    considered: 0,
    eligible: 0,
    created: 0,
    existing: 0,
    weeks: [] as string[],
    dryRun: options.dryRun === true,
  };
  const seenDays = new Set<string>();
  for (const source of editions) {
    const day = source.week.slice(0, 10);
    if (seenDays.has(day)) continue;
    seenDays.add(day);
    if (!isCalendarEdition(source.week) || new Date(`${day}T12:00:00Z`).getUTCDay() !== 0) continue;
    const week = parisWeek(new Date(`${day}T12:00:00Z`));
    if ((targetWeek && week !== targetWeek) || week >= parisWeek(now)) continue;
    result.considered++;
    const [existing] = await db
      .select({ id: badgeAwards.id })
      .from(badgeAwards)
      .where(and(eq(badgeAwards.awardType, 'rising-star'), eq(badgeAwards.week, week)))
      .limit(1);
    if (existing) {
      result.existing++;
      continue;
    }
    const rows = await db
      .select({ ranking: weeklyRankings, repo: githubProjects, entity: chartEntities })
      .from(weeklyRankings)
      .innerJoin(githubProjects, eq(githubProjects.entityId, weeklyRankings.entityId))
      .innerJoin(chartEntities, eq(chartEntities.id, weeklyRankings.entityId))
      .where(eq(weeklyRankings.editionId, source.id));
    const candidates = rows.map(({ ranking, repo, entity }) => ({
      entityId: entity.id,
      githubId: repo.githubId,
      slug: entity.slug,
      name: entity.name,
      rank: ranking.rank,
      score: ranking.score,
      metadata: ranking.metadata,
    }));
    const winner = risingStarWinner(source, candidates, week, now);
    if (!winner) continue;
    result.eligible++;
    result.weeks.push(week);
    if (options.dryRun) continue;
    const evidence = {
      snapshot: source.payload,
      metadata: winner.metadata,
      config: source.config,
      scoringVersion: source.scoringVersion,
    };
    const inserted = await db
      .insert(badgeAwards)
      .values({
        id: randomUUID(),
        awardType: 'rising-star',
        week,
        entityId: winner.entityId,
        githubId: winner.githubId,
        projectName: winner.name,
        editionId: source.id,
        rank: winner.rank,
        score: winner.score,
        ruleVersion: RISING_STAR_RULE,
        evidence,
        evidenceHash: badgeEvidenceHash(evidence),
        assignedAt: now.toISOString(),
      })
      .onConflictDoNothing({ target: [badgeAwards.awardType, badgeAwards.week] })
      .returning({ id: badgeAwards.id });
    result.created += inserted.length;
    if (!inserted.length) result.existing++;
  }
  return result;
}

export async function withdrawBadgeAward(week: string, reason: string, actor: string) {
  awardWeekSchema.parse(week);
  const values = z
    .object({
      reason: z.string().trim().min(10).max(1000),
      actor: z.string().trim().min(1).max(100),
    })
    .parse({ reason, actor });
  const [award] = await getDb()
    .select({ id: badgeAwards.id })
    .from(badgeAwards)
    .where(and(eq(badgeAwards.awardType, 'rising-star'), eq(badgeAwards.week, week)))
    .limit(1);
  if (!award) throw new Error('Attribution introuvable.');
  return (
    await getDb()
      .insert(badgeAwardWithdrawals)
      .values({ awardId: award.id, ...values })
      .onConflictDoNothing()
      .returning()
  ).length;
}
