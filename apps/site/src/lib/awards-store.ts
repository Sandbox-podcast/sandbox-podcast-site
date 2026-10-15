import { randomUUID } from 'node:crypto';
import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, lte, ne, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/client.ts';
import {
  badgeAwards,
  badgeAwardWithdrawals,
  chartEntities,
  githubProjects,
  weeklyChartEditions,
  weeklyRankings,
} from '../db/schema.ts';
import {
  AWARD_DEFINITIONS,
  awardAssignmentIdSchema,
  awardChartSchema,
  awardPeriod,
  awardPeriodBounds,
  awardScope,
  awardTypeSchema,
  candidateAwardPeriods,
  selectAwardWinners,
  type AwardChart,
  type AwardEdition,
  type AwardType,
  assignedAwardPath,
  awardEntityPath,
} from '../domain/awards.ts';
import { badgeEvidenceHash } from './badges-store.ts';
import { parisDate } from '../domain/badges.ts';

const extendedTypes = awardTypeSchema.options.filter((type) => type !== 'rising-star');
const factsSchema = z.object({
  firstPlaces: z.number().int().min(1).max(53).optional(),
  rankGain: z.number().int().min(1).max(99).optional(),
  previousRank: z.number().int().min(1).max(100).optional(),
  category: z.string().min(1).max(80).optional(),
});
const publicSourceUrlSchema = z.url().refine((value) => value.startsWith('https://'));

/** Chargement borné : 54 semaines en reprise automatique, période complète pour une reprise explicite. */
export async function loadAwardEditions(
  options: { type?: AwardType; period?: string; now?: Date } = {},
): Promise<AwardEdition[]> {
  const now = options.now ?? new Date();
  const today = parisDate(now);
  let start = new Date(Date.parse(today) - 54 * 7 * 86400000).toISOString().slice(0, 10);
  let end = today;
  let charts: readonly AwardChart[] = awardChartSchema.options;
  if (options.type && options.period) {
    const bounds = awardPeriodBounds(options.type, options.period);
    start =
      options.type === 'biggest-mover'
        ? new Date(Date.parse(bounds.start) - 7 * 86400000).toISOString().slice(0, 10)
        : bounds.start;
    end = bounds.end;
  }
  if (options.type && AWARD_DEFINITIONS[options.type].chart !== 'all') {
    const chart = AWARD_DEFINITIONS[options.type].chart;
    if (chart !== 'all') charts = [chart];
  }
  const db = getDb();
  const editions = await db
    .select()
    .from(weeklyChartEditions)
    .where(
      and(
        inArray(weeklyChartEditions.chart, [...charts]),
        isNotNull(weeklyChartEditions.publishedAt),
        gte(weeklyChartEditions.week, start),
        lte(weeklyChartEditions.week, end),
        sql`CASE WHEN ${weeklyChartEditions.week} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN extract(isodow FROM ${weeklyChartEditions.week}::date) = 7 ELSE false END`,
      ),
    )
    .orderBy(desc(weeklyChartEditions.week))
    .limit(240);
  if (!editions.length) return [];
  const ids = editions.map((edition) => edition.id);
  const [positions, exclusions] = await Promise.all([
    db
      .select({
        position: weeklyRankings,
        entity: chartEntities,
        githubId: githubProjects.githubId,
      })
      .from(weeklyRankings)
      .innerJoin(chartEntities, eq(chartEntities.id, weeklyRankings.entityId))
      .leftJoin(githubProjects, eq(githubProjects.entityId, chartEntities.id))
      .where(inArray(weeklyRankings.editionId, ids)),
    db
      .select({ editionId: badgeAwards.editionId })
      .from(badgeAwards)
      .innerJoin(badgeAwardWithdrawals, eq(badgeAwardWithdrawals.awardId, badgeAwards.id))
      .where(inArray(badgeAwards.editionId, ids)),
  ]);
  const excluded = new Set(exclusions.map((row) => row.editionId));
  return editions.map((edition) => ({
    ...edition,
    chart: awardChartSchema.parse(edition.chart),
    excluded: excluded.has(edition.id),
    rows: positions
      .filter((row) => row.position.editionId === edition.id)
      .map(({ position, entity, githubId }) => ({
        entityId: entity.id,
        githubId,
        slug: entity.slug,
        name: entity.name,
        rank: position.rank,
        score: position.score,
        metadata: position.metadata,
      })),
  }));
}

