import { randomUUID } from 'node:crypto';
import { and, asc, eq, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { getDb, hasDatabaseConfiguration } from '@/db/client';
import { newsCandidates, newsItems } from '@/db/schema';
import {
  newsCandidateSchema,
  NEWS_PROCESSING_BATCH_SIZE,
  NEWS_GENERATION_BATCH_SIZE,
  NEWS_LEASE_MINUTES,
  type NewsCandidate,
} from '@/domain/news-queue';

export async function enqueueNewsCandidates(items: readonly NewsCandidate[]): Promise<number> {
  if (!hasDatabaseConfiguration()) throw new Error('Stockage News absent.');
  const validated = items.map((item) => newsCandidateSchema.parse(item));
  if (!validated.length) return 0;
  const now = Date.now();
  if (
    validated.some(
      (item) =>
        Date.parse(item.publishedAt) > now + 300_000 ||
        Date.parse(item.publishedAt) < now - 14 * 86_400_000,
    )
  )
    throw new Error('Candidat News hors fenêtre de collecte.');
  const published = await getDb()
    .select({ url: newsItems.canonicalUrl })
    .from(newsItems)
    .where(
      inArray(
        newsItems.canonicalUrl,
        validated.map((item) => item.url),
      ),
    );
  const known = new Set(published.map((row) => row.url));
  const pending = validated.filter((item) => !known.has(item.url));
  if (!pending.length) return 0;
  const inserted = await getDb()
    .insert(newsCandidates)
    .values(
      pending.map((item) => ({
        canonicalUrl: item.url,
        sourceId: item.id.split(':', 1)[0] ?? '',
        payload: item,
      })),
    )
    .onConflictDoNothing()
    .returning({ url: newsCandidates.canonicalUrl });
  return inserted.length;
}

export async function readPendingNewsCandidates(): Promise<NewsCandidate[]> {
  if (!hasDatabaseConfiguration()) throw new Error('Stockage News absent.');
  const rows = await getDb()
    .select({ payload: newsCandidates.payload })
    .from(newsCandidates)
    .leftJoin(newsItems, eq(newsCandidates.canonicalUrl, newsItems.canonicalUrl))
    .where(
      and(
        eq(newsCandidates.status, 'pending'),
        lt(newsCandidates.attempts, 3),
        sql`(${newsCandidates.payload}->>'publishedAt') >= ${new Date(Date.now() - 14 * 86_400_000).toISOString()}`,
        lte(newsCandidates.nextAttemptAt, new Date().toISOString()),
        or(
          isNull(newsCandidates.leaseExpiresAt),
          lte(newsCandidates.leaseExpiresAt, new Date().toISOString()),
        ),
        isNull(newsItems.id),
      ),
    )
    .orderBy(asc(newsCandidates.createdAt), asc(newsCandidates.canonicalUrl))
    .limit(NEWS_PROCESSING_BATCH_SIZE);
  return rows.map((row) => newsCandidateSchema.parse(row.payload));
}

/** La réservation et le compteur survivent à l'arrêt brutal d'un runner. */
export async function claimNewsCandidates(): Promise<{ leaseId: string; items: NewsCandidate[] }> {
  if (!hasDatabaseConfiguration()) throw new Error('Stockage News absent.');
  const leaseId = randomUUID();
  const now = new Date().toISOString();
  const items = await getDb().transaction(async (tx) => {
    await tx
      .update(newsCandidates)
      .set({ status: 'rejected', leaseId: null, leaseExpiresAt: null, updatedAt: now })
      .where(
        and(
          eq(newsCandidates.status, 'pending'),
          sql`${newsCandidates.attempts} >= 3`,
          or(isNull(newsCandidates.leaseExpiresAt), lte(newsCandidates.leaseExpiresAt, now)),
        ),
      );
    const selected = await tx
      .select({ url: newsCandidates.canonicalUrl })
      .from(newsCandidates)
      .leftJoin(newsItems, eq(newsCandidates.canonicalUrl, newsItems.canonicalUrl))
      .where(
        and(
          eq(newsCandidates.status, 'pending'),
          lt(newsCandidates.attempts, 3),
          lte(newsCandidates.nextAttemptAt, now),
          or(isNull(newsCandidates.leaseExpiresAt), lte(newsCandidates.leaseExpiresAt, now)),
          sql`(${newsCandidates.payload}->>'publishedAt') >= ${new Date(Date.now() - 14 * 86_400_000).toISOString()}`,
          isNull(newsItems.id),
        ),
      )
      .orderBy(asc(newsCandidates.createdAt), asc(newsCandidates.canonicalUrl))
      .limit(NEWS_GENERATION_BATCH_SIZE)
      .for('update', { of: newsCandidates, skipLocked: true });
    if (!selected.length) return [];
    return tx
      .update(newsCandidates)
      .set({
        leaseId,
        leaseExpiresAt: new Date(Date.now() + NEWS_LEASE_MINUTES * 60_000).toISOString(),
        attempts: sql`${newsCandidates.attempts} + 1`,
        updatedAt: now,
      })
      .where(
        inArray(
          newsCandidates.canonicalUrl,
          selected.map((row) => row.url),
        ),
      )
      .returning({ payload: newsCandidates.payload });
  });
  return { leaseId, items: items.map((row) => newsCandidateSchema.parse(row.payload)) };
}

export async function completeNewsCandidates(
  published: readonly string[],
  skipped: readonly string[],
  leaseId: string,
): Promise<void> {
  await getDb().transaction(async (tx) => {
    if (published.length)
      await tx
        .update(newsCandidates)
        .set({
          status: 'published',
          leaseId: null,
          leaseExpiresAt: null,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(newsCandidates.leaseId, leaseId),
            inArray(newsCandidates.canonicalUrl, [...published]),
          ),
        );
    const rejected = skipped.filter((url) => !published.includes(url));
    if (rejected.length)
      await tx
        .update(newsCandidates)
        .set({
          status: sql`case when ${newsCandidates.attempts} >= 3 then 'rejected' else 'pending' end`,
          leaseId: null,
          leaseExpiresAt: null,
          nextAttemptAt: new Date(Date.now() + 24 * 3_600_000).toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(newsCandidates.status, 'pending'),
            eq(newsCandidates.leaseId, leaseId),
            inArray(newsCandidates.canonicalUrl, rejected),
          ),
        );
  });
}
