import { desc } from 'drizzle-orm';
import { getDb, hasDatabaseConfiguration } from '../db/client.ts';
import { weeklyChartEditions } from '../db/schema.ts';
import { chartsAdminResponseSchema, type ChartsAdminResponse } from '../domain/charts-admin.ts';
import {
  DEFAULT_GITHUB_CHART_CONFIG,
  githubMetrics,
  rankGithubProjects,
  utcDate,
  type TrackingStatus,
} from '../domain/github-charts.ts';
import {
  asProject,
  chartCatalog,
  chartsJobDashboard,
  readChartsConfig,
  weeklyCandidates,
} from './charts-store.ts';
import { readAdminChartEdition } from './charts-editorial.ts';

export async function chartsAdminData(
  page = 0,
  status?: TrackingStatus,
  search = '',
  editionId?: string,
): Promise<ChartsAdminResponse> {
  const blank: ChartsAdminResponse = {
    configured: false,
    message: 'Configurez Postgres puis appliquez la migration 0002 pour activer la collecte.',
    counts: {},
    snapshotsToday: 0,
    jobs: [],
    repositories: [],
    total: 0,
    page,
    config: DEFAULT_GITHUB_CHART_CONFIG,
    editions: [],
    edition: null,
  };
  if (!hasDatabaseConfiguration()) return blank;
  try {
    const [config, catalog, dashboard, editions] = await Promise.all([
      readChartsConfig(),
      chartCatalog(page, status, search),
      chartsJobDashboard(),
      getDb().select().from(weeklyChartEditions).orderBy(desc(weeklyChartEditions.week)).limit(32),
    ]);
    const candidates = await weeklyCandidates(utcDate(), config);
    const scores = new Map(
      rankGithubProjects(candidates, { ...config, size: 20 }).map((entry) => [
        entry.project.id,
        entry.score,
      ]),
    );
    return chartsAdminResponseSchema.parse({
      configured: true,
      message: process.env['GITHUB_TOKEN']
        ? ''
        : 'GITHUB_TOKEN manque. Le catalogue reste consultable.',
      counts: dashboard.counts,
      snapshotsToday: dashboard.snapshotsToday,
      jobs: dashboard.jobs,
      config,
      page,
      total: catalog.total,
      edition: await readAdminChartEdition(editionId),
      editions: editions.map((edition) => ({
        id: edition.id,
        week: edition.week,
        chart: edition.chart,
        entries: edition.payload.entries.length,
        published: edition.publishedAt !== null,
        version: edition.scoringVersion,
      })),
      repositories: catalog.repos.map(({ repo, entity }) => {
        const history = catalog.snapshots.filter((snapshot) => snapshot.projectId === repo.id);
        const current = history.at(-1);
        const metrics = current
          ? githubMetrics(asProject(repo, entity), current, history, config)
          : null;
        return {
          id: repo.id,
          slug: entity.slug,
          name: entity.name,
          fullName: repo.fullName,
          category: entity.category,
          featured: entity.featured,
          status: repo.manualStatus ?? repo.status,
          manual: repo.manualStatus !== null,
          stars: current?.stars ?? null,
          stars7d: metrics?.stars7d ?? null,
          growth: metrics?.growthPercentage ?? null,
          score: scores.get(repo.id) ?? null,
          language: repo.language,
          lastSync: repo.lastSyncedAt,
          error: repo.lastError,
          insufficientHistory: metrics?.insufficientHistory ?? true,
        };
      }),
    });
  } catch (error) {
    console.error(
      'SANDBOX CHARTS admin unavailable:',
      error instanceof Error ? error.name : 'database',
    );
    return {
      ...blank,
      message:
        'La base SANDBOX CHARTS est indisponible. Vérifiez sa connexion et la migration 0002.',
    };
  }
}