export async function assignClosedAwards(
  options: { type?: AwardType; period?: string; scope?: string; dryRun?: boolean; now?: Date } = {},
) {
  const now = options.now ?? new Date();
  if (options.type) awardTypeSchema.parse(options.type);
  if (options.period && !options.type) throw new Error('Une période explicite exige --type.');
  if (options.scope !== undefined && !options.type)
    throw new Error('Une catégorie explicite exige --type.');
  if (options.type && options.period) awardPeriod(options.type, options.period);
  if (options.type && options.scope !== undefined) awardScope(options.type, options.scope);
  const editions = await loadAwardEditions(options);
  const types = options.type ? [options.type] : extendedTypes;
  const result = {
    considered: 0,
    eligible: 0,
    created: 0,
    existing: 0,
    failed: 0,
    dryRun: options.dryRun === true,
    candidates: [] as { type: AwardType; period: string; scope: string; name: string }[],
    errors: [] as { type: AwardType; period: string; errorType: string }[],
  };
  const db = getDb();
  for (const type of types) {
    if (type === 'rising-star') continue; // Le chemin historique conserve sa règle et ses URL.
    const periods = options.period
      ? [awardPeriod(type, options.period)]
      : candidateAwardPeriods(type, editions, now);
    for (const period of periods) {
      result.considered++;
      const selections = selectAwardWinners(type, period, editions, now, options.scope);
      for (const selection of selections) {
        const [existing] = await db
          .select({ id: badgeAwards.id })
          .from(badgeAwards)
          .where(
            and(
              eq(badgeAwards.awardType, type),
              eq(badgeAwards.period, period),
              eq(badgeAwards.scope, selection.scope),
            ),
          )
          .limit(1);
        if (existing) {
          result.existing++;
          continue;
        }
        result.eligible++;
        result.candidates.push({
          type,
          period,
          scope: selection.scope,
          name: selection.nominee.name,
        });
        if (options.dryRun) continue;
        const evidence = {
          sourceEditionIds: selection.sources.map((source) => source.id),
          sources: selection.sources.map((source) => ({
            id: source.id,
            chart: source.chart,
            date: source.week,
            scoringVersion: source.scoringVersion,
            config: source.config,
            publishedAt: source.publishedAt,
          })),
          nominee: {
            entityId: selection.nominee.entityId,
            githubId: selection.nominee.githubId,
            slug: selection.nominee.slug,
            rank: selection.nominee.rank,
            score: selection.nominee.score,
            metadata: selection.nominee.metadata,
          },
          facts: selection.facts,
        };
        try {
          const inserted = await db
            .insert(badgeAwards)
            .values({
              id: randomUUID(),
              awardType: type,
              extendedPeriod: period,
              periodKind: AWARD_DEFINITIONS[type].periodKind,
              scope: selection.scope,
              chart: selection.chart,
              entityId: selection.nominee.entityId,
              githubId: selection.nominee.githubId,
              projectName: selection.nominee.name,
              editionId: selection.source.id,
              rank: selection.nominee.rank,
              score: selection.nominee.score,
              ruleVersion: AWARD_DEFINITIONS[type].rule,
              evidence,
              evidenceHash: badgeEvidenceHash(evidence),
              assignedAt: now.toISOString(),
            })
            .onConflictDoNothing({
              target: [badgeAwards.awardType, badgeAwards.period, badgeAwards.scope],
            })
            .returning({ id: badgeAwards.id });
          if (inserted.length) result.created++;
          else result.existing++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            type,
            period,
            errorType: error instanceof Error ? error.name : 'unknown',
          });
        }
      }
    }
  }
  return result;
}

function publicAwardsQuery() {
  return getDb()
    .select({
      id: badgeAwards.id,
      type: badgeAwards.awardType,
      period: badgeAwards.period,
      periodKind: badgeAwards.periodKind,
      scope: badgeAwards.scope,
      chart: badgeAwards.chart,
      entityId: badgeAwards.entityId,
      githubId: badgeAwards.githubId,
      name: badgeAwards.projectName,
      slug: chartEntities.slug,
      sourceUrl: chartEntities.sourceUrl,
      sourceEdition: weeklyChartEditions.week,
      rank: badgeAwards.rank,
      score: badgeAwards.score,
      ruleVersion: badgeAwards.ruleVersion,
      evidenceHash: badgeAwards.evidenceHash,
      evidence: badgeAwards.evidence,
      assignedAt: badgeAwards.assignedAt,
      withdrawnAt: badgeAwardWithdrawals.withdrawnAt,
      withdrawalReason: badgeAwardWithdrawals.reason,
    })
    .from(badgeAwards)
    .innerJoin(chartEntities, eq(chartEntities.id, badgeAwards.entityId))
    .innerJoin(weeklyChartEditions, eq(weeklyChartEditions.id, badgeAwards.editionId))
    .leftJoin(badgeAwardWithdrawals, eq(badgeAwardWithdrawals.awardId, badgeAwards.id));
}
type PublicAwardRow = Awaited<ReturnType<typeof publicAwardsQuery>>[number];
function publicAward(row: PublicAwardRow) {
  const type = awardTypeSchema.parse(row.type);
  const period = awardPeriod(type, row.period);
  const chart = awardChartSchema.parse(row.chart);
  const scope = awardScope(type, row.scope);
  const { evidence, ...safe } = row;
  return {
    ...safe,
    type,
    period,
    chart,
    scope,
    sourceUrl: publicSourceUrlSchema.parse(row.sourceUrl),
    facts: factsSchema.parse(evidence['facts'] ?? {}),
  };
}
export type PublicAward = ReturnType<typeof publicAward>;

