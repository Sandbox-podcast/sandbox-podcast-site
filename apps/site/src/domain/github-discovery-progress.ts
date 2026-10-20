import { createHash } from 'node:crypto';
import { z } from 'zod';

export const GITHUB_DISCOVERY_PAGE_LIMIT = 2;
export const GITHUB_DISCOVERY_CURSOR_PREFIX = 'github-discovery-cursor-v1:';
export const githubDiscoveryCursorSchema = z
  .object({
    version: z.literal(1),
    date: z.iso.date(),
    planHash: z.string().regex(/^[a-f0-9]{64}$/),
    queryIndex: z.number().int().min(0).max(100),
    page: z.number().int().min(1).max(GITHUB_DISCOVERY_PAGE_LIMIT),
  })
  .strict();
export type GithubDiscoveryCursor = z.infer<typeof githubDiscoveryCursorSchema>;

export function initialGithubDiscoveryCursor(
  date: string,
  queries: readonly string[],
): GithubDiscoveryCursor {
  z.iso.date().parse(date);
  if (!queries.length || queries.length > 100) throw new Error('Plan de découverte invalide.');
  return {
    version: 1,
    date,
    planHash: createHash('sha256').update(JSON.stringify(queries)).digest('hex'),
    queryIndex: 0,
    page: 1,
  };
}
export function readGithubDiscoveryCursor(
  details: unknown,
  date: string,
  queries: readonly string[],
): GithubDiscoveryCursor {
  const initial = initialGithubDiscoveryCursor(date, queries);
  const strings = z.array(z.string()).safeParse(details);
  const marker = strings.success
    ? strings.data.find((line) => line.startsWith(GITHUB_DISCOVERY_CURSOR_PREFIX))
    : undefined;
  if (!marker) return initial;
  let value: unknown;
  try {
    value = JSON.parse(marker.slice(GITHUB_DISCOVERY_CURSOR_PREFIX.length));
  } catch {
    return initial;
  }
  const parsed = githubDiscoveryCursorSchema.safeParse(value);
  return parsed.success &&
    parsed.data.date === initial.date &&
    parsed.data.planHash === initial.planHash &&
    parsed.data.queryIndex <= queries.length &&
    (parsed.data.queryIndex < queries.length || parsed.data.page === 1)
    ? parsed.data
    : initial;
}
export function githubDiscoveryCursorDetails(
  details: readonly string[],
  cursor: GithubDiscoveryCursor,
): string[] {
  return [
    ...details.filter((line) => !line.startsWith(GITHUB_DISCOVERY_CURSOR_PREFIX)),
    GITHUB_DISCOVERY_CURSOR_PREFIX + JSON.stringify(githubDiscoveryCursorSchema.parse(cursor)),
  ];
}
export function advanceGithubDiscoveryCursor(
  cursor: GithubDiscoveryCursor,
  next: boolean,
): GithubDiscoveryCursor {
  return next && cursor.page < GITHUB_DISCOVERY_PAGE_LIMIT
    ? { ...cursor, page: cursor.page + 1 }
    : { ...cursor, queryIndex: cursor.queryIndex + 1, page: 1 };
}

export const githubDiscoveryContinuationSchema = z
  .object({
    reason: z.literal('budget'),
    from: githubDiscoveryCursorSchema,
    next: githubDiscoveryCursorSchema,
  })
  .strict();
export type GithubDiscoveryContinuation = z.infer<typeof githubDiscoveryContinuationSchema>;
export function githubDiscoveryCursorAdvances(
  from: GithubDiscoveryCursor,
  next: GithubDiscoveryCursor,
): boolean {
  return (
    from.date === next.date &&
    from.planHash === next.planHash &&
    (next.queryIndex > from.queryIndex ||
      (next.queryIndex === from.queryIndex && next.page > from.page))
  );
}

export const githubDiscoveryProgressSchema = z
  .object({
    from: githubDiscoveryCursorSchema,
    next: githubDiscoveryCursorSchema,
    partitions: z.number().int().min(1).max(100),
    complete: z.boolean(),
  })
  .strict();
export type GithubDiscoveryProgress = z.infer<typeof githubDiscoveryProgressSchema>;
export function githubDiscoveryCursorEquals(
  left: GithubDiscoveryCursor,
  right: GithubDiscoveryCursor,
): boolean {
  return (
    left.date === right.date &&
    left.planHash === right.planHash &&
    left.queryIndex === right.queryIndex &&
    left.page === right.page
  );
}
