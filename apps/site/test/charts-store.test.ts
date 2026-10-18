import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
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
  collectionBatch,
  hasCompletedChartsCollection,
  finishChartsJob,
  publishFrozenCharts,
  saveDailyBatch,
  saveScorecardBatch,
  scorecardsForProjects,
  upsertDiscoveredRepositories,
  writeChartsConfig,
} from '../src/lib/charts-store.ts';
import { readAdminChartEdition, writeChartsEditorial } from '../src/lib/charts-editorial.ts';
import {
  publicChartEdition,
  publicReferenceArtifact,
  githubProjectDetail,
} from '../src/lib/charts-public.ts';
import { sandboxChartsData } from '../src/lib/sandbox-charts.ts';
import { calculateGithubWeek, collectGithub } from '../src/pipeline/github-jobs.ts';
import { collectModels } from '../src/pipeline/external-jobs.ts';
import { GithubClient, GithubRateLimitError } from '../src/pipeline/github-client.ts';
import { ScorecardClient } from '../src/pipeline/scorecard-client.ts';
import { collectGithubBursts, discoverGithubTrending } from '../src/pipeline/github-bursts-jobs.ts';
import { saveBurstBatch, publicGithubBursts } from '../src/lib/github-bursts-store.ts';
import { verifyReferenceArtifact } from '../src/lib/reference-artifact.ts';
import { externalEntitySchema, externalObservationSchema } from '../src/domain/external-charts.ts';
import { freezeExternalCharts } from '../src/pipeline/external-jobs.ts';

