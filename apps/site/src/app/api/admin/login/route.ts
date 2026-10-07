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

const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9-]{2,31}$/),
  password: z.string().min(1).max(200),
});
const MAX_LOGIN_BYTES = 4096;

export async function POST(request: Request): Promise<NextResponse> {
  if (!originIsSameSite(request))
    return NextResponse.json({ error: 'Requête refusée.' }, { status: 403 });
  if (!adminSecretsReady()) {
    return NextResponse.json(
      { error: 'Ajoutez SITE_ADMIN_USERS et SITE_ADMIN_SECRET aux variables du projet.' },
      { status: 503 },
    );
  }
  if (!allowLoginAttempt(request)) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
      { status: 429 },
    );
  }
  const declaredSize = Number(request.headers.get('content-length') ?? '0');
  if (declaredSize > MAX_LOGIN_BYTES) {
    return NextResponse.json({ error: 'Requête trop volumineuse.' }, { status: 413 });
  }
  let body: unknown;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_LOGIN_BYTES) {
      return NextResponse.json({ error: 'Requête trop volumineuse.' }, { status: 413 });
    }
    body = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 });
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success || !passwordMatches(parsed.data.username, parsed.data.password)) {
    return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 });
  }
  const session = createAdminSession(parsed.data.username);
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
