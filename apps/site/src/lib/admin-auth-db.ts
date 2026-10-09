import { createHmac, randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { permissionsForRole, type AdminUser } from '../domain/admin-users.ts';
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  adminSecretsReady,
  adminUsername,
  createAdminSession,
  passwordMatches,
} from './admin-auth.ts';
import {
  databaseAdminById,
  databaseAdminByLogin,
  databaseAdminMode,
  updateDatabaseAdminPassword,
  type StoredDatabaseAdmin,
} from './admin-users-store.ts';

const scryptAsync = promisify(scrypt);
const DUMMY_HASH = `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`;
export const ADMIN_PASSWORD_MIN_LENGTH = 12;
export const ADMIN_PASSWORD_MAX_LENGTH = 200;

export class AdminPasswordChangeError extends Error {
  readonly code: 'unavailable' | 'wrong_password' | 'same_password' | 'weak_password' | 'mismatch';

  constructor(code: AdminPasswordChangeError['code'], message: string) {
    super(message);
    this.name = 'AdminPasswordChangeError';
    this.code = code;
  }
}

function secretReady(): boolean {
  return (process.env['SITE_ADMIN_SECRET'] ?? '').length >= 32;
}

export async function adminAuthReady(): Promise<boolean> {
  return secretReady() && ((await databaseAdminMode()) || adminSecretsReady());
}

function cookieValue(request: Request): string | undefined {
  const raw = request.headers.get('cookie');
  return raw
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE}=`))
    ?.slice(ADMIN_COOKIE.length + 1);
}

async function verifyDatabasePassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split(':');
  let salt: Buffer;
  let expected: Buffer;
  if (parts.length === 3 && parts[0] === 'scrypt') {
    salt = Buffer.from(parts[1] ?? '', 'hex');
    expected = Buffer.from(parts[2] ?? '', 'hex');
    if (salt.length !== 16 || expected.length !== 64) return false;
  } else if (parts.length === 4 && parts[0] === 'scrypt' && parts[1] === 'v1') {
    salt = Buffer.from(parts[2] ?? '', 'base64url');
    expected = Buffer.from(parts[3] ?? '', 'base64url');
    if (salt.length !== 16 || expected.length !== 64) return false;
  } else {
    return false;
  }
  const actual = (await scryptAsync(password, salt, expected.length)) as Buffer;
  return timingSafeEqual(actual, expected);
}

function databaseSignature(user: StoredDatabaseAdmin, expiration: string): string | undefined {
  const secret = process.env['SITE_ADMIN_SECRET'];
  if (!secretReady() || !secret) return undefined;
  return createHmac('sha256', secret)
    .update(`sandbox-db-admin:${user.id}:${expiration}:${user.passwordHash}`)
    .digest('base64url');
}

function databaseSession(
  user: StoredDatabaseAdmin,
): { value: string; expiresAt: Date } | undefined {
  const expiration = String(Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS);
  const signature = databaseSignature(user, expiration);
  if (!signature) return undefined;
  return {
    value: `db_${user.id}.${expiration}.${signature}`,
    expiresAt: new Date(Number(expiration) * 1000),
  };
}

export async function loginAdmin(
  username: string,
  password: string,
): Promise<{ user: AdminUser; session: { value: string; expiresAt: Date } } | undefined> {
  if (!secretReady()) return undefined;
  if (await databaseAdminMode()) {
    const account = await databaseAdminByLogin(username);
    const valid = await verifyDatabasePassword(password, account?.passwordHash ?? DUMMY_HASH);
    if (!account || !valid) return undefined;
    const session = databaseSession(account);
    return session ? { user: account, session } : undefined;
  }
  if (!passwordMatches(username, password)) return undefined;
  const session = createAdminSession(username);
  return session
    ? {
        user: {
          id: `env-${username}`,
          username,
          displayName: username,
          role: 'admin',
          active: true,
        },
        session,
      }
    : undefined;
}

export async function getAuthenticatedAdmin(request: Request): Promise<AdminUser | undefined> {
  if (!secretReady()) return undefined;
  if (!(await databaseAdminMode())) {
    const username = adminUsername(request);
    return username
      ? { id: `env-${username}`, username, displayName: username, role: 'admin', active: true }
      : undefined;
  }
  const value = cookieValue(request);
  if (!value) return undefined;
  const [prefixedId, expiration, actual, extra] = value.split('.');
  if (!prefixedId?.startsWith('db_') || !expiration || !actual || extra !== undefined) {
    return undefined;
  }
  if (!/^\d{10}$/.test(expiration) || Number(expiration) <= Math.floor(Date.now() / 1000)) {
    return undefined;
  }
  const user = await databaseAdminById(prefixedId.slice(3));
  if (!user) return undefined;
  const expected = databaseSignature(user, expiration);
  if (!expected) return undefined;
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes)
    ? user
    : undefined;
}

export function adminCan(user: AdminUser, action: 'read' | 'draft' | 'publish'): boolean {
  return permissionsForRole(user.role)[action];
}

export async function adminCanChangePassword(): Promise<boolean> {
  return secretReady() && (await databaseAdminMode());
}

export function hashAdminPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export async function changeAdminPassword(
  user: AdminUser,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<{ user: AdminUser; session: { value: string; expiresAt: Date } }> {
  if (!(await adminCanChangePassword())) {
    throw new AdminPasswordChangeError(
      'unavailable',
      'Le changement de mot de passe est disponible uniquement pour les comptes stockés en base.',
    );
  }
  if (
    newPassword.length < ADMIN_PASSWORD_MIN_LENGTH ||
    newPassword.length > ADMIN_PASSWORD_MAX_LENGTH
  ) {
    throw new AdminPasswordChangeError(
      'weak_password',
      `Le nouveau mot de passe doit contenir entre ${String(ADMIN_PASSWORD_MIN_LENGTH)} et ${String(ADMIN_PASSWORD_MAX_LENGTH)} caractères.`,
    );
  }
  if (newPassword !== confirmPassword) {
    throw new AdminPasswordChangeError(
      'mismatch',
      'La confirmation ne correspond pas au nouveau mot de passe.',
    );
  }
  if (currentPassword === newPassword) {
    throw new AdminPasswordChangeError(
      'same_password',
      'Le nouveau mot de passe doit être différent de l’actuel.',
    );
  }
  const account = await databaseAdminById(user.id);
  if (!account) {
    throw new AdminPasswordChangeError(
      'unavailable',
      'Le changement de mot de passe est disponible uniquement pour les comptes stockés en base.',
    );
  }
  const valid = await verifyDatabasePassword(currentPassword, account.passwordHash);
  if (!valid) {
    throw new AdminPasswordChangeError('wrong_password', 'Mot de passe actuel incorrect.');
  }
  const updated = await updateDatabaseAdminPassword(account.id, hashAdminPassword(newPassword));
  if (!updated) {
    throw new AdminPasswordChangeError(
      'unavailable',
      'Le compte n’a pas pu être mis à jour. Réessayez.',
    );
  }
  const session = databaseSession(updated);
  if (!session) {
    throw new AdminPasswordChangeError(
      'unavailable',
      'Le mot de passe a été changé, mais la session n’a pas pu être renouvelée. Reconnectez-vous.',
    );
  }
  return { user: updated, session };
}
