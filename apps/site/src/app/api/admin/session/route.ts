import { NextResponse } from 'next/server';
import { permissionsForRole } from '@/domain/admin-users';
import { adminAuthReady, getAuthenticatedAdmin } from '@/lib/admin-auth-db';
import { adminStorageMode } from '@/lib/admin-persistence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const user = await getAuthenticatedAdmin(request);
  return NextResponse.json(
    {
      authenticated: user !== undefined,
      username: user?.username,
      user: user
        ? {
            username: user.username,
            displayName: user.displayName,
            role: user.role,
            permissions: permissionsForRole(user.role),
          }
        : null,
      authConfigured: await adminAuthReady(),
      storageMode: adminStorageMode(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