export async function readPublicAward(id: string): Promise<PublicAward | null> {
  awardAssignmentIdSchema.parse(id);
  const [row] = await publicAwardsQuery().where(eq(badgeAwards.id, id)).limit(1);
  return row ? publicAward(row) : null;
}
export async function readPublicAwards(
  options: {
    type?: AwardType;
    chart?: AwardChart;
    entityId?: string;
    githubId?: number;
    before?: string;
    period?: string;
    limit?: number;
  } = {},
) {
  const limit = z
    .number()
    .int()
    .min(1)
    .max(260)
    .parse(options.limit ?? 21);
  if (options.type) awardTypeSchema.parse(options.type);
  if (options.chart) awardChartSchema.parse(options.chart);
  if (options.period && options.type) awardPeriod(options.type, options.period);
  let before: { at: string; id: string } | undefined;
  if (options.before) {
    awardAssignmentIdSchema.parse(options.before);
    const [row] = await getDb()
      .select({ at: badgeAwards.assignedAt, id: badgeAwards.id })
      .from(badgeAwards)
      .where(eq(badgeAwards.id, options.before))
      .limit(1);
    if (!row) return [];
    before = row;
  }
  const rows = await publicAwardsQuery()
    .where(
      and(
        options.type ? eq(badgeAwards.awardType, options.type) : undefined,
        options.chart ? eq(badgeAwards.chart, options.chart) : undefined,
        options.entityId ? eq(badgeAwards.entityId, options.entityId) : undefined,
        options.githubId !== undefined ? eq(badgeAwards.githubId, options.githubId) : undefined,
        options.period ? eq(badgeAwards.period, options.period) : undefined,
        before
          ? or(
              lt(badgeAwards.assignedAt, before.at),
              and(eq(badgeAwards.assignedAt, before.at), lt(badgeAwards.id, before.id)),
            )
          : undefined,
      ),
    )
    .orderBy(desc(badgeAwards.assignedAt), desc(badgeAwards.id))
    .limit(limit);
  return rows.map(publicAward);
}
export async function withdrawPublicAward(id: string, reason: string, actor: string) {
  awardAssignmentIdSchema.parse(id);
  const values = z
    .object({
      reason: z.string().trim().min(10).max(1000),
      actor: z.string().trim().min(1).max(100),
    })
    .parse({ reason, actor });
  const [award] = await getDb()
    .select({ id: badgeAwards.id })
    .from(badgeAwards)
    .where(eq(badgeAwards.id, id))
    .limit(1);
  if (!award) throw new Error('Attribution introuvable.');
  return (
    await getDb()
      .insert(badgeAwardWithdrawals)
      .values({ awardId: id, ...values })
      .onConflictDoNothing()
      .returning({ id: badgeAwardWithdrawals.awardId })
  ).length;
}

export async function readAwardBadgeSlugs(slugs: readonly string[]): Promise<string[]> {
  if (!slugs.length) return [];
  const rows = await getDb()
    .selectDistinct({ slug: chartEntities.slug })
    .from(badgeAwards)
    .innerJoin(chartEntities, eq(chartEntities.id, badgeAwards.entityId))
    .leftJoin(badgeAwardWithdrawals, eq(badgeAwardWithdrawals.awardId, badgeAwards.id))
    .where(and(inArray(chartEntities.slug, [...slugs]), isNull(badgeAwardWithdrawals.awardId)));
  return rows.map((row) => row.slug);
}

export async function readAwardSitemapEntries() {
  const rows = await getDb()
    .select({
      id: badgeAwards.id,
      chart: badgeAwards.chart,
      slug: chartEntities.slug,
      assignedAt: badgeAwards.assignedAt,
    })
    .from(badgeAwards)
    .innerJoin(chartEntities, eq(chartEntities.id, badgeAwards.entityId))
    .leftJoin(badgeAwardWithdrawals, eq(badgeAwardWithdrawals.awardId, badgeAwards.id))
    .where(and(ne(badgeAwards.awardType, 'rising-star'), isNull(badgeAwardWithdrawals.awardId)));
  return rows.map((row) => ({
    path: assignedAwardPath(row.id),
    entityPath: awardEntityPath({ chart: awardChartSchema.parse(row.chart), slug: row.slug }),
    assignedAt: row.assignedAt,
  }));
}
