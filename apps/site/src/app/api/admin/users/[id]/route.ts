import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDisplayNameSchema, adminRoleSchema, type AdminRole } from '@/domain/admin-users';
import { originIsSameSite } from '@/lib/admin-auth';
import {
  ADMIN_PASSWORD_MAX_LENGTH,
  ADMIN_PASSWORD_MIN_LENGTH,
  getAuthenticatedAdmin,
} from '@/lib/admin-auth-db';
import {
  AdminUserManageError,
  deactivateManagedAdminUser,
  resetManagedAdminPassword,
  updateManagedAdminUser,
} from '@/lib/admin-users-manage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const updateSchema = z
  .object({
    displayName: adminDisplayNameSchema.optional(),
    role: adminRoleSchema.optional(),
    active: z.boolean().optional(),
    password: z.string().min(ADMIN_PASSWORD_MIN_LENGTH).max(ADMIN_PASSWORD_MAX_LENGTH).optional(),
  })
  .refine(
    (value) =>
      value.displayName !== undefined ||
      value.role !== undefined ||
      value.active !== undefined ||
      value.password !== undefined,
    { message: 'Aucun champ à mettre à jour.' },
  );

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

async function readBody(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  const declaredSize = Number(request.headers.get('content-length') ?? '0');
  if (declaredSize > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Requête trop volumineuse.' }, { status: 413 }),
    };
  }
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Requête trop volumineuse.' }, { status: 413 }),
      };
    }
    return { ok: true, body: JSON.parse(raw) as unknown };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Requête illisible.' }, { status: 400 }),
    };
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!originIsSameSite(request))
    return NextResponse.json({ error: 'Requête refusée.' }, { status: 403 });
  const actor = await getAuthenticatedAdmin(request);
  if (!actor) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'Identifiant manquant.' }, { status: 400 });
  const parsedBody = await readBody(request);
  if (!parsedBody.ok) return parsedBody.response;
  const parsed = updateSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Mise à jour invalide.' }, { status: 422 });
  }
  try {
    const profilePatch: { displayName?: string; role?: AdminRole; active?: boolean } = {};
    if (parsed.data.displayName !== undefined) profilePatch.displayName = parsed.data.displayName;
    if (parsed.data.role !== undefined) profilePatch.role = parsed.data.role;
    if (parsed.data.active !== undefined) profilePatch.active = parsed.data.active;
    let user =
      Object.keys(profilePatch).length > 0
        ? await updateManagedAdminUser(actor, id, profilePatch)
        : undefined;
    if (parsed.data.password !== undefined) {
      user = await resetManagedAdminPassword(actor, id, parsed.data.password);
    }
    if (!user) return NextResponse.json({ error: 'Mise à jour invalide.' }, { status: 422 });
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof AdminUserManageError) {
      return NextResponse.json({ error: error.message }, { status: statusFor(error.code) });
    }
    return NextResponse.json({ error: 'La mise à jour du compte a échoué.' }, { status: 503 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!originIsSameSite(request))
    return NextResponse.json({ error: 'Requête refusée.' }, { status: 403 });
  const actor = await getAuthenticatedAdmin(request);
  if (!actor) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'Identifiant manquant.' }, { status: 400 });
  try {
    const user = await deactivateManagedAdminUser(actor, id);
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof AdminUserManageError) {
      return NextResponse.json({ error: error.message }, { status: statusFor(error.code) });
    }
    return NextResponse.json({ error: 'La désactivation du compte a échoué.' }, { status: 503 });
  }
}
