import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { cache } from 'react';
import { z } from 'zod';
import { previousWeek } from '../domain/weeks.ts';
import { getDb, hasDatabaseConfiguration } from '../db/client.ts';
import {
  chartEntities,
  githubProjects,
  weeklyChartEditions,
  weeklyRankings,
} from '../db/schema.ts';
import { closestBaseline, githubMetrics, utcDate } from '../domain/github-charts.ts';
import { externalSourceRefSchema } from '../domain/external-charts.ts';
import { asProject, readChartsConfig, recentDailySnapshots } from './charts-store.ts';

const publishedExternalIdentitySchema = z.object({
  name: z.string().min(1),
  organization: z.string().nullable(),
  sourceUrl: z.url(),
  license: z.string().nullable(),
  openWeights: z.boolean().nullable(),
});

export const githubProjectDetail = cache(async function githubProjectDetail(slug: string) {
  if (!hasDatabaseConfiguration()) return null;
  const row = (
    await getDb()
      .select({ repo: githubProjects, entity: chartEntities })
      .from(githubProjects)
      .innerJoin(chartEntities, eq(chartEntities.id, githubProjects.entityId))
      .where(eq(chartEntities.slug, slug))
      .limit(1)
  )[0];
  if (!row) return null;
  const daily = await recentDailySnapshots([row.repo.id], utcDate(), 100);
  const weekly = await getDb()
    .select({ ranking: weeklyRankings, edition: weeklyChartEditions })
    .from(weeklyRankings)
    .innerJoin(weeklyChartEditions, eq(weeklyChartEditions.id, weeklyRankings.editionId))
    .where(
      and(eq(weeklyRankings.entityId, row.entity.id), isNotNull(weeklyChartEditions.publishedAt)),
    )
    .orderBy(weeklyChartEditions.week);
  const current = daily.at(-1);
  const project = asProject(row.repo, row.entity);
  const metrics = current ? githubMetrics(project, current, daily, await readChartsConfig()) : null;
  const at30 = current ? closestBaseline(daily, current.date, 30, 1) : undefined;
  const at90 = current ? closestBaseline(daily, current.date, 90, 1) : undefined;
  const github = weekly.filter((entry) => entry.edition.chart === 'github');
  const latest = await getDb()
    .select({ week: weeklyChartEditions.week })
    .from(weeklyChartEditions)
    .where(and(eq(weeklyChartEditions.chart, 'github'), isNotNull(weeklyChartEditions.publishedAt)))
    .orderBy(desc(weeklyChartEditions.week))
    .limit(1);
  return {
    project,
    githubUrl: row.entity.sourceUrl,
    metrics,
    currentWeek: latest[0]?.week ?? null,
    currentRank:
      github.find((entry) => entry.edition.week === latest[0]?.week)?.ranking.rank ?? null,
    previousRank:
      github.find((entry) => latest[0] && entry.edition.week === previousWeek(latest[0].week))
        ?.ranking.rank ?? null,
    bestRank: github.length ? Math.min(...github.map((entry) => entry.ranking.rank)) : null,
    weeksInTop20: github.length,
    firstAppearance: github[0]?.edition.week ?? null,
    growth30d: current && at30 ? current.stars - at30.stars : null,
    growth90d: current && at90 ? current.stars - at90.stars : null,
    daily,
    weekly: weekly.map(({ ranking, edition }) => ({
      chart: edition.chart,
      week: edition.week,
      rank: ranking.rank,
      score: ranking.score,
      rankChange: ranking.rankChange,
      status: ranking.status,
      scoringVersion: edition.scoringVersion,
      metadata: ranking.metadata,
    })),
  };
});

export type PublicChartId = 'github' | 'rising' | 'skills' | 'models';

export async function publicChartHistory(chart: PublicChartId) {
  if (!hasDatabaseConfiguration()) return [];
  const editions = await getDb()
    .select()
    .from(weeklyChartEditions)
    .where(and(eq(weeklyChartEditions.chart, chart), isNotNull(weeklyChartEditions.publishedAt)))
    .orderBy(desc(weeklyChartEditions.week));
  return editions.map((edition) => ({
    chart,
    week: edition.week,
    publishedAt: edition.publishedAt,
    scoringVersion: edition.scoringVersion,
    entries: edition.payload.entries.length,
  }));
}

