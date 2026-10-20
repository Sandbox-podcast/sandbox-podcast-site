import { z } from 'zod';
import {
  githubDiscoveryContinuationSchema,
  githubDiscoveryCursorAdvances,
  githubDiscoveryCursorEquals,
  githubDiscoveryProgressSchema,
  type GithubDiscoveryCursor,
} from '../domain/github-discovery-progress.ts';

export const CHARTS_DISCOVERY_REQUEST_TIMEOUT_MS = 360_000;
export const CHARTS_DISCOVERY_RUNNER_BUDGET_MS = 900_000;
const summarySchema = z.object({
  status: z.enum(['success', 'skipped', 'partial', 'failed']),
  processed: z.number().int().nonnegative(),
  succeeded: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  filtered: z.number().int().nonnegative().optional(),
  skipReason: z.literal('disabled').optional(),
  remaining: z.number().int().nonnegative().optional(),
  continuation: githubDiscoveryContinuationSchema.optional(),
  discoveryProgress: githubDiscoveryProgressSchema.optional(),
});
type Summary = z.infer<typeof summarySchema>;
interface CallResult {
  job: 'github-trending' | 'github-discovery';
  attempt: number;
  http?: number;
  ok: boolean;
  reason:
    | 'success'
    | 'partial'
    | 'job_failed'
    | 'http_error'
    | 'invalid_response'
    | 'request_failed'
    | 'budget_exhausted';
  summary?: Summary;
}

export async function runChartsDiscovery({
  origin,
  secret,
  fetch: transport,
  now = Date.now,
}: {
  origin: string;
  secret: string | undefined;
  fetch: typeof fetch;
  now?: () => number;
}) {
  const target = z.url().safeParse(origin);
  const address = target.success ? new URL(target.data) : null;
  if (
    address?.protocol !== 'https:' ||
    address.username ||
    address.password ||
    address.pathname !== '/' ||
    address.search ||
    address.hash ||
    !secret ||
    secret.length < 16
  )
    return {
      ok: false,
      reason: 'configuration' as const,
      continued: false,
      results: [] as CallResult[],
    };
  const authorization = 'Bearer ' + secret;
  const deadline = now() + CHARTS_DISCOVERY_RUNNER_BUDGET_MS;
  async function call(
    job: CallResult['job'],
    attempt: number,
    expectedFrom?: GithubDiscoveryCursor,
    expectedPartitions?: number,
  ): Promise<CallResult> {
    const left = deadline - now();
    if (left <= 0) return { job, attempt, ok: false, reason: 'budget_exhausted' };
    try {
      const response = await transport(new URL('/api/cron/' + job, address ?? undefined), {
        redirect: 'manual',
        cache: 'no-store',
        headers: { Authorization: authorization },
        signal: AbortSignal.timeout(Math.min(CHARTS_DISCOVERY_REQUEST_TIMEOUT_MS, left)),
      });
      if (response.status !== 200 && response.status !== 503)
        return { job, attempt, http: response.status, ok: false, reason: 'http_error' };
      const data = summarySchema.safeParse(await response.json().catch(() => null));
      if (!data.success)
        return { job, attempt, http: response.status, ok: false, reason: 'invalid_response' };
      const summary = data.data;
      const progress = summary.discoveryProgress;
      const completedDiscovery =
        job !== 'github-discovery' ||
        (progress?.complete === true &&
          progress.next.queryIndex === progress.partitions &&
          progress.next.page === 1 &&
          (progress.from.queryIndex < progress.partitions ||
            (progress.from.queryIndex === progress.partitions && progress.from.page === 1)) &&
          (githubDiscoveryCursorEquals(progress.from, progress.next) ||
            githubDiscoveryCursorAdvances(progress.from, progress.next)) &&
          (expectedPartitions === undefined || expectedPartitions === progress.partitions) &&
          progress.from.date === progress.next.date &&
          progress.from.planHash === progress.next.planHash &&
          (!expectedFrom || githubDiscoveryCursorEquals(expectedFrom, progress.from)) &&
          (summary.filtered ?? 0) === 0);
      const ok =
        completedDiscovery &&
        response.status === 200 &&
        ((summary.status === 'success' && summary.skipReason === undefined) ||
          (job === 'github-trending' &&
            summary.status === 'skipped' &&
            summary.skipReason === 'disabled' &&
            summary.processed === 0 &&
            summary.succeeded === 0 &&
            (summary.filtered ?? 0) === 0)) &&
        summary.failed === 0 &&
        summary.processed === summary.succeeded + (summary.filtered ?? 0) &&
        (summary.remaining === undefined || summary.remaining === 0) &&
        summary.continuation === undefined;
      return {
        job,
        attempt,
        http: response.status,
        ok,
        summary,
        reason: ok
          ? 'success'
          : response.status === 503 && summary.status === 'partial'
            ? 'partial'
            : 'job_failed',
      };
    } catch {
      return { job, attempt, ok: false, reason: 'request_failed' };
    }
  }
  const trending = await call('github-trending', 1);
  const first = await call('github-discovery', 1);
  const results = [trending, first];
  const resume = first.summary?.continuation;
  const progress = first.summary?.discoveryProgress;
  const continued =
    first.http === 503 &&
    first.reason === 'partial' &&
    first.summary?.failed === 0 &&
    first.summary.processed === first.summary.succeeded &&
    (first.summary.filtered ?? 0) === 0 &&
    progress?.complete === false &&
    (first.summary.remaining ?? 0) > 0 &&
    resume?.reason === 'budget' &&
    githubDiscoveryCursorAdvances(resume.from, resume.next) &&
    githubDiscoveryCursorEquals(progress.from, resume.from) &&
    githubDiscoveryCursorEquals(progress.next, resume.next) &&
    resume.next.queryIndex < progress.partitions &&
    first.summary.remaining ===
      (progress.partitions - resume.next.queryIndex) * 2 - (resume.next.page - 1);
  if (continued) results.push(await call('github-discovery', 2, resume.next, progress.partitions));
  return { ok: trending.ok && (results.at(-1)?.ok ?? false), continued, results };
}
