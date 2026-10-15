import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as schema from '../src/db/schema.ts';
import { seedAwardFixtures } from '../scripts/fixtures/seed-awards.ts';
import {
  assignClosedAwards,
  readPublicAward,
  readPublicAwards,
  withdrawPublicAward,
  readAwardBadgeSlugs,
  readAwardSitemapEntries,
} from '../src/lib/awards-store.ts';
import { assignClosedRisingStars, badgeEvidenceHash } from '../src/lib/badges-store.ts';
import type { AwardType } from '../src/domain/awards.ts';
import { GET as badgeRoute } from '../src/app/badges/awards/[edition]/route.ts';
import { GET as imageRoute } from '../src/app/api/awards/edition/[id]/image/route.ts';
import { generateMetadata } from '../src/app/(fr)/charts/awards/edition/[id]/page.tsx';

const pg = new PGlite();
const db = drizzle(pg, { schema });
vi.mock('../src/db/client.ts', () => ({ getDb: () => db, hasDatabaseConfiguration: () => true }));
const now = new Date('2026-01-05T03:00:00Z');
beforeAll(async () => {
  for (const migration of [
    '0002_sandbox_charts',
    '0003_ranking_catalog_localization',
    '0005_external_chart_sources',
    '0007_daily_chart_editions',
    '0009_badges_awards',
    '0010_extended_awards',
  ])
    for (const statement of readFileSync(`drizzle/${migration}.sql`, 'utf8').split(
      '--> statement-breakpoint',
    ))
      if (statement.trim()) await pg.exec(statement);
  await seedAwardFixtures();
}, 30000);
afterAll(() => pg.close());
afterEach(() => pg.exec('TRUNCATE badge_award_withdrawals, badge_awards'));
const cases: [AwardType, string, number][] = [
  ['github-category', '2025-W52', 2],
  ['biggest-mover', '2025-W52', 1],
  ['skill-week', '2025-W52', 1],
  ['best-model', '2025-W52', 1],
  ['rookie-month', '2025-12', 1],
  ['annual', '2025', 4],
];
async function populate() {
  for (const [type, period] of cases) {
    const result = await assignClosedAwards({ type, period, now });
    expect(result.errors).toEqual([]);
  }
  await assignClosedRisingStars({ week: '2025-W52', now });
}

