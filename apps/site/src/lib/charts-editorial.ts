import { randomUUID } from 'node:crypto';
import { desc, eq, inArray } from 'drizzle-orm';
import { getDb } from '../db/client.ts';
import { chartEntities, chartsEditorial, weeklyChartEditions } from '../db/schema.ts';
import { chartEditionSchema, type ChartEdition } from '../domain/schema.ts';
import { ContentConflictError } from './admin-content-conflict.ts';

export async function readChartsEditorial(published = true) {
  return getDb()
    .select({
      chart: weeklyChartEditions.chart,
      editionId: weeklyChartEditions.id,
      payload: chartsEditorial.payload,
    })
    .from(chartsEditorial)
    .innerJoin(weeklyChartEditions, eq(weeklyChartEditions.id, chartsEditorial.editionId))
    .where(eq(chartsEditorial.layer, published ? 'published' : 'draft'));
}
export async function readAdminChartEdition(id?: string) {
  const edition = (
    await getDb()
      .select()
      .from(weeklyChartEditions)
      .where(id ? eq(weeklyChartEditions.id, id) : eq(weeklyChartEditions.chart, 'github'))
      .orderBy(desc(weeklyChartEditions.week))
      .limit(1)
  )[0];
  if (!edition) return null;
  const [notes, entities] = await Promise.all([
    getDb().select().from(chartsEditorial).where(eq(chartsEditorial.editionId, edition.id)),
    getDb()
      .select()
      .from(chartEntities)
      .where(
        inArray(
          chartEntities.slug,
          edition.payload.entries.map((entry) => entry.entity),
        ),
      ),
  ]);
  const current =
    notes.find((row) => row.layer === 'draft') ?? notes.find((row) => row.layer === 'published');
  return {
    id: edition.id,
    week: edition.week,
    chart: edition.chart,
    published: edition.publishedAt !== null,
    etag: current?.etag ?? null,
    editorial: chartEditionSchema.parse(current?.payload ?? { week: edition.week }),
    entries: edition.payload.entries.map((entry) => {
      const entity = entities.find((item) => item.slug === entry.entity);
      return {
        ...entry,
        name: entity?.name ?? entry.entity,
        description: entity?.description ?? '',
        category: entity?.category ?? 'Other',
      };
    }),
  };
}
export async function writeChartsEditorial(
  editionId: string,
  value: unknown,
  layer: 'draft' | 'published',
  expectedEtag: string | null,
  author = 'SANDBOX',
): Promise<string> {
  let payload: ChartEdition = chartEditionSchema.parse(value);
  const slugs = [
    ...new Set([...payload.insights, ...payload.watchlist].map((item) => item.entity)),
  ];
  const etag = randomUUID();
  await getDb().transaction(async (tx) => {
    // Le verrou de l'édition sérialise aussi la première écriture éditoriale.
    const edition = (
      await tx
        .select()
        .from(weeklyChartEditions)
        .where(eq(weeklyChartEditions.id, editionId))
        .for('update')
    )[0];
    if (edition?.week !== payload.week)
      throw new Error('Édition introuvable ou semaine incohérente.');
    if (slugs.length) {
      const entities = await tx
        .select({ slug: chartEntities.slug })
        .from(chartEntities)
        .where(inArray(chartEntities.slug, slugs));
      if (entities.length !== slugs.length)
        throw new Error('Une fiche éditoriale est inconnue du catalogue.');
    }
    const existing = await tx
      .select()
      .from(chartsEditorial)
      .where(eq(chartsEditorial.editionId, editionId));
    const current =
      existing.find((row) => row.layer === 'draft') ??
      existing.find((row) => row.layer === 'published');
    if ((current?.etag ?? null) !== expectedEtag) throw new ContentConflictError();
    payload = chartEditionSchema.parse({
      ...payload,
      insights: payload.insights.map((insight) => {
        const original = current?.payload.insights.find((item) => item.entity === insight.entity);
        return {
          ...insight,
          author: original?.sandboxTake === insight.sandboxTake ? original.author : author,
        };
      }),
    });
    const save = async (target: 'draft' | 'published') =>
      tx
        .insert(chartsEditorial)
        .values({ editionId, layer: target, payload, etag })
        .onConflictDoUpdate({
          target: [chartsEditorial.editionId, chartsEditorial.layer],
          set: { payload, etag, updatedAt: new Date().toISOString() },
        });
    await save('draft');
    if (layer === 'published') await save('published');
  });
  return etag;
}
