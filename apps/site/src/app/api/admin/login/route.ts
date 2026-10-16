import { checkAdminAttempt } from '@/lib/admin-rate-limit';
import { readLimitedRequestText, RequestBodyTooLargeError } from '@/lib/request-body';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, originIsSameSite } from '@/lib/admin-auth';
import { adminAuthReady, loginAdmin } from '@/lib/admin-auth-db';

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
  if (!(await adminAuthReady())) {
    return NextResponse.json(
      { error: 'Configurez SITE_ADMIN_SECRET et au moins un compte admin.' },
      { status: 503 },
    );
  }
  const attempt = await checkAdminAttempt(request);
  if (attempt.status === 'unavailable') {
    return NextResponse.json(
      { error: 'Protection des connexions indisponible. Réessayez plus tard.' },
      { status: 503 },
    );
  }
  if (attempt.status === 'limited') {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
      { status: 429, headers: { 'Retry-After': String(attempt.retryAfter) } },
    );
  }
  const declaredSize = Number(request.headers.get('content-length') ?? '0');
  if (declaredSize > MAX_LOGIN_BYTES) {
    return NextResponse.json({ error: 'Requête trop volumineuse.' }, { status: 413 });
  }
  let body: unknown;
  try {
    const raw = await readLimitedRequestText(request, MAX_LOGIN_BYTES);
    if (Buffer.byteLength(raw, 'utf8') > MAX_LOGIN_BYTES) {
      return NextResponse.json({ error: 'Requête trop volumineuse.' }, { status: 413 });
    }
    body = JSON.parse(raw) as unknown;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError)
      return NextResponse.json({ error: 'Requête trop volumineuse.' }, { status: 413 });

    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 });
  }
  const parsed = loginSchema.safeParse(body);
  const authenticated = parsed.success
    ? await loginAdmin(parsed.data.username, parsed.data.password)
    : undefined;
  if (!authenticated) {
    return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, authenticated.session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_SESSION_SECONDS,
    expires: authenticated.session.expiresAt,
  });
  return response;
}