const pg = new PGlite();
const db = drizzle(pg, { schema });
vi.mock('../src/db/client.ts', () => ({ getDb: () => db, hasDatabaseConfiguration: () => true }));
const date = '2026-10-05';
function scorecardData(score: number) {
  return {
    score,
    overallScore: score,
    checksUsed: 6,
    checkScores: Object.fromEntries(
      [
        'Code-Review',
        'Security-Policy',
        'Dangerous-Workflow',
        'Token-Permissions',
        'Pinned-Dependencies',
        'Vulnerabilities',
      ].map((name) => [name, score]),
    ),
  };
}
function repo(index: number) {
  return githubRepositorySchema.parse({
    id: index + 1,
    name: `project-${index}`,
    full_name: `sandbox-fixture/project-${index}`,
    owner: { login: 'sandbox-fixture' },
    description: 'Fixture de test',
    html_url: `https://github.com/sandbox-fixture/project-${index}`,
    language: 'TypeScript',
    license: { spdx_id: 'MIT' },
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
async function seed(history = true, count = 20, withScorecard = true) {
  vi.stubEnv('CHARTS_REVIEWED_PROFILE_VERSIONS', 'github-reference-v3,rising-reference-v3');
  await upsertDiscoveredRepositories(Array.from({ length: count }, (_, index) => repo(index)));
  await db
    .update(schema.githubProjects)
    .set({ status: 'tracked', discoveredAt: '2026-09-01T00:00:00.000Z' });
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
  if (withScorecard)
    await saveScorecardBatch(
      projects.map((project) => ({
        entityId: project.entityId,
        fullName: project.fullName,
        ...scorecardData(6.5 + (project.githubId % 3)),
        assessedOn: '2026-10-04',
        collectedAt: `${date}T02:15:00Z`,
      })),
    );
  return projects;
}
beforeAll(async () => {
  for (const migration of [
    '0002_sandbox_charts.sql',
    '0003_ranking_catalog_localization.sql',
    '0004_site_content_localizations.sql',
    '0005_external_chart_sources.sql',
    '0007_daily_chart_editions.sql',
    '0009_github_bursts.sql',
    '0010_chart_refresh_slots.sql',
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
    'TRUNCATE github_trending_observations, charts_editorial, weekly_rankings, weekly_chart_editions, github_daily_snapshots, github_projects, chart_entities, charts_job_runs, charts_configuration CASCADE',
  );
});
afterAll(async () => {
  await pg.close();
});

async function seedModels(includeUnpaired = false) {
  const entities = Array.from({ length: includeUnpaired ? 21 : 20 }, (_, index) =>
    externalEntitySchema.parse({
      slug: `fixture-model-${index}`,
      type: 'model',
      name: `Model ${index}`,
      organization: 'fixture',
      description: null,
      category: 'Models',
      license: null,
      openWeights: null,
      sourceUrl: 'https://example.com/model',
      websiteUrl: null,
      sources: [
        {
          provider: 'arena',
          externalId: `model-${index}`,
          url: 'https://example.com/arena',
          label: 'Arena',
        },
        ...(index < 20
          ? [
              {
                provider: 'artificial-analysis',
                externalId: `model-${index}`,
                url: 'https://example.com/analysis',
                label: 'Artificial Analysis',
              },
            ]
          : []),
      ],
    }),
  );
  await saveExternalBatch(
    entities,
    entities.flatMap((entity, index) =>
      entity.sources.map((source) =>
        externalObservationSchema.parse({
          entitySlug: entity.slug,
          source,
          observedOn: date,
          collectedAt: `${date}T02:30:00.000Z`,
          metrics:
            source.provider === 'arena'
              ? {
                  text_style_control: 1000 + index,
                  text_style_controlVotes: 2000,
                  text_style_controlPublishedAt: date,
                }
              : { intelligenceIndex: index + 10, benchmarkAsOf: `${date}T00:00:00.000Z` },
        }),
      ),
    ),
  );
  await db.insert(schema.chartsJobRuns).values({
    id: 'fixture-model-sync',
    kind: 'models_daily_sync',
    status: 'success',
    startedAt: `${date}T02:00:00.000Z`,
    finishedAt: `${date}T02:30:00.000Z`,
  });
}

describe('pipeline charts sur Postgres', () => {
  it('réutilise les sources connues malgré un changement de slug et conserve les exclusions', async () => {
    await seedModels();
    const old = (
      await db
        .select()
        .from(schema.chartEntities)
        .where(eq(schema.chartEntities.slug, 'fixture-model-0'))
    )[0];
    if (!old) throw new Error('Le modèle de référence doit être créé par la fixture.');
    const source = {
      provider: 'arena' as const,
      externalId: 'model-0',
      url: 'https://example.com/arena',
      label: 'Arena',
    };
    const entity = externalEntitySchema.parse({
      ...old,
      slug: 'different-generated-slug',
      sources: [source],
    });
    const observation = externalObservationSchema.parse({
      entitySlug: entity.slug,
      source,
      observedOn: date,
      collectedAt: `${date}T14:00:00.000Z`,
      metrics: {
        text_style_control: 1100,
        text_style_controlVotes: 3000,
        text_style_controlPublishedAt: date,
      },
    });
    expect(await saveExternalBatch([entity], [observation])).toBe(1);
    expect(await db.select().from(schema.chartEntities)).toHaveLength(20);
    const rows = await db
      .select()
      .from(schema.chartEntitySources)
      .where(eq(schema.chartEntitySources.entityId, old.id));
    expect(rows).toHaveLength(2);
    const arenaSource = rows.find((row) => row.provider === 'arena');
    if (!arenaSource) throw new Error('La source Arena doit être enregistrée.');
    const snapshots = await db
      .select()
      .from(schema.chartSourceSnapshots)
      .where(eq(schema.chartSourceSnapshots.entitySourceId, arenaSource.id));
    expect(snapshots).toHaveLength(2);
    await db
      .update(schema.chartEntities)
      .set({ active: false })
      .where(eq(schema.chartEntities.id, old.id));
    await saveExternalBatch([entity], [observation]);
    expect(await db.select().from(schema.chartEntities)).toHaveLength(20);
    expect(
      await db
        .select()
        .from(schema.chartEntities)
        .where(eq(schema.chartEntities.slug, entity.slug)),
    ).toHaveLength(0);
    expect(
      (await db.select().from(schema.chartEntities).where(eq(schema.chartEntities.id, old.id)))[0]
        ?.active,
    ).toBe(false);
  });

  it('isole un modèle homonyme sans déplacer les sources ni les mesures historiques', async () => {
    await seedModels();
    const old = (await db.select().from(schema.chartEntities))[0];
    if (!old) throw new Error('Modèle de test absent.');
    const oldSources = await db
      .select()
      .from(schema.chartEntitySources)
      .where(eq(schema.chartEntitySources.entityId, old.id));
    const source = {
      provider: 'huggingface' as const,
      externalId: 'another-publisher/same-model-name',
      url: 'https://huggingface.co/another-publisher/same-model-name',
      label: 'Hugging Face',
    };
    const entity = externalEntitySchema.parse({ ...old, sources: [source] });
    const observation = externalObservationSchema.parse({
      entitySlug: entity.slug,
      source,
      observedOn: date,
      collectedAt: `${date}T15:00:00.000Z`,
      metrics: { downloads: 42 },
    });
    expect(await saveExternalBatch([entity], [observation])).toBe(1);
    expect(await saveExternalBatch([entity], [observation])).toBe(0);
    const all = await db.select().from(schema.chartEntities);
    expect(all).toHaveLength(21);
    const added = all.find((item) => item.slug.startsWith(`${old.slug}-`));
    if (!added) throw new Error('La variante doit rester distincte.');
    expect(added.id).not.toBe(old.id);
    expect(
      await db
        .select()
        .from(schema.chartEntitySources)
        .where(eq(schema.chartEntitySources.entityId, old.id)),
    ).toEqual(oldSources);
    const newSource = (
      await db
        .select()
        .from(schema.chartEntitySources)
        .where(eq(schema.chartEntitySources.entityId, added.id))
    )[0];
    if (!newSource) throw new Error('La nouvelle référence doit être enregistrée.');
    expect(newSource.externalId).toBe(source.externalId);
    expect(
      await db
        .select()
        .from(schema.chartSourceSnapshots)
        .where(eq(schema.chartSourceSnapshots.entitySourceId, newSource.id)),
    ).toHaveLength(1);
  });

  it('fige deux éditions distinctes par jour et rend chaque créneau idempotent', async () => {
    const projects = await seed();
    const morning = await calculateGithubWeek({ date });
    expect(morning.written).toBe(2);
    const afternoon: DailyGithubSnapshot[] = projects.map((project, index) => ({
      projectId: project.id,
      date,
      stars: 10_000 + index * 100,
      forks: 100,
      watchers: null,
      openIssues: 10,
      contributors: null,
      commits: 5,
      releases: null,
      pushedAt: `${date}T00:00:00Z`,
      collectedAt: `${date}T14:00:00Z`,
    }));
    expect(await saveDailyBatch(afternoon)).toBe(projects.length);
    expect(await saveDailyBatch(afternoon)).toBe(0);
    const second = await calculateGithubWeek({ date, slotId: `${date}T12:00Z` });
    expect(second.referenceRanking.report.publishable).toBe(true);
    expect(second.risingReferenceRanking.report.publishable).toBe(true);
    expect(second.written).toBe(2);
    expect(second.week).toBe(`${date}T12:00Z`);
    expect((await calculateGithubWeek({ date, slotId: `${date}T12:00Z` })).written).toBe(0);
    expect((await db.select().from(schema.weeklyChartEditions)).map((row) => row.week)).toEqual(
      expect.arrayContaining([`${date}T00:00Z`, `${date}T12:00Z`]),
    );
  });

  it('la découverte continue ne bloque pas le Top pendant la constitution des premières baselines', async () => {
    await seed();
    await upsertDiscoveredRepositories([repo(999)]);
    const project = (await db.select().from(schema.githubProjects)).find((row) =>
      row.fullName.endsWith('project-999'),
    );
    if (!project) throw new Error('Projet de test manquant.');
    await db
      .update(schema.githubProjects)
      .set({ status: 'tracked', discoveredAt: `${date}T00:00:00.000Z` })
      .where(eq(schema.githubProjects.id, project.id));
    await saveDailyBatch([
      {
        projectId: project.id,
        date,
        stars: 3000,
        forks: 100,
        watchers: null,
        openIssues: 0,
        contributors: null,
        commits: null,
        releases: null,
        pushedAt: `${date}T00:00:00.000Z`,
        collectedAt: `${date}T02:00:00.000Z`,
      },
    ]);
    expect((await calculateGithubWeek({ date, dryRun: true })).insufficientHistory).toBe(false);
    await db
      .update(schema.githubProjects)
      .set({ discoveredAt: '2026-09-01T00:00:00.000Z' })
      .where(eq(schema.githubProjects.id, project.id));
    expect((await calculateGithubWeek({ date, dryRun: true })).insufficientHistory).toBe(true);
  });
  it('fige un classement Models v3 avec les vraies dates de benchmark, puis expose sa preuve après revue', async () => {
    vi.stubEnv('CHARTS_REVIEWED_PROFILE_VERSIONS', '');
    await seedModels();
    const simulation = await freezeExternalCharts({ date, dryRun: true });
    expect(simulation.status).toBe('success');
    expect(await db.select().from(schema.weeklyChartEditions)).toHaveLength(0);
    expect((await freezeExternalCharts({ date })).snapshotsCreated).toBe(1);
    expect(await publicReferenceArtifact('models')).toBeNull();
    vi.stubEnv('CHARTS_REVIEWED_PROFILE_VERSIONS', 'models-reference-v3');
    expect(await publishFrozenCharts(`${date}T00:00Z`)).toBe(1);
    const proof = verifyReferenceArtifact(await publicReferenceArtifact('models'));
    expect(proof.report.rows).toHaveLength(20);
    expect(proof.input.observations.every((row) => row.observedOn === date)).toBe(true);
    expect(proof.report.rows[0]?.contributions.map((row) => row.weight)).toEqual([0.6, 0.4]);
  });
  it('refuse un gel Models si un candidat à une seule évaluation peut changer le Top', async () => {
    await seedModels(true);
    const result = await freezeExternalCharts({ date });
    expect(result.status).toBe('insufficient_history');
    expect(result.snapshotsCreated).toBe(0);
    expect(await db.select().from(schema.weeklyChartEditions)).toHaveLength(0);
  });
  it('conserve les éditions v3 en brouillon sans revue et refuse leur publication manuelle', async () => {
    await seed();
    vi.stubEnv('CHARTS_REVIEWED_PROFILE_VERSIONS', '');
    expect((await calculateGithubWeek({ date })).written).toBe(2);
    expect(await publicChartEdition('github')).toBeNull();
    await expect(publishFrozenCharts(`${date}T00:00Z`)).rejects.toThrow('Revue');
    vi.stubEnv('CHARTS_REVIEWED_PROFILE_VERSIONS', 'github-reference-v3,rising-reference-v3');
    expect(await publishFrozenCharts(`${date}T00:00Z`)).toBe(2);
  });
  it('un dépôt suivi sans relevé du jour peut bloquer le Top au lieu de disparaître', async () => {
    await seed();
    await upsertDiscoveredRepositories([repo(999)]);
    await db
      .update(schema.githubProjects)
      .set({ status: 'tracked', discoveredAt: '2026-09-01T00:00:00.000Z' });
    const result = await calculateGithubWeek({ date, dryRun: true });
    expect(
      result.referenceRanking.report.excluded.some(
        (row) => row.entity.includes('999') && row.canEnterTop,
      ),
    ).toBe(true);
    expect(result.insufficientHistory).toBe(true);
  });
  it('distingue dépôt public et dépôt open source en conservant la licence source', async () => {
    await seed();
    await upsertDiscoveredRepositories([{ ...repo(999), license: null }]);
    await db.update(schema.githubProjects).set({ status: 'tracked' });
    const result = await calculateGithubWeek({ date, dryRun: true });
    expect(result.insufficientHistory).toBe(false);
    expect(result.referenceRanking.input.candidates.some((slug) => slug.includes('999'))).toBe(
      false,
    );
    expect(result.entries.every((row) => row.project.license === 'MIT')).toBe(true);
  });
  it('les collectes intrajournalières sont bornées, idempotentes et alimentent de vrais signaux', async () => {
    await seed(true, 3);
    vi.stubEnv('CHARTS_BURST_COLLECTION_ENABLED', 'true');
    vi.stubEnv('GITHUB_TOKEN', 'fixture-token');
    let extra = 0;
    const client = new GithubClient();
    vi.spyOn(client, 'batch').mockImplementation(async (names) =>
      names.map((fullName) => {
        const index = Number(fullName.split('-').at(-1));
        return {
          fullName,
          repository: { ...repo(index), stargazers_count: 2000 + index + extra },
          commits7d: null,
          error: null,
        };
      }),
    );
    const first = new Date('2026-10-05T11:15:00.000Z');
    expect((await collectGithubBursts(client, first)).snapshotsCreated).toBe(3);
    expect(await db.select().from(schema.githubBurstEvents)).toHaveLength(0);
    extra = 200;
    const second = new Date('2026-10-05T12:15:00.000Z');
    expect((await collectGithubBursts(client, second)).snapshotsCreated).toBe(3);
    expect((await collectGithubBursts(client, second)).snapshotsCreated).toBe(0);
    expect(await db.select().from(schema.githubStarObservations)).toHaveLength(6);
    expect(await db.select().from(schema.githubBurstEvents)).toHaveLength(3);
    expect((await publicGithubBursts(second)).entries).toHaveLength(3);
    await writeChartsConfig({
      ...DEFAULT_GITHUB_CHART_CONFIG,
      blacklist: ['SANDBOX-FIXTURE/PROJECT-0'],
    });
    expect((await publicGithubBursts(second)).entries).toHaveLength(2);
    await expect(pg.exec('UPDATE github_star_observations SET stars = 0')).rejects.toThrow();
    await expect(pg.exec('DELETE FROM github_burst_events')).rejects.toThrow();
    const event = (await db.select().from(schema.githubBurstEvents))[0];
    if (!event) throw new Error('Signal de test manquant.');
    await expect(saveBurstBatch([], [event.evidence])).rejects.toThrow('Signal');
  });
  it('Trending et les poussées restent sans effet tant que les accès ne sont pas activés', async () => {
    vi.stubEnv('CHARTS_BURST_COLLECTION_ENABLED', 'false');
    vi.stubEnv('GITHUB_TRENDING_DISCOVERY_ENABLED', 'false');
    expect((await collectGithubBursts()).status).toBe('skipped');
    const fetcher = vi.fn<typeof fetch>();
    expect((await discoverGithubTrending(new GithubClient(), fetcher)).status).toBe('skipped');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('collecte Trending comme découverte datée, sans lui attribuer de rang officiel', async () => {
    vi.stubEnv('GITHUB_TRENDING_DISCOVERY_ENABLED', 'true');
    const client = new GithubClient();
    vi.spyOn(client, 'batch').mockResolvedValue([
      { fullName: 'sandbox-fixture/project-0', repository: repo(0), commits7d: null, error: null },
    ]);
    const html =
      '<article class="Box-row"><h2><a href="/sandbox-fixture/project-0">Fixture</a></h2></article>';
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(() =>
        Promise.resolve(new Response(html, { headers: { 'Content-Type': 'text/html' } })),
      );
    const now = new Date(`${date}T01:00:00.000Z`);
    expect((await discoverGithubTrending(client, fetcher, now)).snapshotsCreated).toBe(1);
    expect((await discoverGithubTrending(client, fetcher, now)).snapshotsCreated).toBe(0);
    expect(await db.select().from(schema.githubTrendingObservations)).toHaveLength(1);
    expect(await db.select().from(schema.weeklyChartEditions)).toHaveLength(0);
    await expect(pg.exec('DELETE FROM github_trending_observations')).rejects.toThrow();
  });
  it('retrouve la collecte historique malgré une relance ratée et des jobs plus récents', async () => {
    await db.insert(schema.chartsJobRuns).values([
      {
        id: 'past-success',
        kind: 'models_daily_sync',
        status: 'success',
        startedAt: '2026-10-11T03:00:00Z',
        finishedAt: '2026-10-11T03:01:00Z',
      },
      {
        id: 'past-failure',
        kind: 'models_daily_sync',
        status: 'failed',
        startedAt: '2026-10-11T04:00:00Z',
        finishedAt: '2026-10-11T04:01:00Z',
      },
      {
        id: 'later-success',
        kind: 'models_daily_sync',
        status: 'success',
        startedAt: '2026-10-15T03:00:00Z',
        finishedAt: '2026-10-15T03:01:00Z',
      },
    ]);
    expect(await hasCompletedChartsCollection('models_daily_sync', '2026-10-11T00:00Z')).toBe(true);
    expect(await hasCompletedChartsCollection('models_daily_sync', '2026-10-11T12:00Z')).toBe(
      false,
    );
    expect(await hasCompletedChartsCollection('skills_daily_sync', '2026-10-11T00:00Z')).toBe(
      false,
    );
  });
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
    expect(
      await saveExternalBatch(
        [entity],
        observations.map((observation) => ({
          ...observation,
          collectedAt: `${date}T14:30:00.000Z`,
        })),
      ),
    ).toBe(2);
    expect(await db.select().from(schema.chartSourceSnapshots)).toHaveLength(4);
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
  it('réutilise les rapports OpenSSF récents sans rappeler leur API', async () => {
    await seed();
    vi.stubEnv('GITHUB_TOKEN', 'test-token');
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('Appel inattendu.'));
    const summary = await collectGithub(
      new GithubClient(),
      new Date(`${date}T02:30:00Z`),
      new ScorecardClient({ fetch: fetcher }),
    );
    expect(summary.status, JSON.stringify(summary)).toBe('success');
    expect(summary.snapshotsCreated).toBe(0);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('attend une seconde source vérifiée et ignore un relevé collecté après la semaine simulée', async () => {
    const projects = await seed(true, 20, false);
    expect((await calculateGithubWeek({ date, dryRun: true })).entries).toHaveLength(0);
    expect(
      await saveScorecardBatch(
        projects.map((project) => ({
          entityId: project.entityId,
          fullName: project.fullName,
          ...scorecardData(8),
          assessedOn: '2026-10-04',
          collectedAt: '2026-10-06T01:00:00Z',
        })),
      ),
    ).toBe(20);
    expect(await scorecardsForProjects(projects, date)).toEqual(new Map());
    expect((await calculateGithubWeek({ date, dryRun: true })).entries).toHaveLength(0);
  });
  it('refuse de stocker un relevé OpenSSF sans six contrôles vérifiables', async () => {
    const [project] = await seed(true, 1, false);
    if (!project) throw new Error('Fixture absente.');
    await expect(
      saveScorecardBatch([
        {
          entityId: project.entityId,
          fullName: project.fullName,
          ...scorecardData(8),
          checksUsed: 5,
          assessedOn: '2026-10-04',
          collectedAt: `${date}T02:15:00Z`,
        },
      ]),
    ).rejects.toThrow();
    expect(await db.select().from(schema.chartSourceSnapshots)).toHaveLength(0);
  });
  it('ne publie pas si un dépôt sans second avis pourrait entrer dans le Top 20', async () => {
    const projects = await seed(true, 21, false);
    await saveScorecardBatch(
      projects.slice(0, 20).map((project) => ({
        entityId: project.entityId,
        fullName: project.fullName,
        ...scorecardData(8),
        assessedOn: '2026-10-04',
        collectedAt: `${date}T02:15:00Z`,
      })),
    );
    const result = await calculateGithubWeek({ date, dryRun: true });
    expect(result.entries).toHaveLength(20);
    expect(result.uncertainCandidates).toBeGreaterThan(0);
    expect(result.insufficientHistory).toBe(true);
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
    expect(api?.scoringVersion).toBe('github-reference-v3');
    expect(
      verifyReferenceArtifact(await publicReferenceArtifact('github')).report.publishable,
    ).toBe(true);
    expect(JSON.stringify(api?.config)).not.toContain('observations');
    expect(api?.entries[0]?.provenance['coverage']).toBeCloseTo(0.9);
    const sourceScores = api?.entries[0]?.provenance['sourceScores'] as
      Record<string, unknown> | undefined;
    expect(typeof sourceScores?.['github']).toBe('number');
    expect(typeof sourceScores?.['openssf-scorecard']).toBe('number');
    const sourceEvidence = api?.entries[0]?.provenance['sourceEvidence'] as
      { checksUsed?: unknown; checkScores?: Record<string, unknown> } | undefined;
    expect(sourceEvidence?.checksUsed).toBe(6);
    expect(typeof sourceEvidence?.checkScores?.['Code-Review']).toBe('number');
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
    expect(await publishFrozenCharts(`${date}T00:00Z`)).toBe(2);
    expect(await publishFrozenCharts(`${date}T00:00Z`)).toBe(0);
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
  it('retire du suivi automatique un dépôt que GitHub ne résout plus', async () => {
    vi.stubEnv('GITHUB_TOKEN', 'test-token');
    const projects = await seed(true, 2);
    const missing = projects[0];
    if (!missing) throw new Error('Dépôt fixture absent');
    const client = new GithubClient({ token: 'test-token' });
    vi.spyOn(client, 'batch').mockResolvedValue(
      projects.map((project, index) => ({
        fullName: project.fullName,
        repository: index === 0 ? null : { ...repo(index), stargazers_count: 3000 + index },
        commits7d: 5,
        error:
          index === 0
            ? `Could not resolve to a Repository with the name '${project.fullName}'.`
            : null,
      })),
    );
    const result = await collectGithub(client, new Date('2026-10-06T02:00:00Z'));
    expect(result.failed).toBe(1);
    expect(result.succeeded).toBe(1);
    const stored = (
      await db.select().from(schema.githubProjects).where(eq(schema.githubProjects.id, missing.id))
    )[0];
    expect(stored?.status).toBe('ignored');
    expect(stored?.lastError).toContain('Could not resolve');
  });
  it('conserve le catalogue Models reçu quand une seule source répond 503', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');
    const result = await collectModels({
      huggingFace: () =>
        Promise.resolve([
          {
            id: 'fixture/model',
            downloads: 10,
            likes: 1,
            tags: ['license:mit'],
            pipeline_tag: 'text-generation',
          },
        ]),
      arena: () => Promise.reject(new Error('Source indisponible (Source HTTP 503.).')),
    });
    expect(result.status).toBe('partial');
    expect(result.snapshotsCreated).toBeGreaterThan(0);
    expect(result.details.some((detail) => detail.includes('Arena indisponible'))).toBe(true);
    expect(await db.select().from(schema.chartEntities)).toHaveLength(1);
  });
  it('n’enregistre aucun modèle quand Hugging Face et Arena échouent ensemble', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');
    const result = await collectModels({
      huggingFace: () => Promise.reject(new Error('Source indisponible (Source HTTP 503.).')),
      arena: () => Promise.reject(new Error('Source indisponible (Source HTTP 503.).')),
    });
    expect(result.status).toBe('failed');
    expect(result.snapshotsCreated).toBe(0);
    expect(await db.select().from(schema.chartEntities)).toHaveLength(0);
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
    expect(detail?.editionsInTop20).toBe(0);
    expect(detail?.daily).toHaveLength(3);
  });
  it('collecte les dépôts suivis avant une file de candidats plus grande que le lot', async () => {
    vi.stubEnv('GITHUB_TOKEN', 'test-token');
    const tracked = await seed(false, 2, false);
    await upsertDiscoveredRepositories(Array.from({ length: 120 }, (_, i) => repo(100 + i)));
    const slot = '2026-10-06T00:00Z';
    const batch = await collectionBatch(slot, 100, undefined, 'tracked');
    expect(batch.map((item) => item.repo.id).toSorted()).toEqual(
      tracked.map((item) => item.id).toSorted(),
    );
    const client = new GithubClient({ token: 'test-token' });
    const calls: string[][] = [];
    vi.spyOn(client, 'batch').mockImplementation(async (names) => {
      calls.push([...names]);
      return names.map((fullName) => {
        const index = Number(fullName.split('-').at(-1));
        return { fullName, repository: repo(index), commits7d: 1, error: null };
      });
    });
    const result = await collectGithub(client, new Date('2026-10-06T02:00:00Z'));
    expect(calls[0]?.toSorted()).toEqual(tracked.map((item) => item.fullName).toSorted());
    expect(calls.flat()).toHaveLength(102);
    expect(result.remaining).toBe(0);
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
