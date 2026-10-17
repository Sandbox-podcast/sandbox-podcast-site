import { NextResponse } from 'next/server';
import { adminCan, getAuthenticatedAdmin } from '@/lib/admin-auth-db';
import { originIsSameSite } from '@/lib/admin-auth';
import { refreshSocialMetrics } from '@/domain/social-metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: Request): Promise<NextResponse> {
  if (!originIsSameSite(request)) {
    return NextResponse.json({ error: 'Requête refusée.' }, { status: 403 });
  }
  const user = await getAuthenticatedAdmin(request);
  if (!user || !adminCan(user, 'read')) {
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  }
  const metrics = await refreshSocialMetrics();
  return NextResponse.json(metrics, { headers: { 'Cache-Control': 'no-store' } });
}
