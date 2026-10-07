import { createHmac, timingSafeEqual } from 'node:crypto';
import { permissionsForRole, type AdminRole, type AdminUser } from '../domain/admin-users.ts';
import { countAdminUsers, findAdminUserById } from './admin-users-store.ts';

export const ADMIN_COOKIE = 'sandbox_admin_session';
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map<string, { count: number; startedAt: number }>();

export function sessionSigningReady(): boolean {
  const secret = process.env['SITE_ADMIN_SECRET'] ?? '';
  return secret.length >= 32;
}

export async function adminAuthReady(): Promise<boolean> {
  if (!sessionSigningReady()) return false;
  return (await countAdminUsers()) > 0;
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

function signature(userId: string, expiration: string): string | undefined {
  const secret = process.env['SITE_ADMIN_SECRET'];
  if (!secret) return undefined;
  return createHmac('sha256', secret)
    .update(`sandbox-admin:${userId}:${expiration}`)
    .digest('base64url');
}

export function createAdminSession(
  user: AdminUser,
): { value: string; expiresAt: Date } | undefined {
  if (!sessionSigningReady()) return undefined;
  const expiration = String(Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS);
  const signed = signature(user.id, expiration);
  if (!signed) return undefined;
  return {
    value: `${user.id}.${expiration}.${signed}`,
    expiresAt: new Date(Number(expiration) * 1000),
  };
}

export async function getAuthenticatedAdmin(request: Request): Promise<AdminUser | undefined> {
  if (!sessionSigningReady()) return undefined;
  const value = cookieValue(request);
  if (!value) return undefined;
  const firstDot = value.indexOf('.');
  const secondDot = value.indexOf('.', firstDot + 1);
  if (firstDot < 1 || secondDot <= firstDot + 1) return undefined;
  const userId = value.slice(0, firstDot);
  const expiration = value.slice(firstDot + 1, secondDot);
  const token = value.slice(secondDot + 1);
  if (!/^\d{10}$/.test(expiration) || Number(expiration) <= Math.floor(Date.now() / 1000)) {
    return undefined;
  }
  const expected = signature(userId, expiration);
  if (!expected) return undefined;
  const actualBytes = Buffer.from(token);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    return undefined;
  }
  return findAdminUserById(userId);
}

export function adminCan(
  user: AdminUser,
  action: keyof ReturnType<typeof permissionsForRole>,
): boolean {
  return permissionsForRole(user.role)[action];
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

export type { AdminRole };
