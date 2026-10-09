import { randomUUID } from 'node:crypto';
import {
  and,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  notExists,
  or,
  sql,
} from 'drizzle-orm';
import { getDb, hasDatabaseConfiguration } from '../db/client.ts';
import {
  chartEntities,
  chartsConfiguration,
  chartsJobRuns,
  githubDailySnapshots,
  githubProjects,
  weeklyChartEditions,
  weeklyRankings,
} from '../db/schema.ts';
import {
  DEFAULT_GITHUB_CHART_CONFIG,
  dateDaysAgo,
  githubChartConfigSchema,
  githubMetrics,
  utcDate,
  weeklyGithubMovement,
  type DailyGithubSnapshot,
  type GithubChartConfig,
  type GithubChartProject,
  type GithubRepository,
  type GithubScoredEntry,
  type TrackingStatus,
} from '../domain/github-charts.ts';
import { snapshotSchema, type Snapshot } from '../domain/schema.ts';
import type { ChartsCollectionProgress } from '../domain/sandbox-charts.ts';
import { isoWeekOf, previousWeek } from '../domain/weeks.ts';

export class ChartsUnavailableError extends Error {
  constructor() {
    super('SANDBOX CHARTS attend la configuration Postgres et la migration 0002.');
  }
}
export function requireChartsDatabase(): void {
  if (!hasDatabaseConfiguration()) throw new ChartsUnavailableError();
}
export async function readChartsConfig(): Promise<GithubChartConfig> {
  requireChartsDatabase();
  const row = (
    await getDb().select().from(chartsConfiguration).where(eq(chartsConfiguration.id, 1)).limit(1)
  )[0];
  return row ? githubChartConfigSchema.parse(row.payload) : DEFAULT_GITHUB_CHART_CONFIG;
}
export async function writeChartsConfig(value: unknown): Promise<void> {
  const payload = githubChartConfigSchema.parse(value);
  await getDb()
    .insert(chartsConfiguration)
    .values({ id: 1, payload })
    .onConflictDoUpdate({
      target: chartsConfiguration.id,
      set: { payload, updatedAt: new Date().toISOString() },
    });
}
function slugForRepository(fullName: string): string {
  return fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
export async function upsertDiscoveredRepositories(
  repositories: readonly GithubRepository[],
): Promise<number> {
  if (repositories.length === 0) return 0;
  const db = getDb();
  const unique = [...new Map(repositories.map((repo) => [repo.id, repo])).values()].filter(
    (repo) => !repo.private,
  );
  if (unique.length === 0) return 0;
  const existing = await db
    .select()
    .from(githubProjects)
    .where(
      inArray(
        githubProjects.githubId,
        unique.map((repo) => repo.id),
      ),
    );
  const byGithubId = new Map(existing.map((repo) => [repo.githubId, repo]));
  const values = unique.map((repo) => {
    const before = byGithubId.get(repo.id);
    return { repo, id: before?.id ?? randomUUID(), entityId: before?.entityId ?? randomUUID() };
  });
  await db.transaction(async (tx) => {
    await tx
      .insert(chartEntities)
      .values(
        values.map(({ repo, entityId }) => ({
          id: entityId,
          type: 'github_project',
          slug: `${slugForRepository(repo.full_name)}-${repo.id.toString()}`,
          name: repo.name,
          description: repo.description,
          sourceUrl: repo.html_url,
          websiteUrl: repo.homepage?.startsWith('https://') ? repo.homepage : null,
        })),
      )
      .onConflictDoUpdate({
        target: chartEntities.id,
        set: {
          name: sql`excluded.name`,
          description: sql`excluded.description`,
          sourceUrl: sql`excluded.source_url`,
          websiteUrl: sql`excluded.website_url`,
          updatedAt: sql`now()`,
        },
      });
    await tx
      .insert(githubProjects)
      .values(
        values.map(({ repo, id, entityId }) => ({
          id,
          entityId,
          githubId: repo.id,
          owner: repo.owner.login,
          repo: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          homepage: repo.homepage ?? null,
          language: repo.language,
          githubCreatedAt: repo.created_at,
          githubUpdatedAt: repo.updated_at,
          pushedAt: repo.pushed_at,
          defaultBranch: repo.default_branch,
          archived: repo.archived,
          fork: repo.fork,
          disabled: repo.disabled,
        })),
      )
      .onConflictDoUpdate({
        target: githubProjects.githubId,
        set: {
          owner: sql`excluded.owner`,
          repo: sql`excluded.repo`,
          fullName: sql`excluded.full_name`,
          description: sql`excluded.description`,
          homepage: sql`excluded.homepage`,
          language: sql`excluded.primary_language`,
          githubUpdatedAt: sql`excluded.github_updated_at`,
          pushedAt: sql`excluded.github_pushed_at`,
          archived: sql`excluded.archived`,
          fork: sql`excluded.fork`,
          disabled: sql`excluded.disabled`,
          defaultBranch: sql`excluded.default_branch`,
        },
      });
  });
  return values.filter((value) => !byGithubId.has(value.repo.id)).length;
}
export function asDaily(row: typeof githubDailySnapshots.$inferSelect): DailyGithubSnapshot {
  return {
    projectId: row.projectId,
    date: row.date,
    stars: row.stars,
    forks: row.forks,
    watchers: row.watchers,
    openIssues: row.openIssues,
    contributors: row.contributors,
    commits: row.commits,
    releases: row.releases,
    pushedAt: row.pushedAt ? new Date(row.pushedAt).toISOString() : null,
    collectedAt: new Date(row.collectedAt).toISOString(),
  };
}
export function asProject(
  repo: typeof githubProjects.$inferSelect,
  entity: typeof chartEntities.$inferSelect,
): GithubChartProject {
  return {
    id: repo.id,
    entityId: repo.entityId,
    slug: entity.slug,
    name: entity.name,
    description: repo.description,
    category: entity.category,
    fullName: repo.fullName,
    language: repo.language,
    createdAt: repo.githubCreatedAt,
    status: repo.status,
    manualStatus: repo.manualStatus,
    archived: repo.archived,
    fork: repo.fork,
    disabled: repo.disabled,
  };
}
export async function collectionBatch(date: string, limit = 100, afterId?: string) {
  return getDb()
    .select({ repo: githubProjects, entity: chartEntities })
    .from(githubProjects)
    .innerJoin(chartEntities, eq(chartEntities.id, githubProjects.entityId))
    .where(
      and(
        eq(chartEntities.active, true),
        afterId ? gt(githubProjects.id, afterId) : undefined,
        or(
          and(
            isNull(githubProjects.manualStatus),
            inArray(githubProjects.status, ['tracked', 'candidate']),
          ),
          inArray(githubProjects.manualStatus, ['tracked', 'candidate']),
        ),
        notExists(
          getDb()
            .select({ id: githubDailySnapshots.id })
            .from(githubDailySnapshots)
            .where(
              and(
                eq(githubDailySnapshots.projectId, githubProjects.id),
                eq(githubDailySnapshots.date, date),
              ),
            ),
        ),
      ),
    )
    .orderBy(githubProjects.id)
    .limit(limit);
}
export async function recentDailySnapshots(
  projectIds: string[],
  date: string,
  days = 17,
): Promise<DailyGithubSnapshot[]> {
  if (projectIds.length === 0) return [];
  return (
    await getDb()
      .select()
      .from(githubDailySnapshots)
      .where(
        and(
          inArray(githubDailySnapshots.projectId, projectIds),
          gte(githubDailySnapshots.date, dateDaysAgo(date, days)),
          sql`${githubDailySnapshots.date} <= ${date}`,
        ),
      )
      .orderBy(githubDailySnapshots.date)
  ).map(asDaily);
}
export async function saveDailyBatch(snapshots: DailyGithubSnapshot[]): Promise<number> {
  if (snapshots.length === 0) return 0;
  const inserted = await getDb()
    .insert(githubDailySnapshots)
    .values(snapshots.map((item) => ({ ...item, id: randomUUID(), source: 'github' })))
    .onConflictDoNothing()
    .returning({ id: githubDailySnapshots.id });
  return inserted.length;
}
export async function setRepositoryError(id: string, message: string): Promise<void> {
  await getDb()
    .update(githubProjects)
    .set({ lastError: message.slice(0, 1000) })
    .where(eq(githubProjects.id, id));
}
export async function markSynced(ids: string[], at: string): Promise<void> {
  if (ids.length)
    await getDb()
      .update(githubProjects)
      .set({ lastSyncedAt: at, lastError: null })
      .where(inArray(githubProjects.id, ids));
}
export async function promoteCandidates(ids: string[]): Promise<void> {
  if (ids.length)
    await getDb()
      .update(githubProjects)
      .set({ status: 'tracked' })
      .where(
        and(
          inArray(githubProjects.id, ids),
          eq(githubProjects.status, 'candidate'),
          isNull(githubProjects.manualStatus),
        ),
      );
}
export async function modifyChartRepository(
  id: string,
  changes: {
    status?: TrackingStatus | null | undefined;
    category?: string | undefined;
    featured?: boolean | undefined;
  },
): Promise<void> {
  await getDb().transaction(async (tx) => {
    const project = (
      await tx.select().from(githubProjects).where(eq(githubProjects.id, id)).limit(1)
    )[0];
    if (!project) throw new Error('Dépôt introuvable.');
    if (changes.status !== undefined)
      await tx
        .update(githubProjects)
        .set({ manualStatus: changes.status })
        .where(eq(githubProjects.id, id));
    if (changes.category !== undefined || changes.featured !== undefined)
      await tx
        .update(chartEntities)
        .set({
          ...(changes.category !== undefined ? { category: changes.category } : {}),
          ...(changes.featured !== undefined ? { featured: changes.featured } : {}),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(chartEntities.id, project.entityId));
  });
}

export async function beginChartsJob(kind: string): Promise<string | null> {
  const db = getDb();
  await db
    .update(chartsJobRuns)
    .set({
      status: 'failed',
      finishedAt: new Date().toISOString(),
      details: ['Exécution interrompue ou bail expiré.'],
    })
    .where(
      and(
        eq(chartsJobRuns.kind, kind),
        eq(chartsJobRuns.status, 'running'),
        lt(chartsJobRuns.startedAt, new Date(Date.now() - 15 * 60000).toISOString()),
      ),
    );
  const id = randomUUID();
  const inserted = await db
    .insert(chartsJobRuns)
    .values({ id, kind, status: 'running' })
    .onConflictDoNothing()
    .returning({ id: chartsJobRuns.id });
  return inserted.length ? id : null;
}
export async function finishChartsJob(
  id: string,
  summary: {
    processed: number;
    succeeded: number;
    failed: number;
    status: string;
    details: string[];
  },
): Promise<void> {
  await getDb()
    .update(chartsJobRuns)
    .set({
      processed: summary.processed,
      succeeded: summary.succeeded,
      failed: summary.failed,
      status: summary.status,
      details: summary.details,
      finishedAt: new Date().toISOString(),
    })
    .where(eq(chartsJobRuns.id, id));
}
export async function weeklyCandidates(date: string, config: GithubChartConfig) {
  const projects = await getDb()
    .select({ repo: githubProjects, entity: chartEntities, snapshot: githubDailySnapshots })
    .from(githubProjects)
    .innerJoin(chartEntities, eq(chartEntities.id, githubProjects.entityId))
    .innerJoin(
      githubDailySnapshots,
      and(
        eq(githubDailySnapshots.projectId, githubProjects.id),
        eq(githubDailySnapshots.date, date),
      ),
    )
    .where(eq(chartEntities.active, true));
  const history = await recentDailySnapshots(
    projects.map((item) => item.repo.id),
    date,
  );
  const byProject = new Map<string, DailyGithubSnapshot[]>();
  for (const snapshot of history) {
    const list = byProject.get(snapshot.projectId) ?? [];
    list.push(snapshot);
    byProject.set(snapshot.projectId, list);
  }
  return projects.map((item) => {
    const project = asProject(item.repo, item.entity);
    return {
      project,
      metrics: githubMetrics(
        project,
        asDaily(item.snapshot),
        byProject.get(item.repo.id) ?? [],
        config,
      ),
    };
  });
}
export async function readLiveWeeklySnapshots(publishedOnly = true): Promise<Snapshot[]> {
  requireChartsDatabase();
  const editions = await getDb()
    .select()
    .from(weeklyChartEditions)
    .where(publishedOnly ? isNotNull(weeklyChartEditions.publishedAt) : undefined)
    .orderBy(weeklyChartEditions.week);
  return editions.map((edition) =>
    snapshotSchema.parse({
      ...edition.payload,
      publishedAt: edition.publishedAt
        ? new Date(edition.publishedAt).toISOString()
        : edition.payload.publishedAt,
    }),
  );
}
export async function freezeWeeklyCharts(
  week: string,
  date: string,
  config: GithubChartConfig,
  rankings: { chart: 'github' | 'rising'; entries: GithubScoredEntry[] }[],
  publish: boolean,
): Promise<number> {
  const db = getDb();
  let written = 0;
  await db.transaction(async (tx) => {
    for (const ranking of rankings) {
      if (ranking.entries.length === 0) continue;
      const previous = (
        await tx
          .select()
          .from(weeklyChartEditions)
          .where(
            and(
              eq(weeklyChartEditions.chart, ranking.chart),
              eq(weeklyChartEditions.week, previousWeek(week)),
              isNotNull(weeklyChartEditions.publishedAt),
            ),
          )
          .limit(1)
      )[0];
      const previousEntries = previous?.payload.entries ?? [];
      const publishedAt = new Date().toISOString();
      const entries = ranking.entries.map((item) => ({
        entity: item.project.slug,
        rank: item.rank,
        score: item.score,
        dimensions: {
          ...Object.fromEntries(
            Object.entries(item.components).filter(
              (pair): pair is [string, number] => pair[1] !== null,
            ),
          ),
          [ranking.chart === 'github' ? 'momentum' : 'discovery']: item.score,
        },
        metrics: Object.fromEntries(
          Object.entries({
            stars: item.metrics.stars,
            stars7d: item.metrics.stars7d,
            growth: item.metrics.growthPercentage,
            forks: item.metrics.forks,
            forks7d: item.metrics.forks7d,
            contributors: item.metrics.contributors,
            contributorsDelta: item.metrics.contributorsDelta,
            activityScore: item.metrics.activityScore,
            acceleration: item.metrics.acceleration,
          }).filter((pair): pair is [string, number] => pair[1] !== null),
        ),
      }));
      const payload = snapshotSchema.parse({
        chart: ranking.chart,
        week,
        publishedAt,
        retrievedAt:
          ranking.entries
            .map((item) => item.metrics.collectedAt)
            .sort()
            .at(-1) ?? `${date}T00:00:00Z`,
        provenance: 'auto',
        entries,
      });
      const id = randomUUID();
      const inserted = await tx
        .insert(weeklyChartEditions)
        .values({
          id,
          chart: ranking.chart,
          week,
          scoringVersion: ranking.chart === 'github' ? config.version : config.risingVersion,
          config,
          payload,
          publishedAt: publish ? publishedAt : null,
        })
        .onConflictDoNothing()
        .returning({ id: weeklyChartEditions.id });
      if (!inserted.length) continue;
      await tx.insert(weeklyRankings).values(
        ranking.entries.map((item) => ({
          id: randomUUID(),
          editionId: id,
          entityId: item.project.entityId,
          rank: item.rank,
          score: item.score,
          ...weeklyGithubMovement(item.project.slug, item.rank, previousEntries),
          metadata: {
            source: 'github',
            rawMetrics: item.metrics,
            components: item.components,
            weights: item.weights,
            coverage: item.coverage,
            scoringVersion: ranking.chart === 'github' ? config.version : config.risingVersion,
            project: item.project,
          },
        })),
      );
      written++;
    }
  });
  return written;
}
export async function publishFrozenCharts(week: string): Promise<number> {
  return (
    await getDb()
      .update(weeklyChartEditions)
      .set({ publishedAt: new Date().toISOString() })
      .where(and(eq(weeklyChartEditions.week, week), isNull(weeklyChartEditions.publishedAt)))
      .returning({ id: weeklyChartEditions.id })
  ).length;
}
export async function liveChartEntities(slugs: string[]) {
  if (!slugs.length) return [];
  return getDb()
    .select({ entity: chartEntities, repo: githubProjects })
    .from(chartEntities)
    .leftJoin(githubProjects, eq(githubProjects.entityId, chartEntities.id))
    .where(inArray(chartEntities.slug, slugs));
}
export async function chartCatalog(page = 0, status?: TrackingStatus, search = '') {
  const condition = and(
    status
      ? sql`coalesce(${githubProjects.manualStatus}, ${githubProjects.status}) = ${status}`
      : undefined,
    search ? ilike(githubProjects.fullName, `%${search}%`) : undefined,
  );
  const repos = await getDb()
    .select({ repo: githubProjects, entity: chartEntities })
    .from(githubProjects)
    .innerJoin(chartEntities, eq(chartEntities.id, githubProjects.entityId))
    .where(condition)
    .orderBy(githubProjects.fullName)
    .limit(50)
    .offset(page * 50);
  const total =
    (
      await getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(githubProjects)
        .where(condition)
    )[0]?.count ?? 0;
  const snapshots = await recentDailySnapshots(
    repos.map((item) => item.repo.id),
    utcDate(),
  );
  return { repos, total, snapshots };
}
export async function chartsJobDashboard() {
  const db = getDb();
  const counts = await db
    .select({
      status: sql<string>`coalesce(${githubProjects.manualStatus}, ${githubProjects.status})`,
      count: sql<number>`count(*)::int`,
    })
    .from(githubProjects)
    .groupBy(sql`coalesce(${githubProjects.manualStatus}, ${githubProjects.status})`);
  const snapshotsToday =
    (
      await db
        .select({ count: sql<number>`count(*)::int` })
        .from(githubDailySnapshots)
        .where(eq(githubDailySnapshots.date, utcDate()))
    )[0]?.count ?? 0;
  const jobs = await db
    .select()
    .from(chartsJobRuns)
    .orderBy(desc(chartsJobRuns.startedAt))
    .limit(20);
  return {
    counts: Object.fromEntries(counts.map((item) => [item.status, item.count])),
    snapshotsToday,
    jobs,
  };
}

const GITHUB_HISTORY_DAYS = 7;

function isMissingChartsTable(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof current !== 'object' || current === null) return false;
    const candidate = current as { code?: unknown; cause?: unknown };
    if (candidate.code === '42P01') return true;
    current = candidate.cause;
  }
  return false;
}

