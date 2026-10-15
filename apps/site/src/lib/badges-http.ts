import { createHash } from 'node:crypto';
import { badgeSvg, type BadgeVisual } from '../domain/badges.ts';

export function badgeResponse(
  request: Request,
  visual: BadgeVisual,
  status = 200,
  maxAge = 300,
): Response {
  const svg = badgeSvg(visual);
  const etag = `"${createHash('sha256').update(svg).digest('hex')}"`;
  const headers = new Headers({
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Cache-Control':
      status >= 500 ? 'no-store' : `public, max-age=${maxAge}, s-maxage=${maxAge}, must-revalidate`,
    ETag: etag,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; style-src 'none'; sandbox",
    'Referrer-Policy': 'no-referrer',
    'X-Robots-Tag': 'noindex',
    'Access-Control-Allow-Origin': '*',
  });
  const matched = request.headers
    .get('if-none-match')
    ?.split(',')
    .some((value) => value.trim().replace(/^W\//, '') === etag || value.trim() === '*');
  if (status === 200 && matched) return new Response(null, { status: 304, headers });
  return new Response(request.method === 'HEAD' ? null : svg, { status, headers });
}
