import { createHash } from 'node:crypto';
import { awardWeekSchema } from '@/domain/badges';
import { readBadgeAwardEdition } from '@/lib/badges-store';
import { awardCard } from '@/lib/og';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(request: Request, { params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  const headers = new Headers({
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex',
    'Cache-Control': 'no-store',
  });
  const failure = (status: number) => {
    headers.set('Content-Type', 'text/plain; charset=utf-8');
    headers.delete('ETag');
    return new Response(request.method === 'HEAD' ? null : 'Image indisponible.', {
      status,
      headers,
    });
  };
  if (!awardWeekSchema.safeParse(week).success) return failure(400);
  try {
    const award = await readBadgeAwardEdition(week);
    if (!award) return failure(404);
    const etag = `"${createHash('sha256')
      .update(JSON.stringify(['award-card-v1', award.evidenceHash, award.name, award.withdrawnAt]))
      .digest('hex')}"`;
    const status = award.withdrawnAt ? 410 : 200;
    const maxAge = award.withdrawnAt ? 60 : 86400;
    headers.set('Content-Type', 'image/png');
    headers.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}, must-revalidate`);
    headers.set('ETag', etag);
    const matched = request.headers
      .get('if-none-match')
      ?.split(',')
      .some((value) => value.trim().replace(/^W\//, '') === etag || value.trim() === '*');
    if (status === 200 && matched) return new Response(null, { status: 304, headers });
    if (request.method === 'HEAD') return new Response(null, { status, headers });
    const rendered = await awardCard(award);
    return new Response(await rendered.arrayBuffer(), { status, headers });
  } catch (error) {
    console.error(
      'Sandbox award image unavailable:',
      error instanceof Error ? error.name : 'unknown',
    );
    headers.set('Cache-Control', 'no-store');
    return failure(503);
  }
}
export const HEAD = GET;
