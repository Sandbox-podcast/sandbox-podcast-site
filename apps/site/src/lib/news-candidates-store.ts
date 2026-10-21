import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray, notInArray, isNull, lt, lte, or, sql } from 'drizzle-orm';
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
    .orderBy(
      desc(sql`(${newsCandidates.payload}->>'publishedAt')::timestamptz`),
      asc(newsCandidates.createdAt),
      asc(newsCandidates.canonicalUrl),
    )
    .limit(NEWS_PROCESSING_BATCH_SIZE);
  return rows.map((row) => newsCandidateSchema.parse(row.payload));
}

export async function readNewsBacklog() {
  if (!hasDatabaseConfiguration()) throw new Error('Stockage News absent.');
  const now = new Date().toISOString();
  const [row] = await getDb()
    .select({
      pending: sql<number>`count(*)::int`,
      ready: sql<number>`count(*) filter (where
        ${newsCandidates.nextAttemptAt} <= ${now}
        and (${newsCandidates.leaseExpiresAt} is null or ${newsCandidates.leaseExpiresAt} <= ${now})
        and (${newsCandidates.payload}->>'publishedAt') >= ${new Date(Date.now() - 14 * 86_400_000).toISOString()}
        and not exists (select 1 from ${newsItems} where ${newsItems.canonicalUrl} = ${newsCandidates.canonicalUrl})
      )::int`,
      oldestPendingAt: sql<string | null>`min(${newsCandidates.createdAt})`,
    })
    .from(newsCandidates)
    .where(and(eq(newsCandidates.status, 'pending'), lt(newsCandidates.attempts, 3)));
  return {
    pending: row?.pending ?? 0,
    ready: row?.ready ?? 0,
    oldestPendingAt: row?.oldestPendingAt ? new Date(row.oldestPendingAt).toISOString() : null,
  };
}

/** La réservation et le compteur survivent à l'arrêt brutal d'un runner. */
export async function claimNewsCandidates(): Promise<{ leaseId: string; items: NewsCandidate[] }> {
  if (!hasDatabaseConfiguration()) throw new Error('Stockage News absent.');
  const leaseId = randomUUID();
  const now = new Date().toISOString();
  const items = await getDb().transaction(async (tx) => {
    await tx
      .update(newsCandidates)
      .set({ status: 'published', leaseId: null, leaseExpiresAt: null, updatedAt: now })
      .where(
        and(
          eq(newsCandidates.status, 'pending'),
          sql`exists (select 1 from ${newsItems} where ${newsItems.canonicalUrl} = ${newsCandidates.canonicalUrl})`,
        ),
      );
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
    const eligible = and(
      eq(newsCandidates.status, 'pending'),
      lt(newsCandidates.attempts, 3),
      lte(newsCandidates.nextAttemptAt, now),
      or(isNull(newsCandidates.leaseExpiresAt), lte(newsCandidates.leaseExpiresAt, now)),
      sql`(${newsCandidates.payload}->>'publishedAt') >= ${new Date(Date.now() - 14 * 86_400_000).toISOString()}`,
      isNull(newsItems.id),
    );
    // Quatre nouveautés, puis une place réservée au rattrapage de l'historique.
    const recent = await tx
      .select({ url: newsCandidates.canonicalUrl })
      .from(newsCandidates)
      .leftJoin(newsItems, eq(newsCandidates.canonicalUrl, newsItems.canonicalUrl))
      .where(eligible)
      .orderBy(
        desc(sql`(${newsCandidates.payload}->>'publishedAt')::timestamptz`),
        asc(newsCandidates.createdAt),
        asc(newsCandidates.canonicalUrl),
      )
      .limit(NEWS_GENERATION_BATCH_SIZE - 1)
      .for('update', { of: newsCandidates, skipLocked: true });
    const backlog = await tx
      .select({ url: newsCandidates.canonicalUrl })
      .from(newsCandidates)
      .leftJoin(newsItems, eq(newsCandidates.canonicalUrl, newsItems.canonicalUrl))
      .where(
        and(
          eligible,
          recent.length
            ? notInArray(
                newsCandidates.canonicalUrl,
                recent.map((row) => row.url),
              )
            : undefined,
        ),
      )
      .orderBy(asc(newsCandidates.createdAt), asc(newsCandidates.canonicalUrl))
      .limit(NEWS_GENERATION_BATCH_SIZE - recent.length)
      .for('update', { of: newsCandidates, skipLocked: true });
    const selected = [...recent, ...backlog];
    if (!selected.length) return [];
    const claimed = await tx
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
    const positions = new Map(selected.map((row, index) => [row.url, index]));
    return claimed.sort(
      (left, right) =>
        (positions.get(left.payload.url) ?? 0) - (positions.get(right.payload.url) ?? 0),
    );
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
