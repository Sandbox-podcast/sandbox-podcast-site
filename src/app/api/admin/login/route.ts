import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  adminAuthReady,
  allowLoginAttempt,
  createAdminSession,
  originIsSameSite,
  sessionSigningReady,
} from '@/lib/admin-auth';
import { authenticateAdminUser } from '@/lib/admin-users-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  login: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request): Promise<NextResponse> {
  if (!originIsSameSite(request))
    return NextResponse.json({ error: 'Requête refusée.' }, { status: 403 });
  if (!sessionSigningReady()) {
    return NextResponse.json(
      { error: 'Ajoutez SITE_ADMIN_SECRET (32 caractères minimum) aux variables du projet.' },
      { status: 503 },
    );
  }
  if (!(await adminAuthReady())) {
    return NextResponse.json(
      {
        error:
          'Aucun compte admin en base. Lancez pnpm db:seed avec ADMIN_BOOTSTRAP_LOGIN et ADMIN_BOOTSTRAP_PASSWORD.',
      },
      { status: 503 },
    );
  }
  if (!allowLoginAttempt(request)) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
      { status: 429 },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 });
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Identifiant ou mot de passe manquant.' }, { status: 400 });
  }
  const user = await authenticateAdminUser(parsed.data.login, parsed.data.password);
  if (!user) {
    return NextResponse.json({ error: 'Identifiant ou mot de passe incorrect.' }, { status: 401 });
  }
  const session = createAdminSession(user);
  if (!session) return NextResponse.json({ error: 'Session indisponible.' }, { status: 503 });
  const response = NextResponse.json({ ok: true, user: { login: user.login, role: user.role } });
  response.cookies.set(ADMIN_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_SESSION_SECONDS,
    expires: session.expiresAt,
  });
  return response;
}