export async function publicGithubRankedProjectSlugs(): Promise<string[]> {
  if (!hasDatabaseConfiguration()) return [];
  const rows = await getDb()
    .select({ slug: chartEntities.slug })
    .from(weeklyRankings)
    .innerJoin(weeklyChartEditions, eq(weeklyChartEditions.id, weeklyRankings.editionId))
    .innerJoin(chartEntities, eq(chartEntities.id, weeklyRankings.entityId))
    .where(and(eq(weeklyChartEditions.chart, 'github'), isNotNull(weeklyChartEditions.publishedAt)))
    .orderBy(chartEntities.slug);
  return [...new Set(rows.map(({ slug }) => slug))];
}
export async function publicChartEdition(chart: PublicChartId, week?: string) {
  if (!hasDatabaseConfiguration()) return null;
  const edition = (
    await getDb()
      .select()
      .from(weeklyChartEditions)
      .where(
        and(
          eq(weeklyChartEditions.chart, chart),
          week ? eq(weeklyChartEditions.week, week) : undefined,
          isNotNull(weeklyChartEditions.publishedAt),
        ),
      )
      .orderBy(desc(weeklyChartEditions.week))
      .limit(1)
  )[0];
  if (!edition) return null;
  const rankings = await getDb()
    .select()
    .from(weeklyRankings)
    .where(eq(weeklyRankings.editionId, edition.id))
    .orderBy(weeklyRankings.rank);
  const entities = rankings.length
    ? await getDb()
        .select()
        .from(chartEntities)
        .where(
          inArray(
            chartEntities.id,
            rankings.map((ranking) => ranking.entityId),
          ),
        )
    : [];
  const entitiesById = new Map(entities.map((entity) => [entity.id, entity]));
  return {
    chart,
    year: Number(edition.week.slice(0, 4)),
    week: Number(edition.week.slice(-2)),
    weekId: edition.week,
    publishedAt: edition.publishedAt,
    frozenAt: edition.frozenAt,
    scoringVersion: edition.scoringVersion,
    config: edition.config,
    entries: edition.payload.entries.map((entry) => {
      const ranking = rankings.find((item) => item.rank === entry.rank);
      const metadata = z.record(z.string(), z.unknown()).parse(ranking?.metadata ?? {});
      const entity = ranking ? entitiesById.get(ranking.entityId) : undefined;
      const frozenIdentity = publishedExternalIdentitySchema.safeParse(metadata['identity']);
      const frozenSources = z.array(externalSourceRefSchema).safeParse(metadata['sources']);
      const frozen = metadata['project'];
      const project = frozen && typeof frozen === 'object' ? frozen : {};
      const name =
        'name' in project && typeof project.name === 'string' ? project.name : entry.entity;
      const fullName =
        'fullName' in project && typeof project.fullName === 'string' ? project.fullName : null;
      return {
        rank: entry.rank,
        previousRank: ranking?.previousRank ?? null,
        rankChange: ranking?.rankChange ?? 0,
        status: ranking?.status ?? 'new',
        name: frozenIdentity.success ? frozenIdentity.data.name : (entity?.name ?? name),
        organization: frozenIdentity.success
          ? frozenIdentity.data.organization
          : (entity?.organization ?? null),
        sourceUrl: frozenIdentity.success
          ? frozenIdentity.data.sourceUrl
          : (entity?.sourceUrl ?? null),
        license: frozenIdentity.success ? frozenIdentity.data.license : (entity?.license ?? null),
        openWeights: frozenIdentity.success
          ? frozenIdentity.data.openWeights
          : (entity?.openWeights ?? null),
        sources: frozenSources.success ? frozenSources.data : [],
        slug: entry.entity,
        githubUrl: fullName
          ? `https://github.com/${fullName}`
          : chart === 'github' || chart === 'rising'
            ? (entity?.sourceUrl ?? null)
            : null,
        description: entity?.description ?? ('description' in project ? project.description : null),
        stars: entry.metrics['stars'] ?? null,
        stars7d: entry.metrics['stars7d'] ?? null,
        growthPercentage: entry.metrics['growth'] ?? null,
        momentumScore: entry.score,
        metrics: entry.metrics,
        dimensions: entry.dimensions,
        provenance: metadata,
      };
    }),
  };
}
export type ChartsApiResult<T> =
  { ok: true; response: Response; data: T } | { ok: false; response: Response };

export async function chartsApiResponse<T>(read: () => Promise<T>): Promise<ChartsApiResult<T>> {
  try {
    const data = await read();
    return {
      ok: true,
      data,
      response: Response.json(data, {
        headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
      }),
    };
  } catch (error) {
    console.error(
      'SANDBOX CHARTS public API unavailable:',
      error instanceof Error ? error.name : 'unknown',
    );
    return {
      ok: false,
      response: Response.json(
        { status: 'unavailable', error: 'Les données sont temporairement indisponibles.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      ),
    };
  }
}
