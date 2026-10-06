import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { adminStorageMode, authConfigured } from '@/lib/admin-persistence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request): NextResponse {
  return NextResponse.json(
    {
      authenticated: isAdminRequest(request),
      authConfigured: authConfigured(),
      storageMode: adminStorageMode(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