describe('attributions des six extensions dans Postgres', () => {
  it('simule sans écriture et attribue chaque type depuis ses sources complètes', async () => {
    const before = await db.select().from(schema.weeklyChartEditions);
    for (const [type, period, count] of cases) {
      const dry = await assignClosedAwards({ type, period, now, dryRun: true });
      expect(dry.failed).toBe(0);
      expect(dry.eligible).toBe(count);
      expect(dry.created).toBe(0);
      const actual = await assignClosedAwards({ type, period, now });
      expect(actual.errors).toEqual([]);
      expect(actual.created).toBe(count);
    }
    const rows = await readPublicAwards({ limit: 260 });
    expect(rows).toHaveLength(10);
    expect(
      rows
        .filter((row) => row.chart === 'skills' || row.chart === 'models')
        .every((row) => row.githubId === null),
    ).toBe(true);
    expect(await db.select().from(schema.weeklyChartEditions)).toEqual(before);
    expect((await assignClosedRisingStars({ week: '2025-W52', now })).created).toBe(1);
  });
  it('conserve les identifiants et preuves après relance, et borne les lectures publiques', async () => {
    await populate();
    const before = await db.select().from(schema.badgeAwards);
    const result = await Promise.all([
      assignClosedAwards({ type: 'annual', period: '2025', now }),
      assignClosedAwards({ type: 'annual', period: '2025', now }),
    ]);
    expect(result.reduce((sum, item) => sum + item.created, 0)).toBe(0);
    expect(await db.select().from(schema.badgeAwards)).toEqual(before);
    const rows = await readPublicAwards({ limit: 3 });
    expect(rows).toHaveLength(3);
    const last = rows.at(-1);
    if (!last) throw new Error('Fixture absente');
    const next = await readPublicAwards({ before: last.id, limit: 3 });
    expect(next.every((row) => !rows.some((prior) => prior.id === row.id))).toBe(true);
    const stored = before[0];
    if (!stored) throw new Error('Fixture absente');
    expect(badgeEvidenceHash(stored.evidence)).toBe(stored.evidenceHash);
    await expect(
      db.update(schema.badgeAwards).set({ score: 0 }).where(eq(schema.badgeAwards.id, stored.id)),
    ).rejects.toThrow();
  });
  it('refuse en SQL une preuve agrégée incomplète et un faux premier modèle', async () => {
    await populate();
    const rows = await db.select().from(schema.badgeAwards);
    const monthly = rows.find((row) => row.awardType === 'rookie-month');
    const model = rows.find((row) => row.awardType === 'best-model');
    if (!monthly || !model) throw new Error('Fixtures absentes');
    const { period: generatedPeriod, ...monthInsert } = monthly;
    expect(generatedPeriod).toBe(monthly.extendedPeriod);
    const evidence = { ...monthly.evidence, sourceEditionIds: [monthly.editionId] };
    await expect(
      db.insert(schema.badgeAwards).values({
        ...monthInsert,
        id: randomUUID(),
        evidence,
        evidenceHash: badgeEvidenceHash(evidence),
      }),
    ).rejects.toMatchObject({
      cause: {
        message: 'Aggregate award requires a complete valid period',
      },
    });
    const { period: generatedModelPeriod, ...modelInsert } = model;
    expect(generatedModelPeriod).toBe(model.extendedPeriod);
    await expect(
      db
        .insert(schema.badgeAwards)
        .values({ ...modelInsert, id: randomUUID(), entityId: 'models-b', rank: 2, score: 89 }),
    ).rejects.toMatchObject({
      cause: { message: 'Award requires the official first place' },
    });
  });
  it('retire sans réécrire ni réattribuer, et conserve la compatibilité Rising', async () => {
    await populate();
    const [row] = await readPublicAwards({ type: 'best-model' });
    if (!row) throw new Error('Fixture absente');
    expect(
      await withdrawPublicAward(
        row.id,
        'Retrait de test explicitement documenté.',
        'test-operator',
      ),
    ).toBe(1);
    expect(
      await withdrawPublicAward(row.id, 'Seconde demande sans remplacement.', 'test-operator'),
    ).toBe(0);
    expect((await readPublicAward(row.id))?.withdrawnAt).not.toBeNull();
    const [original] = await db
      .select()
      .from(schema.badgeAwards)
      .where(eq(schema.badgeAwards.id, row.id));
    if (!original) throw new Error('Fixture absente');
    const { period, ...insert } = original;
    expect(period).toBe(row.period);
    await expect(
      db.insert(schema.badgeAwards).values({ ...insert, id: randomUUID() }),
    ).rejects.toMatchObject({ cause: { message: 'Award source has a recorded withdrawal' } });
    expect((await readAwardSitemapEntries()).some((entry) => entry.path.endsWith(row.id))).toBe(
      false,
    );
    expect(
      (await assignClosedAwards({ type: 'best-model', period: row.period, now })).created,
    ).toBe(0);
    const [rising] = await db
      .select()
      .from(schema.badgeAwards)
      .where(eq(schema.badgeAwards.awardType, 'rising-star'));
    expect(rising?.week).toBe('2025-W52');
    expect(rising?.period).toBe('2025-W52');
    expect(rising?.extendedPeriod).toBeNull();
  });
  it('résiste à deux créations concurrentes depuis une table vide', async () => {
    const results = await Promise.all([
      assignClosedAwards({ type: 'annual', period: '2025', now }),
      assignClosedAwards({ type: 'annual', period: '2025', now }),
    ]);
    expect(results.flatMap((result) => result.errors)).toEqual([]);
    expect(results.reduce((sum, result) => sum + result.created, 0)).toBe(4);
    expect(await readPublicAwards({ type: 'annual' })).toHaveLength(4);
  });
  it('exclut une source retirée des nouvelles agrégations sans bloquer les autres classements', async () => {
    await assignClosedAwards({ type: 'best-model', period: '2025-W52', now });
    const [model] = await readPublicAwards({ type: 'best-model' });
    if (!model) throw new Error('Fixture absente');
    await withdrawPublicAward(model.id, 'Source de test retirée et documentée.', 'operator');
    expect((await assignClosedAwards({ type: 'annual', period: '2025', now })).created).toBe(3);
    expect(
      (await readPublicAwards({ type: 'annual' })).some((award) => award.chart === 'models'),
    ).toBe(false);
  });
  it('sert les SVG et PNG publics, leurs caches et leurs retraits par UUID', async () => {
    await assignClosedAwards({ type: 'skill-week', period: '2025-W52', now });
    const [award] = await readPublicAwards({ type: 'skill-week' });
    if (!award) throw new Error('Fixture absente');
    const request = new Request(`https://sandbox.test/badges/awards/${award.id}.svg`);
    const params = Promise.resolve({ edition: `${award.id}.svg` });
    expect(await readAwardBadgeSlugs([award.slug, 'not-awarded'])).toEqual([award.slug]);
    const response = await badgeRoute(request, { params });
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('SKILL OF THE WEEK');
    expect(response.headers.get('cache-control')).toContain('max-age=86400');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(
      (
        await badgeRoute(
          new Request(request.url, {
            headers: { 'if-none-match': response.headers.get('etag') ?? '' },
          }),
          { params },
        )
      ).status,
    ).toBe(304);
    expect(
      await (await badgeRoute(new Request(request.url, { method: 'HEAD' }), { params })).text(),
    ).toBe('');
    expect(
      (await badgeRoute(request, { params: Promise.resolve({ edition: 'invalid.svg' }) })).status,
    ).toBe(400);
    const missingId = randomUUID();
    expect(
      (await badgeRoute(request, { params: Promise.resolve({ edition: `${missingId}.svg` }) }))
        .status,
    ).toBe(404);
    const imageParams = Promise.resolve({ id: award.id });
    const image = await imageRoute(request, { params: imageParams });
    expect(image.status).toBe(200);
    expect(image.headers.get('content-type')).toBe('image/png');
    expect(new Uint8Array(await image.arrayBuffer()).slice(0, 8)).toEqual(
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    expect(
      (
        await imageRoute(
          new Request(request.url, {
            headers: { 'if-none-match': image.headers.get('etag') ?? '' },
          }),
          { params: imageParams },
        )
      ).status,
    ).toBe(304);
    const metadata = await generateMetadata({ params: imageParams });
    expect(JSON.stringify(metadata.openGraph?.images)).toContain(
      `/api/awards/edition/${award.id}/image`,
    );
    await withdrawPublicAward(award.id, 'Retrait du badge de test documenté.', 'operator');
    expect(await readAwardBadgeSlugs([award.slug])).toEqual([]);
    const retired = await badgeRoute(request, { params });
    expect(retired.status).toBe(410);
    expect(await retired.text()).not.toContain('SKILL OF THE WEEK');
    expect(
      (await imageRoute(new Request(request.url, { method: 'HEAD' }), { params: imageParams }))
        .status,
    ).toBe(410);
    await pg.exec('ALTER TABLE badge_awards RENAME TO badge_awards_offline');
    try {
      const unavailable = await badgeRoute(request, { params });
      expect(unavailable.status).toBe(503);
      expect(unavailable.headers.get('cache-control')).toBe('no-store');
      const unavailableImage = await imageRoute(request, { params: imageParams });
      expect(unavailableImage.status).toBe(503);
      expect(unavailableImage.headers.get('cache-control')).toBe('no-store');
    } finally {
      await pg.exec('ALTER TABLE badge_awards_offline RENAME TO badge_awards');
    }
  });
});
