import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'sandbox_admin_session';
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map<string, { count: number; startedAt: number }>();

export function adminSecretsReady(): boolean {
  const password = process.env['SITE_ADMIN_PASSWORD'] ?? '';
  const secret = process.env['SITE_ADMIN_SECRET'] ?? '';
  return password.length >= 16 && secret.length >= 32;
}

function cookieValue(request: Request): string | undefined {
  const raw = request.headers.get('cookie');
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const [name, ...values] = part.trim().split('=');
    if (name === ADMIN_COOKIE) return values.join('=');
  }
  return undefined;
}

function signature(expiration: string): string | undefined {
  const secret = process.env['SITE_ADMIN_SECRET'];
  if (!secret) return undefined;
  return createHmac('sha256', secret).update(`sandbox-admin:${expiration}`).digest('base64url');
}

export function createAdminSession(): { value: string; expiresAt: Date } | undefined {
  if (!adminSecretsReady()) return undefined;
  const expiration = String(Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS);
  const signed = signature(expiration);
  if (!signed) return undefined;
  return { value: `${expiration}.${signed}`, expiresAt: new Date(Number(expiration) * 1000) };
}

export function isAdminRequest(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  if (!adminSecretsReady()) return false;
  const value = cookieValue(request);
  if (!value) return false;
  const separator = value.indexOf('.');
  if (separator < 1) return false;
  const expiration = value.slice(0, separator);
  if (!/^\d{10}$/.test(expiration) || Number(expiration) <= Math.floor(Date.now() / 1000)) {
    return false;
  }
  const expected = signature(expiration);
  if (!expected) return false;
  const actualBytes = Buffer.from(value.slice(separator + 1));
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

export function passwordMatches(candidate: string): boolean {
  const password = process.env['SITE_ADMIN_PASSWORD'];
  if (!password || !adminSecretsReady()) return false;
  const actual = createHash('sha256').update(candidate).digest();
  const expected = createHash('sha256').update(password).digest();
  return timingSafeEqual(actual, expected);
}

export function allowLoginAttempt(request: Request): boolean {
  const forwarded = request.headers.get('x-forwarded-for');
  const address = forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
  const now = Date.now();
  const current = attempts.get(address);
  if (!current || now - current.startedAt > ATTEMPT_WINDOW_MS) {
    attempts.set(address, { count: 1, startedAt: now });
    return true;
  }
  if (current.count >= MAX_ATTEMPTS) return false;
  current.count += 1;
  return true;
}

export function originIsSameSite(request: Request): boolean {
  const origin = request.headers.get('origin');
  return origin !== null && origin === new URL(request.url).origin;
}
