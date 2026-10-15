import { emptyRanking, githubBadgeIdSchema, RANK_MAX_AGE_MS } from '@/domain/badges';
import { badgeResponse } from '@/lib/badges-http';
import { readRankingBadge } from '@/lib/badges-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!githubBadgeIdSchema.safeParse(id).success)
    return badgeResponse(
      request,
      { kind: 'ranking', eligibility: emptyRanking('unavailable') },
      400,
      60,
    );
  try {
    const now = new Date();
    const result = await readRankingBadge(id, now);
    const { eligibility } = result;
    const status = eligibility.status === 'unavailable' ? 503 : result.project ? 200 : 404;
    const remaining = eligibility.asOf
      ? Math.floor((Date.parse(eligibility.asOf) + RANK_MAX_AGE_MS - now.getTime()) / 1000)
      : 300;
    return badgeResponse(
      request,
      { kind: 'ranking', eligibility },
      status,
      eligibility.status === 'stale' ? 60 : Math.max(0, Math.min(300, remaining)),
    );
  } catch (error) {
    console.error(
      'Sandbox ranking badge unavailable:',
      error instanceof Error ? error.name : 'unknown',
    );
    return badgeResponse(
      request,
      { kind: 'ranking', eligibility: emptyRanking('unavailable') },
      503,
    );
  }
}
export const HEAD = GET;
