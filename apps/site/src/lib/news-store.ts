import { z } from 'zod';
import { and, asc, desc, eq, gt, gte, lt, or, sql } from 'drizzle-orm';
import { NEWS_MEDIA } from '@/domain/news-media';
import { newsSourceMatches } from '@/domain/news-source';
import {
  newsIngestionRequestSchema,
  newsItemIsFresh,
  publishedNewsItemSchema,
  type NewsIngestionRequest,
} from '@/domain/news-publishing';
import { NEWS_PAGE_SIZE, type NewsCursor, type NewsFeed } from '@/domain/news-preview';
import { getDb, hasDatabaseConfiguration } from '@/db/client';
import { newsItems, newsSourceStatus } from '@/db/schema';

export class NewsStorageUnavailableError extends Error {
  constructor() {
    super('SANDBOX News attend Postgres et la migration 0016.');
  }
}

export function newsPublicEnabled(): boolean {
  return process.env['SANDBOX_NEWS_PUBLIC'] === '1';
}

function requireNewsDatabase(): void {
  if (!hasDatabaseConfiguration()) throw new NewsStorageUnavailableError();
}

function publicationRequest(value: unknown): NewsIngestionRequest {
  const parsed = newsIngestionRequestSchema.safeParse(value);
  if (!parsed.success) throw new Error('Lot SANDBOX News invalide.');
  const now = new Date(parsed.data.checkedAt);
  if (!Number.isFinite(now.getTime())) throw new Error('Date de collecte SANDBOX News invalide.');
  const ids = new Set(parsed.data.sources.map((source) => source.id));
  for (const entry of parsed.data.items) {
    const sourceId = entry.item.id.split(':', 1)[0] ?? '';
    const source = NEWS_MEDIA.find((media) => media.id === sourceId);
    const sourceMatches =
      !!source && ids.has(source.id) && newsSourceMatches(source, entry.item.id, entry.item.url);
    if (!sourceMatches) throw new Error('Source de fiche SANDBOX News absente.');
    if (!newsItemIsFresh(entry.item, now))
      throw new Error('Une fiche SANDBOX News sort de sa fenêtre de fraîcheur.');
  }
  return parsed.data;
}

/** Ajoute les fiches une seule fois et conserve le dernier état observé des sources. */
export async function publishNewsBatch(value: unknown): Promise<{ inserted: number }> {
  requireNewsDatabase();
  const request = publicationRequest(value);
  const db = getDb();
  return db.transaction(async (tx) => {
    let inserted = 0;
    if (request.items.length) {
      const rows = await tx
        .insert(newsItems)
        .values(
          request.items.map(({ item, sourceExcerptHash }) => ({
            id: item.id,
            canonicalUrl: item.url,
            sourceId: item.id.split(':', 1)[0] ?? '',
            sourceName: item.project,
            publishedAt: item.publishedAt,
            category: item.category,
            payload: item,
            sourceExcerptHash: sourceExcerptHash ?? null,
          })),
        )
        .onConflictDoNothing({ target: newsItems.canonicalUrl })
        .returning({ id: newsItems.id });
      inserted = rows.length;
    }

    await tx
      .insert(newsSourceStatus)
      .values(
        request.sources.map((source) => ({
          sourceId: source.id,
          sourceName: source.name,
          sourceUrl: source.url,
          ok: source.ok,
          reason: source.reason ?? null,
          checkedAt: request.checkedAt,
        })),
      )
      .onConflictDoUpdate({
        target: newsSourceStatus.sourceId,
        set: {
          sourceName: sql`excluded.source_name`,
          sourceUrl: sql`excluded.source_url`,
          ok: sql`excluded.ok`,
          reason: sql`excluded.reason`,
          checkedAt: sql`excluded.checked_at`,
          updatedAt: sql`now()`,
        },
        setWhere: sql`excluded.checked_at >= ${newsSourceStatus.checkedAt}`,
      });

    return { inserted };
  });
}

/** URLs déjà reçues, pour éviter de re-rédiger les mêmes nouvelles à chaque heure. */
export async function knownNewsUrls(now = new Date()): Promise<string[]> {
  requireNewsDatabase();
  const since = new Date(now.getTime() - 14 * 86_400_000).toISOString();
  const rows = await getDb()
    .select({ url: newsItems.canonicalUrl })
    .from(newsItems)
    .where(gte(newsItems.publishedAt, since))
    .orderBy(desc(newsItems.publishedAt))
    .limit(1000);
  return rows.map((row) => row.url);
}

