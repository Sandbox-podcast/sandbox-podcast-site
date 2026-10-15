import { cache } from 'react';
import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, hasDatabaseConfiguration } from '../db/client.ts';
import {
  chartEntities,
  chartEntitySources,
  githubProjects,
  weeklyChartEditions,
  weeklyRankings,
} from '../db/schema.ts';
import { slugSchema } from '../domain/schema.ts';

const publicUrl = z.url().refine((value) => value.startsWith('https://'));
export const awardEntityDetail = cache(async function awardEntityDetail(slug: string) {
  slugSchema.parse(slug);
  if (!hasDatabaseConfiguration()) return null;
  const db = getDb();
  const [entity] = await db
    .select()
    .from(chartEntities)
    .where(eq(chartEntities.slug, slug))
    .limit(1);
  if (!entity) return null;
  const [sources, rankings, github] = await Promise.all([
    db
      .select({
        provider: chartEntitySources.provider,
        label: chartEntitySources.label,
        url: chartEntitySources.url,
      })
      .from(chartEntitySources)
      .where(eq(chartEntitySources.entityId, entity.id)),
    db
      .select({
        chart: weeklyChartEditions.chart,
        date: weeklyChartEditions.week,
        rank: weeklyRankings.rank,
        score: weeklyRankings.score,
        scoringVersion: weeklyChartEditions.scoringVersion,
      })
      .from(weeklyRankings)
      .innerJoin(weeklyChartEditions, eq(weeklyChartEditions.id, weeklyRankings.editionId))
      .where(
        and(
          eq(weeklyRankings.entityId, entity.id),
          isNotNull(weeklyChartEditions.publishedAt),
          inArray(weeklyChartEditions.chart, ['skills', 'models']),
        ),
      )
      .orderBy(desc(weeklyChartEditions.week))
      .limit(30),
    db
      .select({ id: githubProjects.githubId })
      .from(githubProjects)
      .where(eq(githubProjects.entityId, entity.id))
      .limit(1),
  ]);
  if (!rankings.length && !github.length) return null;
  return {
    entity: { ...entity, sourceUrl: publicUrl.parse(entity.sourceUrl) },
    sources: sources.map((source) => ({ ...source, url: publicUrl.parse(source.url) })),
    rankings,
    isGithub: github.length > 0,
  };
});
