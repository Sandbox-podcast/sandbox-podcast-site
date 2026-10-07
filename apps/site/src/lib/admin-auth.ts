import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const ADMIN_COOKIE = 'sandbox_admin_session';
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_TRACKED_ADDRESSES = 2048;
const attempts = new Map<string, { count: number; startedAt: number }>();
const adminUserSchema = z
  .array(
    z.object({
      username: z.string().regex(/^[a-z][a-z0-9-]{2,31}$/),
      passwordHash: z.string().regex(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/),
    }),
  )
  .min(1)
  .max(20);

function adminUsers(): z.infer<typeof adminUserSchema> {
  const raw = process.env['SITE_ADMIN_USERS'];
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = adminUserSchema.safeParse(parsed);
    if (!result.success) return [];
    const usernames = result.data.map((user) => user.username);
    return new Set(usernames).size === usernames.length ? result.data : [];
  } catch {
    return [];
  }
}

export function adminSecretsReady(): boolean {
  const secret = process.env['SITE_ADMIN_SECRET'] ?? '';
  return secret.length >= 32 && adminUsers().length > 0;
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

function signature(username: string, expiration: string, passwordHash: string): string | undefined {
  const secret = process.env['SITE_ADMIN_SECRET'];
  if (!secret) return undefined;
  return createHmac('sha256', secret)
    .update(`sandbox-admin:${username}:${expiration}:${passwordHash}`)
    .digest('base64url');
}

export function createAdminSession(
  username: string,
): { value: string; expiresAt: Date } | undefined {
  if (!adminSecretsReady()) return undefined;
  const user = adminUsers().find((entry) => entry.username === username);
  if (!user) return undefined;
  const expiration = String(Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS);
  const signed = signature(username, expiration, user.passwordHash);
  if (!signed) return undefined;
  return {
    value: `${username}.${expiration}.${signed}`,
    expiresAt: new Date(Number(expiration) * 1000),
  };
}

export function adminUsername(request: Request): string | undefined {
  if (!adminSecretsReady()) return undefined;
  const value = cookieValue(request);
  if (!value) return undefined;
  const [username, expiration, actual, extra] = value.split('.');
  if (!username || !expiration || !actual || extra !== undefined) return undefined;
  if (!/^\d{10}$/.test(expiration) || Number(expiration) <= Math.floor(Date.now() / 1000)) {
    return undefined;
  }
  const user = adminUsers().find((entry) => entry.username === username);
  if (!user) return undefined;
  const expected = signature(username, expiration, user.passwordHash);
  if (!expected) return undefined;
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes)
    ? username
    : undefined;
}

export function isAdminRequest(request: Request): boolean {
  return adminUsername(request) !== undefined;
}

export function passwordMatches(username: string, candidate: string): boolean {
  if (!adminSecretsReady()) return false;
  const user = adminUsers().find((entry) => entry.username === username);
  const [, salt, hash] = user?.passwordHash.split(':') ?? [];
  const actual = scryptSync(candidate, salt ? Buffer.from(salt, 'hex') : Buffer.alloc(16), 64);
  const expected = hash ? Buffer.from(hash, 'hex') : Buffer.alloc(64);
  return timingSafeEqual(actual, expected) && user !== undefined;
}

export function allowLoginAttempt(request: Request): boolean {
  const forwarded = request.headers.get('x-forwarded-for');
  const address = forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
  const now = Date.now();
  const current = attempts.get(address);
  if (!current || now - current.startedAt > ATTEMPT_WINDOW_MS) {
    if (!current && attempts.size >= MAX_TRACKED_ADDRESSES) {
      for (const [key, attempt] of attempts) {
        if (now - attempt.startedAt > ATTEMPT_WINDOW_MS) attempts.delete(key);
      }
      if (attempts.size >= MAX_TRACKED_ADDRESSES) {
        const oldest = attempts.keys().next().value;
        if (oldest) attempts.delete(oldest);
      }
    }
    attempts.set(address, { count: 1, startedAt: now });
    return true;
  }
  if (current.count >= MAX_ATTEMPTS) return false;
  current.count += 1;
  return true;
}

export function originIsSameSite(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (origin === null) return false;
  const url = new URL(request.url);
  if (origin === url.origin) return true;
  // Next utilise parfois localhost comme URL interne en développement alors que
  // le navigateur ouvre le serveur sur 127.0.0.1. Le Host reste celui du navigateur.
  if (process.env.NODE_ENV === 'production') return false;
  const host = request.headers.get('host');
  return (
    host !== null &&
    /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) &&
    origin === `${url.protocol}//${host}`
  );
}
