import { and, desc, eq, ne, sql } from 'drizzle-orm';
import { getDb } from '../db/client.ts';
import { chartsJobRuns } from '../db/schema.ts';
import {
  GITHUB_DISCOVERY_CURSOR_PREFIX,
  readGithubDiscoveryCursor,
} from '../domain/github-discovery-progress.ts';

/** Le verrou est acquis avant cette lecture ; les jobs coupés sans marker sont ignorés. */
export async function loadGithubDiscoveryCursor(
  date: string,
  queries: readonly string[],
  options: { excludeJobId?: string } = {},
) {
  const [row] = await getDb()
    .select({ details: chartsJobRuns.details })
    .from(chartsJobRuns)
    .where(
      and(
        eq(chartsJobRuns.kind, 'github_discovery'),
        options.excludeJobId ? ne(chartsJobRuns.id, options.excludeJobId) : undefined,
        sql`${chartsJobRuns.details}::text LIKE ${'%' + GITHUB_DISCOVERY_CURSOR_PREFIX + '%'}`,
      ),
    )
    .orderBy(desc(chartsJobRuns.startedAt))
    .limit(1);
  return readGithubDiscoveryCursor(row?.details, date, queries);
}

/** L'upsert des dépôts précède ce checkpoint ; un rejeu après coupure reste idempotent. */
export async function saveGithubDiscoveryCheckpoint(jobId: string, details: readonly string[]) {
  await getDb()
    .update(chartsJobRuns)
    .set({ details: [...details] })
    .where(eq(chartsJobRuns.id, jobId));
}
