import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  adminSecretsReady,
  allowLoginAttempt,
  createAdminSession,
  originIsSameSite,
  passwordMatches,
} from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const loginSchema = z.object({ password: z.string().min(1).max(200) });

export async function POST(request: Request): Promise<NextResponse> {
  if (!originIsSameSite(request))
    return NextResponse.json({ error: 'Requête refusée.' }, { status: 403 });
  if (!adminSecretsReady()) {
    return NextResponse.json(
      { error: 'Ajoutez SITE_ADMIN_PASSWORD et SITE_ADMIN_SECRET aux variables du projet.' },
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
  if (!parsed.success || !passwordMatches(parsed.data.password)) {
    return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 401 });
  }
  const session = createAdminSession();
  if (!session) return NextResponse.json({ error: 'Session indisponible.' }, { status: 503 });
  const response = NextResponse.json({ ok: true });
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
