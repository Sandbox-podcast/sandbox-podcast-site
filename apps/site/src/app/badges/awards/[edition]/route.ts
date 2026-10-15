import { AWARD_DEFINITIONS, awardAssignmentIdSchema } from '@/domain/awards';
import { badgeResponse } from '@/lib/badges-http';
import { readPublicAward } from '@/lib/awards-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ edition: string }> }) {
  const { edition } = await params;
  const id = edition.endsWith('.svg') ? edition.slice(0, -4) : '';
  const neutral = { kind: 'distinction', label: '', period: '', status: 'missing' } as const;
  if (!awardAssignmentIdSchema.safeParse(id).success)
    return badgeResponse(request, neutral, 400, 60);
  try {
    const award = await readPublicAward(id);
    if (!award) return badgeResponse(request, neutral, 404, 60);
    return badgeResponse(
      request,
      {
        kind: 'distinction',
        label: AWARD_DEFINITIONS[award.type].label,
        period: award.period,
        scope: award.scope,
        status: award.withdrawnAt ? 'withdrawn' : 'awarded',
      },
      award.withdrawnAt ? 410 : 200,
      award.withdrawnAt ? 60 : 86400,
    );
  } catch (error) {
    console.error(
      'Sandbox award badge unavailable:',
      error instanceof Error ? error.name : 'unknown',
    );
    return badgeResponse(request, { ...neutral, status: 'unavailable' }, 503);
  }
}
export const HEAD = GET;