function emptyChartsProgress(databaseReady: boolean): ChartsCollectionProgress {
  return {
    databaseReady,
    trackedRepositories: 0,
    snapshotsToday: 0,
    distinctSnapshotDays: 0,
    requiredHistoryDays: GITHUB_HISTORY_DAYS,
    lastSuccessfulCollectAt: null,
    earliestPossibleEditionWeek: null,
  };
}

/** Avancement public de la collecte GitHub, sans noms de dépôts ni scores. */
export async function readChartsCollectionProgress(): Promise<ChartsCollectionProgress> {
  if (!hasDatabaseConfiguration()) return emptyChartsProgress(false);
  try {
    const db = getDb();
    const [trackedRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(githubProjects)
      .where(sql`coalesce(${githubProjects.manualStatus}, ${githubProjects.status}) = 'tracked'`);
    const [todayRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(githubDailySnapshots)
      .where(eq(githubDailySnapshots.date, utcDate()));
    const [dayStats] = await db
      .select({
        distinctDays: sql<number>`count(distinct ${githubDailySnapshots.date})::int`,
        firstDate: sql<string | null>`min(${githubDailySnapshots.date})`,
      })
      .from(githubDailySnapshots);
    const [lastJob] = await db
      .select({ finishedAt: chartsJobRuns.finishedAt })
      .from(chartsJobRuns)
      .where(
        and(
          eq(chartsJobRuns.status, 'success'),
          isNotNull(chartsJobRuns.finishedAt),
          sql`${chartsJobRuns.kind} in ('github_daily_sync', 'skills_daily_sync', 'models_daily_sync')`,
        ),
      )
      .orderBy(desc(chartsJobRuns.finishedAt))
      .limit(1);

    const firstDate = dayStats?.firstDate ?? null;
    let earliestPossibleEditionWeek: string | null = null;
    if (firstDate) {
      const readyAt = new Date(
        Date.parse(`${firstDate}T00:00:00Z`) + GITHUB_HISTORY_DAYS * 86_400_000,
      );
      earliestPossibleEditionWeek = isoWeekOf(readyAt);
    }

    return {
      databaseReady: true,
      trackedRepositories: trackedRow?.count ?? 0,
      snapshotsToday: todayRow?.count ?? 0,
      distinctSnapshotDays: dayStats?.distinctDays ?? 0,
      requiredHistoryDays: GITHUB_HISTORY_DAYS,
      lastSuccessfulCollectAt: lastJob?.finishedAt ?? null,
      earliestPossibleEditionWeek,
    };
  } catch (error) {
    if (isMissingChartsTable(error)) return emptyChartsProgress(false);
    throw error;
  }
}
