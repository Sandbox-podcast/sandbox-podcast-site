import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import * as schema from '../src/db/schema';
import { newsCandidateSchema } from '../src/domain/news-queue';

const pg = new PGlite();
const db = drizzle(pg, { schema });
vi.mock('../src/db/client', () => ({ getDb: () => db, hasDatabaseConfiguration: () => true }));
import {
  enqueueNewsCandidates,
  readPendingNewsCandidates,
  completeNewsCandidates,
  claimNewsCandidates,
} from '../src/lib/news-candidates-store';

function candidate(index = 0) {
  return newsCandidateSchema.parse({
    id: `rundown:/articles/fixture-${index}`,
    url: `https://www.therundown.ai/articles/fixture-${index}`,
    project: 'The Rundown AI',
    repository: 'www.therundown.ai',
    version: 'article',
    kind: 'article',
    headline: 'Fixture de collecte',
    publishedAt: new Date().toISOString(),
    category: 'models',
    prerelease: false,
    sourceExcerpt: 'Extrait public de test. '.repeat(20),
  });
}
beforeAll(async () => {
  for (const file of [
    '0016_sandbox_news_autopublishing',
    '0017_news_candidates',
    '0018_news_candidate_leases',
  ]) {
    for (const sql of readFileSync(join(process.cwd(), `drizzle/${file}.sql`), 'utf8').split(
      '--> statement-breakpoint',
    ))
      if (sql.trim()) await pg.exec(sql);
  }
});
afterEach(async () => {
  await db.delete(schema.newsCandidates);
});
afterAll(async () => {
  await pg.close();
});

describe('file News durable', () => {
  it('conserve toutes les nouveautés et les traite par lots sans doublon', async () => {
    const items = Array.from({ length: 45 }, (_, index) => candidate(index));
    expect(await enqueueNewsCandidates(items)).toBe(45);
    expect(await enqueueNewsCandidates(items)).toBe(0);
    const seen: string[] = [];
    for (let index = 0; index < 9; index++) {
      const { items: pending, leaseId } = await claimNewsCandidates();
      expect(pending).toHaveLength(5);
      seen.push(...pending.map((item) => item.url));
      await completeNewsCandidates(
        pending.map((item) => item.url),
        [],
        leaseId,
      );
    }
    expect(new Set(seen).size).toBe(45);
    expect(await readPendingNewsCandidates()).toHaveLength(0);
    expect(await db.select().from(schema.newsCandidates)).toHaveLength(45);
  });
  it('espace les rejets de 24 heures et les conserve après trois tentatives', async () => {
    const item = candidate();
    await enqueueNewsCandidates([item]);
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const { leaseId } = await claimNewsCandidates();
      await completeNewsCandidates([], [item.url], leaseId);
      const [row] = await db.select().from(schema.newsCandidates);
      expect(row?.attempts).toBe(attempt);
      expect(await readPendingNewsCandidates()).toHaveLength(0);
      await db
        .update(schema.newsCandidates)
        .set({ nextAttemptAt: new Date(Date.now() - 1000).toISOString() });
    }
    const [row] = await db.select().from(schema.newsCandidates);
    expect(row?.status).toBe('rejected');
    expect(await readPendingNewsCandidates()).toHaveLength(0);
    expect(await enqueueNewsCandidates([item])).toBe(0);
  });
  it('réserve sans doublon, reprend un crash et ignore un ancien accusé de fin', async () => {
    await enqueueNewsCandidates(Array.from({ length: 10 }, (_, index) => candidate(index)));
    const [first, second] = await Promise.all([claimNewsCandidates(), claimNewsCandidates()]);
    expect(new Set([...first.items, ...second.items].map((item) => item.url)).size).toBe(10);
    expect((await claimNewsCandidates()).items).toHaveLength(0);
    await db
      .update(schema.newsCandidates)
      .set({ leaseExpiresAt: new Date(Date.now() - 1000).toISOString() })
      .where(eq(schema.newsCandidates.leaseId, first.leaseId));
    const retry = await claimNewsCandidates();
    expect(retry.items).toHaveLength(5);
    await completeNewsCandidates(
      first.items.map((item) => item.url),
      [],
      first.leaseId,
    );
    const retriedRows = await db
      .select()
      .from(schema.newsCandidates)
      .where(eq(schema.newsCandidates.leaseId, retry.leaseId));
    expect(retriedRows).toHaveLength(5);
    expect(retriedRows.every((row) => row.attempts === 2 && row.status === 'pending')).toBe(true);
  });
  it('borne également les tentatives interrompues sans accusé de fin', async () => {
    await enqueueNewsCandidates([candidate()]);
    for (let attempt = 0; attempt < 3; attempt++) {
      expect((await claimNewsCandidates()).items).toHaveLength(1);
      await db
        .update(schema.newsCandidates)
        .set({ leaseExpiresAt: new Date(Date.now() - 1000).toISOString() });
    }
    expect((await claimNewsCandidates()).items).toHaveLength(0);
    const [row] = await db.select().from(schema.newsCandidates);
    expect(row).toMatchObject({ attempts: 3, status: 'rejected' });
  });
  it('ne laisse pas une entrée devenue trop ancienne bloquer les nouvelles', async () => {
    const item = candidate();
    await enqueueNewsCandidates([item]);
    await db
      .update(schema.newsCandidates)
      .set({ payload: { ...item, publishedAt: '2020-01-01' } })
      .where(eq(schema.newsCandidates.canonicalUrl, item.url));
    await enqueueNewsCandidates([candidate(1)]);
    expect((await readPendingNewsCandidates()).map((entry) => entry.url)).toEqual([
      candidate(1).url,
    ]);
    await expect(enqueueNewsCandidates([{ ...item, publishedAt: '2020-01-01' }])).rejects.toThrow(
      'fenêtre',
    );
  });
});