export async function readPublishedNews(now = new Date(), cursor?: NewsCursor): Promise<NewsFeed> {
  requireNewsDatabase();
  const [itemRows, sourceRows, publicationRows] = await Promise.all([
    getDb()
      .select({ payload: newsItems.payload, publishedAt: newsItems.publishedAt, id: newsItems.id })
      .from(newsItems)
      .where(
        cursor
          ? or(
              lt(newsItems.publishedAt, cursor.publishedAt),
              and(eq(newsItems.publishedAt, cursor.publishedAt), lt(newsItems.id, cursor.id)),
            )
          : undefined,
      )
      .orderBy(desc(newsItems.publishedAt), desc(newsItems.id))
      .limit(NEWS_PAGE_SIZE + 1),
    getDb().select().from(newsSourceStatus),
    getDb()
      .select({ lastPublishedAt: sql<string | null>`max(${newsItems.createdAt})` })
      .from(newsItems),
  ]);
  const page = itemRows.slice(0, NEWS_PAGE_SIZE);
  const last = page.at(-1);
  const items = page.flatMap((row) => {
    const parsed = publishedNewsItemSchema.safeParse(row.payload);
    if (!parsed.success || Date.parse(parsed.data.publishedAt) > now.getTime()) {
      console.error('SANDBOX News : une fiche stockée est invalide.');
      return [];
    }
    return [parsed.data];
  });
  const sourcesById = new Map(sourceRows.map((source) => [source.sourceId, source]));
  const sources = NEWS_MEDIA.flatMap((media) => {
    const source = sourcesById.get(media.id);
    return source
      ? [
          {
            name: source.sourceName,
            url: source.sourceUrl,
            ok: source.ok,
            ...(source.reason ? { reason: source.reason } : {}),
          },
        ]
      : [];
  });
  const checkedAt = sourceRows
    .map((source) => source.checkedAt)
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
  return {
    checkedAt: checkedAt ? new Date(checkedAt).toISOString() : null,
    lastPublishedAt: publicationRows[0]?.lastPublishedAt
      ? new Date(publicationRows[0].lastPublishedAt).toISOString()
      : null,
    sources,
    items,
    nextCursor:
      itemRows.length > NEWS_PAGE_SIZE && last
        ? { publishedAt: last.publishedAt, id: last.id }
        : null,
  };
}

export async function latestNewsPublicationTime(): Promise<string | undefined> {
  requireNewsDatabase();
  const row = await getDb()
    .select({ publishedAt: newsItems.publishedAt })
    .from(newsItems)
    .orderBy(desc(newsItems.publishedAt))
    .limit(1);
  return row[0]?.publishedAt;
}

/** Les fiches françaises sont leur propre file durable de traductions manquantes. */
export async function readNewsTranslationBacklog(after?: string) {
  requireNewsDatabase();
  const rows = await getDb()
    .select({ payload: newsItems.payload, id: newsItems.id })
    .from(newsItems)
    .where(
      and(
        after ? gt(newsItems.id, after) : undefined,
        sql`not (${newsItems.payload}->'titles' ?& array['en','es-ES','de-DE'])`,
      ),
    )
    .orderBy(asc(newsItems.id))
    .limit(21);
  return {
    items: rows.slice(0, 20).map((row) => publishedNewsItemSchema.parse(row.payload)),
    next: rows.length > 20 ? (rows[19]?.id ?? null) : null,
  };
}

/** Complète les langues sans réécrire le français ni la date de publication. */
export async function completeNewsTranslations(value: unknown): Promise<{ updated: number }> {
  requireNewsDatabase();
  const items = z.array(publishedNewsItemSchema).max(20).parse(value);
  return getDb().transaction(async (tx) => {
    let updated = 0;
    for (const incoming of items) {
      const [row] = await tx
        .select()
        .from(newsItems)
        .where(eq(newsItems.canonicalUrl, incoming.url))
        .for('update');
      if (!row) continue;
      const saved = publishedNewsItemSchema.parse(row.payload);
      if (
        saved.editorialSourceHash !== incoming.editorialSourceHash ||
        saved.titles['fr-FR'] !== incoming.titles['fr-FR'] ||
        JSON.stringify(saved.synopses['fr-FR']) !== JSON.stringify(incoming.synopses['fr-FR'])
      )
        continue;
      const titles = { ...saved.titles };
      const synopses = { ...saved.synopses };
      let changed = false;
      for (const locale of ['en', 'es-ES', 'de-DE'] as const) {
        if (titles[locale] || !incoming.titles[locale] || !incoming.synopses[locale]) continue;
        titles[locale] = incoming.titles[locale];
        synopses[locale] = incoming.synopses[locale];
        changed = true;
      }
      if (!changed) continue;
      await tx
        .update(newsItems)
        .set({ payload: publishedNewsItemSchema.parse({ ...saved, titles, synopses }) })
        .where(eq(newsItems.id, row.id));
      updated++;
    }
    return { updated };
  });
}
