import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDisplayNameSchema, adminLoginSchema, adminRoleSchema } from '@/domain/admin-users';
import { originIsSameSite } from '@/lib/admin-auth';
import {
  ADMIN_PASSWORD_MAX_LENGTH,
  ADMIN_PASSWORD_MIN_LENGTH,
  getAuthenticatedAdmin,
} from '@/lib/admin-auth-db';
import {
  AdminUserManageError,
  createManagedAdminUser,
  listManagedAdminUsers,
} from '@/lib/admin-users-manage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  username: adminLoginSchema,
  displayName: adminDisplayNameSchema,
  role: adminRoleSchema,
  password: z.string().min(ADMIN_PASSWORD_MIN_LENGTH).max(ADMIN_PASSWORD_MAX_LENGTH),
});

const MAX_BODY_BYTES = 4096;

function statusFor(code: AdminUserManageError['code']): number {
  switch (code) {
    case 'forbidden':
      return 403;
    case 'unavailable':
      return 503;
    case 'not_found':
      return 404;
    case 'duplicate_login':
      return 409;
    case 'invalid_input':
    case 'last_admin':
    case 'self_lockout':
      return 422;
    default: {
      const _exhaustive: never = code;
      return _exhaustive;
    }
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const user = await getAuthenticatedAdmin(request);
  if (!user) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  try {
    const users = await listManagedAdminUsers(user);
    return NextResponse.json({ users }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AdminUserManageError) {
      return NextResponse.json({ error: error.message }, { status: statusFor(error.code) });
    }
    return NextResponse.json({ error: 'Impossible de lister les comptes.' }, { status: 503 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!originIsSameSite(request))
    return NextResponse.json({ error: 'Requête refusée.' }, { status: 403 });
  const user = await getAuthenticatedAdmin(request);
  if (!user) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  const declaredSize = Number(request.headers.get('content-length') ?? '0');
  if (declaredSize > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Requête trop volumineuse.' }, { status: 413 });
  }
  let body: unknown;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Requête trop volumineuse.' }, { status: 413 });
    }
    body = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          'Identifiant, nom, rôle ou mot de passe invalide (mot de passe : 12 caractères minimum).',
      },
      { status: 422 },
    );
  }
  try {
    const created = await createManagedAdminUser(user, parsed.data);
    return NextResponse.json({ user: created }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminUserManageError) {
      return NextResponse.json({ error: error.message }, { status: statusFor(error.code) });
    }
    return NextResponse.json({ error: 'La création du compte a échoué.' }, { status: 503 });
  }
}
