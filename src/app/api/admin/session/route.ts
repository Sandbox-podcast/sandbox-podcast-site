import { NextResponse } from 'next/server';
import { adminAuthReady, getAuthenticatedAdmin, sessionSigningReady } from '@/lib/admin-auth';
import { permissionsForRole } from '@/domain/admin-users';
import { adminStorageMode } from '@/lib/admin-persistence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const user = await getAuthenticatedAdmin(request);
  const authConfigured = sessionSigningReady() && (await adminAuthReady());
  return NextResponse.json(
    {
      authenticated: user !== undefined,
      authConfigured,
      user: user
        ? {
            login: user.login,
            displayName: user.displayName,
            role: user.role,
            permissions: permissionsForRole(user.role),
          }
        : null,
      storageMode: adminStorageMode(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
