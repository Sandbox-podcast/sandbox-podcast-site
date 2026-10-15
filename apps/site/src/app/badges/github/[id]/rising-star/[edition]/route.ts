import { awardWeekSchema, githubBadgeIdSchema } from '@/domain/badges';
import { badgeResponse } from '@/lib/badges-http';
import { readAwardBadge } from '@/lib/badges-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; edition: string }> },
) {
  const { id, edition } = await params;
  const week = edition.endsWith('.svg') ? edition.slice(0, -4) : '';
  if (!githubBadgeIdSchema.safeParse(id).success || !awardWeekSchema.safeParse(week).success)
    return badgeResponse(request, { kind: 'award', week: '', status: 'missing' }, 400, 60);
  try {
    const result = await readAwardBadge(id, week);
    const status =
      result.status === 'unavailable'
        ? 503
        : result.status === 'missing'
          ? 404
          : result.status === 'withdrawn'
            ? 410
            : 200;
    // Cache long mais révocable : pas d'immuable HTTP sur un prix pouvant être retiré.
    return badgeResponse(
      request,
      { kind: 'award', week, status: result.status },
      status,
      result.status === 'awarded' ? 86400 : 60,
    );
  } catch (error) {
    console.error(
      'Sandbox award badge unavailable:',
      error instanceof Error ? error.name : 'unknown',
    );
    return badgeResponse(request, { kind: 'award', week, status: 'unavailable' }, 503);
  }
}
export const HEAD = GET;
