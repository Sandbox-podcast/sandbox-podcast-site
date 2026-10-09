import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  allowLoginAttempt,
  originIsSameSite,
} from '@/lib/admin-auth';
import {
  ADMIN_PASSWORD_MAX_LENGTH,
  ADMIN_PASSWORD_MIN_LENGTH,
  AdminPasswordChangeError,
  changeAdminPassword,
  getAuthenticatedAdmin,
} from '@/lib/admin-auth-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(ADMIN_PASSWORD_MAX_LENGTH),
  newPassword: z.string().min(ADMIN_PASSWORD_MIN_LENGTH).max(ADMIN_PASSWORD_MAX_LENGTH),
  confirmPassword: z.string().min(1).max(ADMIN_PASSWORD_MAX_LENGTH),
});

const MAX_BODY_BYTES = 4096;

export async function POST(request: Request): Promise<NextResponse> {
  if (!originIsSameSite(request))
    return NextResponse.json({ error: 'Requête refusée.' }, { status: 403 });
  const user = await getAuthenticatedAdmin(request);
  if (!user) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  if (!allowLoginAttempt(request)) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
      { status: 429 },
    );
  }
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
  const parsed = passwordChangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: `Le nouveau mot de passe doit contenir entre ${String(ADMIN_PASSWORD_MIN_LENGTH)} et ${String(ADMIN_PASSWORD_MAX_LENGTH)} caractères.`,
      },
      { status: 422 },
    );
  }
  try {
    const changed = await changeAdminPassword(
      user,
      parsed.data.currentPassword,
      parsed.data.newPassword,
      parsed.data.confirmPassword,
    );
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE, changed.session.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: ADMIN_SESSION_SECONDS,
      expires: changed.session.expiresAt,
    });
    return response;
  } catch (error) {
    if (error instanceof AdminPasswordChangeError) {
      const status =
        error.code === 'wrong_password' ? 401 : error.code === 'unavailable' ? 503 : 422;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: 'Le changement de mot de passe a échoué.' }, { status: 503 });
  }
}
