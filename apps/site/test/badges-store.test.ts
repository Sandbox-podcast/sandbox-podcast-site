import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as schema from '../src/db/schema.ts';
import { githubRepositorySchema, type DailyGithubSnapshot } from '../src/domain/github-charts.ts';
import {
  assignClosedRisingStars,
  badgeEvidenceHash,
  readAwardBadge,
  readBadgeAwards,
  readBadgeAwardEdition,
  readBadgeAwardSitemapEntries,
  readRankingBadge,
  withdrawBadgeAward,
} from '../src/lib/badges-store.ts';
import {
  saveDailyBatch,
  saveScorecardBatch,
  upsertDiscoveredRepositories,
} from '../src/lib/charts-store.ts';
import { calculateGithubWeek } from '../src/pipeline/github-jobs.ts';
import { GET as rankingRoute } from '../src/app/badges/github/[id]/rank.svg/route.ts';
import { GET as awardRoute } from '../src/app/badges/github/[id]/rising-star/[edition]/route.ts';
import { GET as awardImageRoute } from '../src/app/api/awards/[week]/image/route.ts';
import { generateMetadata as awardMetadata } from '../src/app/(fr)/charts/awards/[week]/page.tsx';
import { generateMetadata as localizedMetadata } from '../src/app/[locale]/[[...path]]/page.tsx';
import { absoluteUrl } from '../src/lib/seo.ts';

const pg = new PGlite();
const db = drizzle(pg, { schema });
vi.mock('../src/db/client.ts', () => ({ getDb: () => db, hasDatabaseConfiguration: () => true }));
const sunday = '2026-10-11';
const closed = new Date('2026-10-12T03:00:00Z');
const repo = (index: number, fullName = `sandbox-test/project-${index}`) =>
  githubRepositorySchema.parse({
    id: index + 1,
    name: fullName.split('/')[1],
    full_name: fullName,
    owner: { login: fullName.split('/')[0] },
    description: 'Fixture réservée aux tests',
    html_url: `https://github.com/${fullName}`,
    language: 'TypeScript',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: `${sunday}T00:00:00Z`,
    pushed_at: `${sunday}T00:00:00Z`,
    default_branch: 'main',
    archived: false,
    fork: false,
    stargazers_count: 2000,
    forks_count: 100,
    open_issues_count: 10,
  });
