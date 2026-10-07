import { NextResponse } from 'next/server';
import { adminUsername } from '@/lib/admin-auth';
import { adminStorageMode, authConfigured } from '@/lib/admin-persistence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request): NextResponse {
  const username = adminUsername(request);
  return NextResponse.json(
    {
      authenticated: username !== undefined,
      username,
      authConfigured: authConfigured(),
      storageMode: adminStorageMode(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
