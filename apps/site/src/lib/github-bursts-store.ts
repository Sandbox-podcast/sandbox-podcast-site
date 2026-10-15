import { createHash, randomUUID } from 'node:crypto';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { getDb, hasDatabaseConfiguration } from '../db/client.ts';
import {
  chartEntities,
  githubProjects,
  githubStarObservations,
  githubBurstEvents,
  githubTrendingObservations,
} from '../db/schema.ts';
import {
  starObservationSchema,
  type GithubBurst,
  type StarObservation,
} from '../domain/github-bursts.ts';
import { OPEN_SOURCE_LICENSE_IDS } from '../domain/reference-adapters.ts';
import { readChartsConfig } from './charts-store.ts';

export async function burstCollectionBatch(limit: number, now: string) {
  const config = await readChartsConfig();
  const rows = await getDb()
    .select({ repo: githubProjects, entity: chartEntities })
    .from(githubProjects)
    .innerJoin(chartEntities, eq(chartEntities.id, githubProjects.entityId))
    .where(
      and(
        eq(chartEntities.active, true),
        eq(githubProjects.archived, false),
        eq(githubProjects.fork, false),
        eq(githubProjects.disabled, false),
        sql`coalesce(${githubProjects.manualStatus}, ${githubProjects.status}) IN ('candidate', 'tracked')`,
        inArray(chartEntities.license, [...OPEN_SOURCE_LICENSE_IDS]),
        ...config.blacklist.map(
          (name) => sql`lower(${githubProjects.fullName}) <> ${name.toLowerCase()}`,
        ),
      ),
    )
    .orderBy(
      sql`coalesce((select max(observed_at) from github_star_observations where github_project_id = ${githubProjects.id} and observed_at <= ${now}), '1970-01-01'::timestamptz)`,
      desc(githubProjects.githubUpdatedAt),
      githubProjects.id,
    )
    .limit(limit);
  return rows;
}
export async function starObservationHistory(
  projectIds: string[],
  now: string,
): Promise<StarObservation[]> {
  if (!projectIds.length) return [];
  const from = new Date(Date.parse(now) - 60 * 3600000).toISOString();
  const rows = await getDb()
    .select()
    .from(githubStarObservations)
    .where(
      and(
        inArray(githubStarObservations.projectId, projectIds),
        gte(githubStarObservations.observedAt, from),
        lte(githubStarObservations.observedAt, now),
      ),
    )
    .orderBy(githubStarObservations.observedAt);
  return rows.map((row) => ({
    projectId: row.projectId,
    stars: row.stars,
    observedAt: new Date(row.observedAt).toISOString(),
  }));
}
export async function saveBurstBatch(
  observations: StarObservation[],
  events: GithubBurst[],
): Promise<{ observations: number; events: number }> {
  const parsed = observations.map((row) => starObservationSchema.parse(row));
  for (const event of events)
    if (
      !parsed.some(
        (row) =>
          row.projectId === event.projectId &&
          row.observedAt === event.observedAt &&
          row.stars === event.stars,
      )
    )
      throw new Error('Signal sans relevé correspondant.');
  return getDb().transaction(async (tx) => {
    const saved = parsed.length
      ? await tx
          .insert(githubStarObservations)
          .values(parsed.map((row) => ({ ...row, id: randomUUID() })))
          .onConflictDoNothing()
          .returning({ id: githubStarObservations.id })
      : [];
    const signals = events.length
      ? await tx
          .insert(githubBurstEvents)
          .values(
            events.map((event) => ({
              id: randomUUID(),
              projectId: event.projectId,
              observedAt: event.observedAt,
              windowHours: event.windowHours,
              evidence: event,
            })),
          )
          .onConflictDoNothing()
          .returning({ id: githubBurstEvents.id })
      : [];
    if (signals.length)
      await tx
        .update(githubProjects)
        .set({ status: 'tracked' })
        .where(
          and(
            inArray(
              githubProjects.id,
              events.map((event) => event.projectId),
            ),
            eq(githubProjects.status, 'candidate'),
            sql`${githubProjects.manualStatus} IS NULL`,
          ),
        );
    return { observations: saved.length, events: signals.length };
  });
}
export async function saveTrendingObservation(
  repositories: string[],
  observedAt: string,
): Promise<number> {
  const inserted = await getDb()
    .insert(githubTrendingObservations)
    .values({
      id: randomUUID(),
      observedAt,
      repositories,
      sha256: createHash('sha256').update(JSON.stringify(repositories)).digest('hex'),
    })
    .onConflictDoNothing()
    .returning({ id: githubTrendingObservations.id });
  return inserted.length;
}

export async function publicGithubBursts(now = new Date()) {
  if (process.env['CHARTS_BURST_COLLECTION_ENABLED'] !== 'true')
    return { status: 'disabled' as const, observedAt: null, entries: [] };
  if (!hasDatabaseConfiguration())
    return { status: 'pending' as const, observedAt: null, entries: [] };
  const from = new Date(now.getTime() - 24 * 3600000).toISOString();
  const config = await readChartsConfig();
  const rows = await getDb()
    .select({ event: githubBurstEvents, entity: chartEntities, repo: githubProjects })
    .from(githubBurstEvents)
    .innerJoin(githubProjects, eq(githubProjects.id, githubBurstEvents.projectId))
    .innerJoin(chartEntities, eq(chartEntities.id, githubProjects.entityId))
    .where(
      and(
        gte(githubBurstEvents.observedAt, from),
        lte(githubBurstEvents.observedAt, now.toISOString()),
        eq(chartEntities.active, true),
        eq(githubProjects.archived, false),
        eq(githubProjects.fork, false),
        eq(githubProjects.disabled, false),
        sql`coalesce(${githubProjects.manualStatus}, ${githubProjects.status}) = 'tracked'`,
        inArray(chartEntities.license, [...OPEN_SOURCE_LICENSE_IDS]),
        ...config.blacklist.map(
          (name) => sql`lower(${githubProjects.fullName}) <> ${name.toLowerCase()}`,
        ),
      ),
    )
    .orderBy(desc(githubBurstEvents.observedAt))
    .limit(1000);
  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const previous = latest.get(row.repo.id);
    if (
      !previous ||
      (row.event.observedAt === previous.event.observedAt &&
        row.event.evidence.starsPerHour > previous.event.evidence.starsPerHour)
    )
      latest.set(row.repo.id, row);
  }
  const entries = [...latest.values()]
    .toSorted(
      (a, b) =>
        b.event.evidence.starsPerHour - a.event.evidence.starsPerHour ||
        a.entity.slug.localeCompare(b.entity.slug),
    )
    .slice(0, 20)
    .map(({ event, entity, repo }) => ({
      slug: entity.slug,
      name: entity.name,
      fullName: repo.fullName,
      githubUrl: `https://github.com/${repo.fullName}`,
      ...event.evidence,
    }));
  return {
    status: entries.length ? ('ready' as const) : ('pending' as const),
    observedAt: rows[0]?.event.observedAt ?? null,
    entries,
  };
}