async function seed(publish = true) {
  await upsertDiscoveredRepositories(Array.from({ length: 20 }, (_, index) => repo(index)));
  await db.update(schema.githubProjects).set({ status: 'tracked' });
  const projects = await db
    .select()
    .from(schema.githubProjects)
    .orderBy(schema.githubProjects.githubId);
  const daily: DailyGithubSnapshot[] = projects.flatMap((project, index) =>
    ['2026-09-27', '2026-10-04', sunday].map((day, at) => ({
      projectId: project.id,
      date: day,
      stars: 1000 + (at === 0 ? 0 : at === 1 ? 100 : 300) * (index + 1),
      forks: 50 + at * 10,
      watchers: null,
      openIssues: 10,
      contributors: null,
      commits: 5,
      releases: null,
      pushedAt: `${day}T00:00:00Z`,
      collectedAt: `${day}T02:00:00Z`,
    })),
  );
  await saveDailyBatch(daily);
  await saveScorecardBatch(
    projects.map((project) => ({
      entityId: project.entityId,
      fullName: project.fullName,
      score: 7,
      overallScore: 7,
      checksUsed: 6,
      checkScores: {
        'Code-Review': 7,
        'Security-Policy': 7,
        'Dangerous-Workflow': 7,
        'Token-Permissions': 7,
        'Pinned-Dependencies': 7,
        Vulnerabilities: 7,
      },
      assessedOn: sunday,
      collectedAt: `${sunday}T02:15:00Z`,
    })),
  );
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${sunday}T03:00:00Z`));
  const result = await calculateGithubWeek({ date: sunday, publish });
  vi.useRealTimers();
  expect(result.written).toBe(2);
  return projects;
}
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
  await pg.exec(
    "ALTER TABLE weekly_chart_editions ALTER COLUMN frozen_at SET DEFAULT '2026-10-11T03:00:00Z'",
  );
}, 30000);
afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  await pg.exec(
    'TRUNCATE badge_award_withdrawals, badge_awards, weekly_rankings, weekly_chart_editions, github_daily_snapshots, github_projects, chart_entities, charts_job_runs CASCADE',
  );
});
afterAll(async () => {
  await pg.close();
});

describe('badges intégrés au pipeline et à Postgres', () => {
  it('lit les vrais résultats du moteur, puis reste stable après renommage et transfert', async () => {
    const [project] = await seed();
    if (!project) throw new Error('Fixture absente');
    const before = await readRankingBadge(String(project.githubId), closed);
    expect(before.eligibility.status).toBe('ranked');
    await upsertDiscoveredRepositories([repo(project.githubId - 1, 'new-owner/RENAMED')]);
    const after = await readRankingBadge(String(project.githubId), closed);
    expect(after.eligibility).toEqual(before.eligibility);
    expect(after.project?.slug).toEqual(before.project?.slug);
    expect(after.project?.name).toBe('RENAMED');
    expect(await db.select().from(schema.githubProjects)).toHaveLength(20);
  });
  it('devient neutre après une nouvelle édition sans le projet, puis se réactive', async () => {
    const projects = await seed();
    const project = projects[0];
    const other = projects[1];
    if (!project || !other) throw new Error('Fixtures absentes');
    const [entity] = await db
      .select()
      .from(schema.chartEntities)
      .where(eq(schema.chartEntities.id, other.entityId));
    if (!entity) throw new Error('Entité absente');
    const [edition] = await db
      .select()
      .from(schema.weeklyChartEditions)
      .where(eq(schema.weeklyChartEditions.chart, 'github'));
    if (!edition) throw new Error('Édition absente');
    const savedRankings = await db.select().from(schema.weeklyRankings);
    await db.insert(schema.weeklyChartEditions).values({
      ...edition,
      id: 'next',
      week: '2026-10-12',
      payload: {
        ...edition.payload,
        week: '2026-10-12',
        retrievedAt: '2026-10-12T02:00:00Z',
        entries: [{ entity: entity.slug, rank: 1, score: 90, dimensions: {}, metrics: {} }],
      },
      publishedAt: '2026-10-12T03:00:00Z',
    });
    expect((await readRankingBadge(String(project.githubId), closed)).eligibility.status).toBe(
      'unranked',
    );
    await db.insert(schema.weeklyChartEditions).values({
      ...edition,
      id: 'return',
      week: '2026-10-13',
      payload: { ...edition.payload, week: '2026-10-13', retrievedAt: '2026-10-13T02:00:00Z' },
      publishedAt: '2026-10-13T03:00:00Z',
    });
    expect(
      (await readRankingBadge(String(project.githubId), new Date('2026-10-13T04:00:00Z')))
        .eligibility.status,
    ).toBe('ranked');
    expect(await db.select().from(schema.weeklyRankings)).toEqual(savedRankings);
    await db
      .update(schema.githubProjects)
      .set({ lastError: 'Dépôt indisponible.' })
      .where(eq(schema.githubProjects.id, project.id));
    expect(
      (await readRankingBadge(String(project.githubId), new Date('2026-10-13T04:00:00Z')))
        .eligibility.status,
    ).toBe('unranked');
  });
  it('ne récompense ni une semaine ouverte, ni un brouillon, ni des données manquantes', async () => {
    expect((await assignClosedRisingStars({ now: closed })).created).toBe(0);
    await seed(false);
    expect((await assignClosedRisingStars({ now: closed })).created).toBe(0);
    expect(await readBadgeAwards()).toEqual([]);
  });
  it('attribue une seule fois, conserve la preuve et supporte deux synchronisations concurrentes', async () => {
    await seed();
    expect((await assignClosedRisingStars({ now: new Date('2026-10-11T21:59:59Z') })).created).toBe(
      0,
    );
    const dry = await assignClosedRisingStars({ now: closed, dryRun: true });
    expect(dry.eligible).toBe(1);
    expect(dry.created).toBe(0);
    const results = await Promise.all([
      assignClosedRisingStars({ now: closed }),
      assignClosedRisingStars({ now: closed }),
    ]);
    expect(results.reduce((total, result) => total + result.created, 0)).toBe(1);
    const [award] = await db.select().from(schema.badgeAwards);
    expect(award?.week).toBe('2026-W41');
    expect(award?.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(award?.evidence['metadata']).toBeDefined();
    expect(badgeEvidenceHash(award?.evidence)).toBe(award?.evidenceHash);
    expect((await assignClosedRisingStars({ now: new Date('2026-12-01T03:00:00Z') })).created).toBe(
      0,
    );
    await expect(pg.exec('UPDATE badge_awards SET score = 0')).rejects.toThrow('immutable');
    await expect(pg.exec('DELETE FROM badge_awards')).rejects.toThrow('immutable');
    if (!award) throw new Error('Award absent');
    await expect(
      db.insert(schema.badgeAwards).values({ ...award, id: 'forged', week: '2026-W42' }),
    ).rejects.toThrow();
  });
  it('refuse une URL inventée et conserve un retrait sans réattribuer la semaine', async () => {
    await seed();
    await assignClosedRisingStars({ now: closed });
    const [award] = await readBadgeAwards();
    if (!award) throw new Error('Award absent');
    expect((await readAwardBadge(String(award.githubId), '2026-W42')).status).toBe('missing');
    expect((await readAwardBadge('99999', '2026-W41')).status).toBe('missing');
    expect(
      await withdrawBadgeAward('2026-W41', 'Erreur de données confirmée.', 'test-operator'),
    ).toBe(1);
    expect(
      await withdrawBadgeAward('2026-W41', 'Nouvelle tentative de retrait.', 'test-operator'),
    ).toBe(0);
    expect((await readAwardBadge(String(award.githubId), '2026-W41')).status).toBe('withdrawn');
    expect((await assignClosedRisingStars({ now: closed })).created).toBe(0);
    expect(await db.select().from(schema.badgeAwards)).toHaveLength(1);
    await expect(pg.exec('DELETE FROM badge_award_withdrawals')).rejects.toThrow('immutable');
  });
  it('sert les SVG avec MIME, cache, ETag, HEAD et refuse les paramètres malveillants', async () => {
    await seed();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(closed);
    const context = { params: Promise.resolve({ id: '1' }) };
    const response = await rankingRoute(
      new Request('https://sandbox.test/badges/github/1/rank.svg'),
      context,
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('TOP 100');
    expect(response.headers.get('content-type')).toBe('image/svg+xml; charset=utf-8');
    expect(response.headers.get('cache-control')).toContain('s-maxage=300');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
    const conditional = await rankingRoute(
      new Request('https://sandbox.test', {
        headers: { 'If-None-Match': response.headers.get('etag') ?? '' },
      }),
      context,
    );
    expect(conditional.status).toBe(304);
    expect(await conditional.text()).toBe('');
    expect(
      await (
        await rankingRoute(new Request('https://sandbox.test', { method: 'HEAD' }), context)
      ).text(),
    ).toBe('');
    const invalid = await rankingRoute(new Request('https://sandbox.test'), {
      params: Promise.resolve({ id: '<script>' }),
    });
    expect(invalid.status).toBe(400);
    for (const edition of ['invalid.svg', '2026-W54.svg', '2025-W53.svg', '2026-W41']) {
      expect(
        (
          await awardRoute(new Request('https://sandbox.test'), {
            params: Promise.resolve({ id: '1', edition }),
          })
        ).status,
      ).toBe(400);
    }
    const missing = await awardRoute(new Request('https://sandbox.test'), {
      params: Promise.resolve({ id: '1', edition: '2026-W41.svg' }),
    });
    expect(missing.status).toBe(404);
    expect(await missing.text()).not.toContain('RISING STAR');
    await assignClosedRisingStars({ now: closed });
    const [award] = await readBadgeAwards();
    if (!award) throw new Error('Award absent');
    const awardContext = {
      params: Promise.resolve({ id: String(award.githubId), edition: '2026-W41.svg' }),
    };
    const active = await awardRoute(new Request('https://sandbox.test'), awardContext);
    expect(active.status).toBe(200);
    expect(active.headers.get('cache-control')).toContain('s-maxage=86400');
    expect(await active.text()).toContain('RISING STAR  2026-W41');
    await withdrawBadgeAward('2026-W41', 'Retrait confirmé pour le test.', 'test');
    expect((await awardRoute(new Request('https://sandbox.test'), awardContext)).status).toBe(410);
    vi.setSystemTime(new Date('2026-10-14T03:00:00Z'));
    const stale = await rankingRoute(new Request('https://sandbox.test'), context);
    expect(await stale.text()).toContain('DATA OUTDATED');
  });
  it('publie uniquement les éditions attribuées, leurs images et leur historique paginé', async () => {
    await seed();
    const context = { params: Promise.resolve({ week: '2026-W41' }) };
    expect(await readBadgeAwardEdition('2026-W41')).toBeNull();
    expect((await awardImageRoute(new Request('https://sandbox.test'), context)).status).toBe(404);
    expect(
      (
        await awardImageRoute(new Request('https://sandbox.test'), {
          params: Promise.resolve({ week: 'invalid' }),
        })
      ).status,
    ).toBe(400);
    await assignClosedRisingStars({ now: closed });
    const award = await readBadgeAwardEdition('2026-W41');
    expect(award?.name).toContain('project-');
    expect(await readBadgeAwards(undefined, { before: '2026-W41', limit: 21 })).toEqual([]);
    expect(await readBadgeAwards(undefined, { before: '2026-W42', limit: 1 })).toHaveLength(1);
    expect(await readBadgeAwardSitemapEntries()).toHaveLength(1);
    const metadata = await awardMetadata(context);
    expect(metadata.openGraph).toMatchObject({
      images: [{ url: absoluteUrl('/api/awards/2026-W41/image') }],
    });
    const localized = await localizedMetadata({
      params: Promise.resolve({ locale: 'en', path: ['charts', 'awards', '2026-W41'] }),
    });
    expect(localized.openGraph).toMatchObject({
      images: [{ url: absoluteUrl('/api/awards/2026-W41/image') }],
    });
    const image = await awardImageRoute(new Request('https://sandbox.test'), context);
    expect(image.status).toBe(200);
    expect(image.headers.get('cache-control')).toContain('s-maxage=86400');
    expect(image.headers.get('content-type')).toBe('image/png');
    const png = Buffer.from(await image.arrayBuffer());
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
    expect(
      (
        await awardImageRoute(
          new Request('https://sandbox.test', {
            headers: { 'If-None-Match': image.headers.get('etag') ?? '' },
          }),
          context,
        )
      ).status,
    ).toBe(304);
    expect(
      await (
        await awardImageRoute(new Request('https://sandbox.test', { method: 'HEAD' }), context)
      ).text(),
    ).toBe('');
    await withdrawBadgeAward('2026-W41', 'Erreur de source documentée.', 'test-operator');
    expect(await readBadgeAwardSitemapEntries()).toEqual([]);
    expect((await awardMetadata(context)).robots).toMatchObject({ index: false });
    const withdrawn = await awardImageRoute(
      new Request('https://sandbox.test', { method: 'HEAD' }),
      context,
    );
    expect(withdrawn.status).toBe(410);
    expect(withdrawn.headers.get('etag')).not.toBe(image.headers.get('etag'));
  });
  it('répond 503 sans distinction ni cache lorsque Postgres tombe', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(db, 'select').mockImplementation(() => {
      throw new Error('Connection unavailable');
    });
    const response = await rankingRoute(new Request('https://sandbox.test'), {
      params: Promise.resolve({ id: '1' }),
    });
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).not.toContain('TOP 100');
    expect(log).toHaveBeenCalled();
    const awardImage = await awardImageRoute(new Request('https://sandbox.test'), {
      params: Promise.resolve({ week: '2026-W41' }),
    });
    expect(awardImage.status).toBe(503);
    expect(awardImage.headers.get('cache-control')).toBe('no-store');
  });
});
