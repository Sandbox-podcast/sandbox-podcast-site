import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as schema from '../src/db/schema.ts';
import {
  DEFAULT_GITHUB_CHART_CONFIG,
  githubRepositorySchema,
  type DailyGithubSnapshot,
} from '../src/domain/github-charts.ts';
import { chartEditionSchema } from '../src/domain/schema.ts';
import { ContentConflictError } from '../src/lib/admin-content-conflict.ts';
import { freezeExternalEdition, saveExternalBatch } from '../src/lib/external-charts-store.ts';
import {
  beginChartsJob,
  finishChartsJob,
  publishFrozenCharts,
  saveDailyBatch,
  upsertDiscoveredRepositories,
  writeChartsConfig,
} from '../src/lib/charts-store.ts';
import { readAdminChartEdition, writeChartsEditorial } from '../src/lib/charts-editorial.ts';
import { publicChartEdition, githubProjectDetail } from '../src/lib/charts-public.ts';
import { sandboxChartsData } from '../src/lib/sandbox-charts.ts';
import { calculateGithubWeek, collectGithub } from '../src/pipeline/github-jobs.ts';
import { GithubClient, GithubRateLimitError } from '../src/pipeline/github-client.ts';

const pg = new PGlite();
const db = drizzle(pg, { schema });
vi.mock('../src/db/client.ts', () => ({ getDb: () => db, hasDatabaseConfiguration: () => true }));
const date = '2026-10-05';
function repo(index: number) {
  return githubRepositorySchema.parse({
    id: index + 1,
    name: `project-${index}`,
    full_name: `sandbox-fixture/project-${index}`,
    owner: { login: 'sandbox-fixture' },
    description: 'Fixture de test',
    html_url: `https://github.com/sandbox-fixture/project-${index}`,
    language: 'TypeScript',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: `${date}T00:00:00Z`,
    pushed_at: `${date}T00:00:00Z`,
    default_branch: 'main',
    archived: false,
    fork: false,
    stargazers_count: 2000 + index,
    forks_count: 100,
    open_issues_count: 10,
  });
}
async function seed(history = true, count = 20) {
  await upsertDiscoveredRepositories(Array.from({ length: count }, (_, index) => repo(index)));
  await db.update(schema.githubProjects).set({ status: 'tracked' });
  const projects = (await db.select().from(schema.githubProjects)).toSorted(
    (a, b) => a.githubId - b.githubId,
  );
  const daily: DailyGithubSnapshot[] = projects.flatMap((project, index) =>
    (history ? ['2026-09-21', '2026-09-28', date] : [date]).map((day, at) => ({
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
  return projects;
}
beforeAll(async () => {
  for (const migration of [
    '0002_sandbox_charts.sql',
    '0003_ranking_catalog_localization.sql',
    '0004_site_content_localizations.sql',
    '0005_external_chart_sources.sql',
  ]) {
    for (const statement of readFileSync(`drizzle/${migration}`, 'utf8').split(
      '--> statement-breakpoint',
    ))
      if (statement.trim()) await pg.exec(statement);
  }
}, 30000);
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await pg.exec(
    'TRUNCATE charts_editorial, weekly_rankings, weekly_chart_editions, github_daily_snapshots, github_projects, chart_entities, charts_job_runs, charts_configuration CASCADE',
  );
});
afterAll(async () => {
  await pg.close();
});

describe('pipeline charts sur Postgres', () => {
  it('refuse le premier classement sans J−7 et ne crée aucune métrique de remplacement', async () => {
    await seed(false);
    const result = await calculateGithubWeek({ date });
    expect(result.insufficientHistory).toBe(true);
    expect(result.written).toBe(0);
    expect(await db.select().from(schema.weeklyChartEditions)).toHaveLength(0);
    expect(await db.select().from(schema.githubDailySnapshots)).toHaveLength(20);
  });
  it('stocke des mesures multi-sources, rejoue un jour sans doublon et fige leur provenance', async () => {
    const skillsSource = {
      provider: 'skills-sh' as const,
      externalId: 'vercel/nextjs',
      url: 'https://www.skills.sh/vercel/nextjs',
      label: 'Skills.sh',
    };
    const githubSource = {
      provider: 'github' as const,
      externalId: 'vercel/next.js',
      url: 'https://github.com/vercel/next.js',
      label: 'GitHub',
    };
    const sources = [skillsSource, githubSource];
    const entity = {
      slug: 'nextjs-skill',
      type: 'skill' as const,
      name: 'Next.js',
      organization: 'Vercel',
      description: 'Skill de développement Next.js.',
      category: 'Web development',
      license: 'MIT',
      openWeights: null,
      sourceUrl: skillsSource.url,
      websiteUrl: 'https://nextjs.org',
      sources,
    };
    const collectedAt = `${date}T02:30:00.000Z`;
    const observations = [
      {
        entitySlug: entity.slug,
        source: skillsSource,
        observedOn: date,
        collectedAt,
        metrics: { installs: 1200 },
      },
      {
        entitySlug: entity.slug,
        source: githubSource,
        observedOn: date,
        collectedAt,
        metrics: { stars: 135000, forks: 29000 },
      },
    ];

    expect(await saveExternalBatch([entity], observations)).toBe(2);
    expect(await saveExternalBatch([entity], observations)).toBe(0);
    expect(await db.select().from(schema.chartSourceSnapshots)).toHaveLength(2);
    expect(await db.select().from(schema.chartEntitySources)).toHaveLength(2);
    await expect(
      pg.exec("UPDATE chart_source_snapshots SET metrics = '{}'::jsonb"),
    ).rejects.toThrow();

    const editionEntries = [
      {
        slug: entity.slug,
        identity: {
          name: entity.name,
          organization: entity.organization,
          sourceUrl: entity.sourceUrl,
          license: entity.license,
          openWeights: entity.openWeights,
        },
        rank: 1,
        score: 84.5,
        dimensions: { growth: 80, githubGrowth: 90, freshness: 75 },
        metrics: { installs: 1200, stars: 135000 },
        sourceObservedAt: [collectedAt],
        sources,
      },
    ];
    const frozen = await freezeExternalEdition(
      'skills',
      '2026-W41',
      date,
      'skills-momentum-v1',
      { growth: 0.5, github: 0.3, freshness: 0.2 },
      editionEntries,
      true,
    );

    expect(frozen).toBe(1);
    const edition = await publicChartEdition('skills');
    expect(edition?.entries[0]).toMatchObject({
      slug: entity.slug,
      name: entity.name,
      organization: entity.organization,
      sourceUrl: entity.sourceUrl,
      license: entity.license,
      sources,
    });
    expect(
      await freezeExternalEdition('skills', '2026-W41', date, 'changed', {}, editionEntries, true),
    ).toBe(0);
    expect(await db.select().from(schema.weeklyChartEditions)).toHaveLength(1);
    await expect(
      pg.exec("UPDATE weekly_chart_editions SET scoring_version = 'changed'"),
    ).rejects.toThrow();
  });
  it('le dry run calcule Top 20 et Rising sans écrire ni journal ni édition', async () => {
    await seed();
    const result = await calculateGithubWeek({ date, dryRun: true });
    expect(result.entries).toHaveLength(20);
    expect(result.rising).toHaveLength(20);
    expect(await db.select().from(schema.weeklyChartEditions)).toHaveLength(0);
    expect(await db.select().from(schema.chartsJobRuns)).toHaveLength(0);
  });
  it('fige deux classements, rejoue sans doublon et conserve le scoring original après changement de config', async () => {
    await seed();
    expect((await calculateGithubWeek({ date })).written).toBe(2);
    const original = await db.select().from(schema.weeklyChartEditions);
    await writeChartsConfig({
      ...DEFAULT_GITHUB_CHART_CONFIG,
      version: 'v2',
      momentum: {
        ...DEFAULT_GITHUB_CHART_CONFIG.momentum,
        starVelocity: 0.5,
        relativeGrowth: 0.15,
      },
    });
    expect((await calculateGithubWeek({ date })).written).toBe(0);
    expect(await db.select().from(schema.weeklyChartEditions)).toEqual(original);
    expect(await db.select().from(schema.weeklyRankings)).toHaveLength(40);
    const api = await publicChartEdition('github');
    expect(api?.entries[0]?.status).toBe('new');
    expect(api?.scoringVersion).toBe('github-momentum-v1');
    expect(api?.entries[0]?.provenance['coverage']).toBeCloseTo(0.9);
    const publicData = await sandboxChartsData();
    expect(publicData.mode).toBe('live');
    expect(
      publicData.series.find((series) => series.id === 'github')?.snapshots[0]?.entries,
    ).toHaveLength(20);
    expect(publicData.series.find((series) => series.id === 'models')?.snapshots).toEqual([]);
    expect(publicData.entities.every((entity) => entity.href.startsWith('/charts/project/'))).toBe(
      true,
    );
  });
  it('la base interdit UPDATE et DELETE des relevés et positions, y compris hors du code applicatif', async () => {
    await seed();
    await calculateGithubWeek({ date });
    for (const table of ['github_daily_snapshots', 'weekly_rankings', 'weekly_chart_editions']) {
      await expect(pg.exec(`DELETE FROM ${table}`)).rejects.toThrow();
    }
    await expect(pg.exec('UPDATE github_daily_snapshots SET stars = 0')).rejects.toThrow();
    await expect(pg.exec('UPDATE weekly_rankings SET score = 0')).rejects.toThrow();
    await expect(
      pg.exec("UPDATE weekly_chart_editions SET scoring_version = 'changed'"),
    ).rejects.toThrow();
  });
  it('publie un brouillon une fois, sans retoucher son payload', async () => {
    await seed();
    await calculateGithubWeek({ date, publish: false });
    expect(await publicChartEdition('github')).toBeNull();
    const original = (await db.select().from(schema.weeklyChartEditions))[0]?.payload;
    expect(await publishFrozenCharts('2026-W41')).toBe(2);
    expect(await publishFrozenCharts('2026-W41')).toBe(0);
    expect((await db.select().from(schema.weeklyChartEditions))[0]?.payload).toEqual(original);
  });
  it('sépare commentaires, publication et métriques, avec conflit d’édition détecté', async () => {
    await seed();
    await calculateGithubWeek({ date });
    const edition = await readAdminChartEdition();
    if (!edition) throw new Error('Édition fixture absente');
    const original = edition.entries;
    const notes = chartEditionSchema.parse({
      week: edition.week,
      headline: 'La semaine des agents',
      insights: [{ entity: original[0]?.entity, sandboxTake: 'À surveiller.', author: 'Lou' }],
    });
    const etag = await writeChartsEditorial(edition.id, notes, 'draft', null, 'Lou');
    expect((await readAdminChartEdition(edition.id))?.editorial.insights[0]?.author).toBe('Lou');
    expect((await readAdminChartEdition(edition.id))?.editorial.headline).toBe(
      'La semaine des agents',
    );
    await expect(writeChartsEditorial(edition.id, notes, 'published', null)).rejects.toBeInstanceOf(
      ContentConflictError,
    );
    await writeChartsEditorial(edition.id, notes, 'published', etag, 'Nicolas');
    expect((await readAdminChartEdition(edition.id))?.editorial.insights[0]?.author).toBe('Lou');
    expect((await readAdminChartEdition(edition.id))?.entries).toEqual(original);
  });
  it('verrouille les jobs concurrents de même type et libère le verrou à la fin', async () => {
    const first = await beginChartsJob('github_daily_sync');
    expect(first).toBeTruthy();
    expect(await beginChartsJob('github_daily_sync')).toBeNull();
    if (!first) throw new Error('Job absent');
    await finishChartsJob(first, {
      status: 'success',
      processed: 0,
      succeeded: 0,
      failed: 0,
      details: [],
    });
    expect(await beginChartsJob('github_daily_sync')).toBeTruthy();
  });
  it('continue les dépôts valides quand un dépôt est privé, sans effacer son historique', async () => {
    vi.stubEnv('GITHUB_TOKEN', 'test-token');
    const projects = await seed(true, 3);
    const client = new GithubClient({ token: 'test-token' });
    vi.spyOn(client, 'batch').mockResolvedValue(
      projects.map((project, index) => ({
        fullName: project.fullName,
        repository: index === 0 ? null : { ...repo(index), stargazers_count: 3000 + index },
        commits7d: 5,
        error: index === 0 ? 'Dépôt privé' : null,
      })),
    );
    const result = await collectGithub(client, new Date('2026-10-06T02:00:00Z'));
    expect(result.status).toBe('partial');
    expect(result.failed).toBe(1);
    expect(result.succeeded).toBe(2);
    expect(await db.select().from(schema.githubDailySnapshots)).toHaveLength(11);
    const entity = (await db.select().from(schema.chartEntities)).find(
      (item) => item.id === projects[0]?.entityId,
    );
    if (!entity) throw new Error('Entité fixture absente');
    const detail = await githubProjectDetail(entity.slug);
    expect(detail?.weeksInTop20).toBe(0);
    expect(detail?.daily).toHaveLength(3);
  });
  it('un quota atteint préserve les relevés et laisse les dépôts à reprendre', async () => {
    vi.stubEnv('GITHUB_TOKEN', 'test-token');
    await seed(true, 3);
    const client = new GithubClient({ token: 'test-token' });
    vi.spyOn(client, 'batch').mockRejectedValue(new GithubRateLimitError('2026-10-06T03:00:00Z'));
    const result = await collectGithub(client, new Date('2026-10-06T02:00:00Z'));
    expect(result.status).toBe('partial');
    expect(result.remaining).toBe(3);
    expect(await db.select().from(schema.githubDailySnapshots)).toHaveLength(9);
  });
});
