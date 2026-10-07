import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { and, eq, sql } from 'drizzle-orm';
import {
  adminRoleSchema,
  adminUserPublicSchema,
  type AdminRole,
  type AdminUser,
} from '../domain/admin-users.ts';
import { adminUsers } from '../db/schema.ts';
import { getDb, hasDatabaseConfiguration } from '../db/client.ts';
import { hashAdminPassword, verifyAdminPassword } from './admin-password.ts';

const LOCAL_USERS_PATH = join(process.cwd(), '.site-admin-users.local.json');

interface StoredAdminUser extends AdminUser {
  passwordHash: string;
}

interface LocalUserFile {
  users: StoredAdminUser[];
}

function parseStoredUser(record: {
  id: string;
  login: string;
  displayName: string;
  role: string;
  active: boolean | number;
  passwordHash: string;
}): StoredAdminUser {
  return {
    id: record.id,
    login: record.login,
    displayName: record.displayName,
    role: adminRoleSchema.parse(record.role),
    active: typeof record.active === 'number' ? record.active === 1 : record.active,
    passwordHash: record.passwordHash,
  };
}

function toPublic(user: StoredAdminUser): AdminUser {
  return adminUserPublicSchema.parse({
    id: user.id,
    login: user.login,
    displayName: user.displayName,
    role: user.role,
    active: user.active,
  });
}

async function readLocalUsers(): Promise<StoredAdminUser[]> {
  try {
    const raw = await readFile(LOCAL_USERS_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return [];
    const file = parsed as LocalUserFile;
    if (!Array.isArray(file.users)) return [];
    return file.users.map((user) => parseStoredUser(user));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeLocalUsers(users: StoredAdminUser[]): Promise<void> {
  const payload: LocalUserFile = { users };
  await writeFile(LOCAL_USERS_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function readPostgresUserByLogin(login: string): Promise<StoredAdminUser | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(adminUsers)
    .where(and(eq(adminUsers.login, login), eq(adminUsers.active, 1)))
    .limit(1);
  const row = rows[0];
  if (!row) return undefined;
  return parseStoredUser({
    id: row.id,
    login: row.login,
    displayName: row.displayName,
    role: row.role,
    active: row.active,
    passwordHash: row.passwordHash,
  });
}

async function readPostgresUserById(id: string): Promise<StoredAdminUser | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(adminUsers)
    .where(and(eq(adminUsers.id, id), eq(adminUsers.active, 1)))
    .limit(1);
  const row = rows[0];
  if (!row) return undefined;
  return parseStoredUser({
    id: row.id,
    login: row.login,
    displayName: row.displayName,
    role: row.role,
    active: row.active,
    passwordHash: row.passwordHash,
  });
}

export function adminUsersUsePostgres(): boolean {
  return hasDatabaseConfiguration();
}

export async function countAdminUsers(): Promise<number> {
  if (adminUsersUsePostgres()) {
    const db = getDb();
    const rows = await db.select({ n: sql<number>`count(*)` }).from(adminUsers);
    return rows[0]?.n ?? 0;
  }
  return (await readLocalUsers()).length;
}

export async function findAdminUserById(id: string): Promise<AdminUser | undefined> {
  if (adminUsersUsePostgres()) {
    const user = await readPostgresUserById(id);
    return user ? toPublic(user) : undefined;
  }
  const user = (await readLocalUsers()).find((entry) => entry.id === id && entry.active);
  return user ? toPublic(user) : undefined;
}

export async function authenticateAdminUser(
  login: string,
  password: string,
): Promise<AdminUser | undefined> {
  const normalizedLogin = login.trim().toLowerCase();
  if (normalizedLogin.length === 0) return undefined;

  let stored: StoredAdminUser | undefined;
  if (adminUsersUsePostgres()) {
    stored = await readPostgresUserByLogin(normalizedLogin);
  } else {
    stored = (await readLocalUsers()).find(
      (user) => user.active && user.login.toLowerCase() === normalizedLogin,
    );
  }
  if (!stored) return undefined;
  const valid = await verifyAdminPassword(password, stored.passwordHash);
  return valid ? toPublic(stored) : undefined;
}

function buildBootstrapUser(input: {
  login: string;
  password: string;
  displayName: string;
  role: AdminRole;
}): StoredAdminUser {
  const login = input.login.trim().toLowerCase();
  if (login.length === 0) {
    throw new Error('Identifiant admin invalide.');
  }
  if (input.password.length < 12) {
    throw new Error('Mot de passe bootstrap trop court (12 caractères minimum).');
  }
  const displayName = input.displayName.trim() || login;
  const id = randomUUID();
  adminUserPublicSchema.parse({
    id,
    login,
    displayName,
    role: input.role,
    active: true,
  });
  return {
    id,
    login,
    displayName,
    role: input.role,
    active: true,
    passwordHash: '',
  };
}

export async function bootstrapAdminUser(input: {
  login: string;
  password: string;
  displayName: string;
  role: AdminRole;
}): Promise<AdminUser | undefined> {
  const count = await countAdminUsers();
  if (count > 0) return undefined;

  const draft = buildBootstrapUser(input);
  const passwordHash = await hashAdminPassword(input.password);
  const user: StoredAdminUser = { ...draft, passwordHash };

  if (adminUsersUsePostgres()) {
    const db = getDb();
    await db.insert(adminUsers).values({
      id: user.id,
      login: user.login,
      displayName: user.displayName,
      passwordHash: user.passwordHash,
      role: user.role,
      active: 1,
    });
  } else {
    await writeLocalUsers([user]);
  }
  return toPublic(user);
}

/** Vide les comptes (tests). */
export async function clearAdminUsers(): Promise<void> {
  if (adminUsersUsePostgres()) {
    const db = getDb();
    await db.delete(adminUsers);
    return;
  }
  await writeFile(LOCAL_USERS_PATH, '{ "users": [] }\n', 'utf8');
}
