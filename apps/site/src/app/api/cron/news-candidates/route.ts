import { timingSafeEqual } from 'node:crypto';
import { newsQueueRequestSchema, newsPendingSchema } from '@/domain/news-queue';
import { newsPublicEnabled, readPublishedNews } from '@/lib/news-store';
import { NEWS_MEDIA } from '@/domain/news-media';
import {
  enqueueNewsCandidates,
  readPendingNewsCandidates,
  completeNewsCandidates,
  claimNewsCandidates,
  readNewsBacklog,
} from '@/lib/news-candidates-store';
import { readLimitedRequestText, RequestBodyTooLargeError } from '@/lib/request-body';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function authorized(request: Request): boolean {
  const secret = process.env['CRON_SECRET'];
  const received = request.headers.get('authorization') ?? '';
  const expected = secret ? `Bearer ${secret}` : '';
  return (
    !!secret &&
    secret.length >= 16 &&
    Buffer.byteLength(received) === Buffer.byteLength(expected) &&
    timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  );
}
export async function GET(request: Request): Promise<Response> {
  if (!newsPublicEnabled()) return new Response(null, { status: 404 });
  if (!authorized(request)) return Response.json({ error: 'Accès refusé.' }, { status: 401 });
  return pendingResponse(false);
}
async function pendingResponse(claim: boolean): Promise<Response> {
  try {
    const [batch, feed, backlog] = await Promise.all([
      claim
        ? claimNewsCandidates()
        : readPendingNewsCandidates().then((items) => ({ items, leaseId: null })),
      readPublishedNews(),
      readNewsBacklog(),
    ]);
    const statuses = new Map(feed.sources.map((source) => [source.url, source]));
    const sources = NEWS_MEDIA.map((source) => {
      const status = statuses.get(source.url);
      return {
        id: source.id,
        name: source.name,
        url: source.url,
        ok: status?.ok ?? false,
        ...(status?.reason
          ? { reason: status.reason }
          : !status
            ? { reason: 'Première collecte attendue' }
            : {}),
      };
    });
    return Response.json(
      newsPendingSchema.parse({
        protocolVersion: 2,
        backlog,
        items: batch.items,
        leaseId: batch.leaseId,
        sources,
        checkedAt: feed.checkedAt ?? new Date().toISOString(),
      }),
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { error: 'File News indisponible. Vérifiez les migrations 0017 et 0018.' },
      { status: 503 },
    );
  }
}
export async function POST(request: Request): Promise<Response> {
  if (!newsPublicEnabled()) return new Response(null, { status: 404 });
  if (!authorized(request)) return Response.json({ error: 'Accès refusé.' }, { status: 401 });
  let value: unknown;
  try {
    value = JSON.parse(await readLimitedRequestText(request, 256_000));
  } catch (error) {
    return Response.json(
      { error: 'Lot News invalide.' },
      { status: error instanceof RequestBodyTooLargeError ? 413 : 400 },
    );
  }
  const parsed = newsQueueRequestSchema.safeParse(value);
  if (!parsed.success) return Response.json({ error: 'Lot News hors registre.' }, { status: 422 });
  if (parsed.data.action === 'claim') return pendingResponse(true);
  try {
    if (parsed.data.action === 'collect')
      return Response.json({ inserted: await enqueueNewsCandidates(parsed.data.items) });
    await completeNewsCandidates(parsed.data.published, parsed.data.skipped, parsed.data.leaseId);
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: 'File News indisponible. Vérifiez les migrations 0017 et 0018.' },
      { status: 503 },
    );
  }
}
