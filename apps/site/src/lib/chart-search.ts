import { eq, inArray, isNotNull } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, hasDatabaseConfiguration } from '../db/client.ts';
import { chartEntities, githubProjects, weeklyChartEditions } from '../db/schema.ts';
import { currentChartSearchHits, type ChartSearchHit } from '../domain/chart-search.ts';
import { editionIdSchema, slugSchema } from '../domain/schema.ts';

const entrySchema = z.object({
  entity: slugSchema,
  rank: z.number().int().min(1),
});

function editionEntries(payload: unknown): { entity: string; rank: number }[] {
  if (payload === null || typeof payload !== 'object' || !('entries' in payload)) return [];
  const entries = z.array(z.unknown()).safeParse(payload.entries);
  if (!entries.success) return [];
  return entries.data.flatMap((item) => {
    const entry = entrySchema.safeParse(item);
    return entry.success ? [entry.data] : [];
  });
}

/** Derniers Tops publiés. Une base absente ou illisible laisse la recherche éditoriale répondre. */
export async function loadCurrentChartSearchHits(): Promise<ChartSearchHit[]> {
  if (!hasDatabaseConfiguration()) return [];
  try {
    const rows = await getDb()
      .select({
        chart: weeklyChartEditions.chart,
        week: weeklyChartEditions.week,
        payload: weeklyChartEditions.payload,
      })
      .from(weeklyChartEditions)
      .where(isNotNull(weeklyChartEditions.publishedAt));
    const editions = rows.flatMap((row) => {
      const week = editionIdSchema.safeParse(row.week);
      if (!week.success || !['github', 'rising', 'skills', 'models'].includes(row.chart)) return [];
      const entries = editionEntries(row.payload);
      return [{ chart: row.chart, week: week.data, entries }];
    });
    const slugs = [
      ...new Set(editions.flatMap((edition) => edition.entries.map((entry) => entry.entity))),
    ];
    if (!slugs.length) return [];
    const found = await getDb()
      .select({
        slug: chartEntities.slug,
        name: chartEntities.name,
        description: chartEntities.description,
        organization: chartEntities.organization,
        sourceUrl: chartEntities.sourceUrl,
        repoId: githubProjects.id,
        repoFullName: githubProjects.fullName,
      })
      .from(chartEntities)
      .leftJoin(githubProjects, eq(githubProjects.entityId, chartEntities.id))
      .where(inArray(chartEntities.slug, slugs));
    const entities = new Map<string, (typeof found)[number]>();
    for (const row of found) if (!entities.has(row.slug)) entities.set(row.slug, row);
    return currentChartSearchHits(
      editions,
      [...entities.values()].map((row) => ({
        slug: row.slug,
        name: row.name,
        description: row.description,
        organization: row.organization,
        identifiers: [row.sourceUrl, ...(row.repoFullName ? [row.repoFullName] : [])],
        href: row.repoId ? `/charts/project/${row.slug}` : `/charts/entity/${row.slug}`,
      })),
    );
  } catch (error) {
    console.error(
      'Chart search index unavailable:',
      error instanceof Error ? error.name : 'unknown',
    );
    return [];
  }
}
