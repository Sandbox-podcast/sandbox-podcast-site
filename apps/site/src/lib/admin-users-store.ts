import { randomUUID } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import { adminRoleSchema, type AdminRole, type AdminUser } from '../domain/admin-users.ts';
import { getDb, hasDatabaseConfiguration } from '../db/client.ts';
import { adminUsers } from '../db/schema.ts';

export interface StoredDatabaseAdmin extends AdminUser {
  passwordHash: string;
}

function missingTable(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (typeof current !== 'object' || current === null) return false;
    const candidate = current as { code?: unknown; cause?: unknown };
    if (candidate.code === '42P01') return true;
    current = candidate.cause;
  }
  return false;
}

function fromRow(row: typeof adminUsers.$inferSelect): StoredDatabaseAdmin {
  return {
    id: row.id,
    username: row.login,
    displayName: row.displayName,
    passwordHash: row.passwordHash,
    role: adminRoleSchema.parse(row.role),
    active: row.active === 1,
  };
}

function toPublic(user: StoredDatabaseAdmin): AdminUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    active: user.active,
  };
}

/** Dès qu'un compte existe en base, les comptes de secours d'environnement sont désactivés. */
export async function databaseAdminMode(): Promise<boolean> {
  if (!hasDatabaseConfiguration()) return false;
  try {
    const rows = await getDb().select({ id: adminUsers.id }).from(adminUsers).limit(1);
    return rows.length > 0;
  } catch (error) {
    // Le déploiement peut précéder sa migration. Toute autre erreur reste bloquante.
    if (missingTable(error)) return false;
    throw error;
  }
}

export async function databaseAdminByLogin(
  login: string,
): Promise<StoredDatabaseAdmin | undefined> {
  const rows = await getDb()
    .select()
    .from(adminUsers)
    .where(and(eq(adminUsers.login, login), eq(adminUsers.active, 1)))
    .limit(1);
  return rows[0] ? fromRow(rows[0]) : undefined;
}

export async function databaseAdminById(id: string): Promise<StoredDatabaseAdmin | undefined> {
  const rows = await getDb()
    .select()
    .from(adminUsers)
    .where(and(eq(adminUsers.id, id), eq(adminUsers.active, 1)))
    .limit(1);
  return rows[0] ? fromRow(rows[0]) : undefined;
}

export async function databaseAdminRecordById(
  id: string,
): Promise<StoredDatabaseAdmin | undefined> {
  const rows = await getDb().select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  return rows[0] ? fromRow(rows[0]) : undefined;
}

export async function databaseAdminRecordByLogin(
  login: string,
): Promise<StoredDatabaseAdmin | undefined> {
  const rows = await getDb().select().from(adminUsers).where(eq(adminUsers.login, login)).limit(1);
  return rows[0] ? fromRow(rows[0]) : undefined;
}

export async function listDatabaseAdmins(): Promise<AdminUser[]> {
  const rows = await getDb().select().from(adminUsers).orderBy(asc(adminUsers.login));
  return rows.map((row) => toPublic(fromRow(row)));
}

export async function countActiveAdmins(): Promise<number> {
  const rows = await getDb()
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(and(eq(adminUsers.role, 'admin'), eq(adminUsers.active, 1)));
  return rows.length;
}

export async function createDatabaseAdmin(input: {
  username: string;
  displayName: string;
  role: AdminRole;
  passwordHash: string;
}): Promise<StoredDatabaseAdmin> {
  const rows = await getDb()
    .insert(adminUsers)
    .values({
      id: randomUUID(),
      login: input.username,
      displayName: input.displayName,
      passwordHash: input.passwordHash,
      role: input.role,
      active: 1,
    })
    .returning();
  const row = rows[0];
  if (!row) throw new Error('Insert admin_users sans ligne retournée.');
  return fromRow(row);
}

export async function updateDatabaseAdmin(
  id: string,
  patch: { displayName?: string; role?: AdminRole; active?: boolean },
): Promise<StoredDatabaseAdmin | undefined> {
  const updates: {
    displayName?: string;
    role?: AdminRole;
    active?: number;
    updatedAt: string;
  } = { updatedAt: new Date().toISOString() };
  if (patch.displayName !== undefined) updates.displayName = patch.displayName;
  if (patch.role !== undefined) updates.role = patch.role;
  if (patch.active !== undefined) updates.active = patch.active ? 1 : 0;
  const rows = await getDb()
    .update(adminUsers)
    .set(updates)
    .where(eq(adminUsers.id, id))
    .returning();
  return rows[0] ? fromRow(rows[0]) : undefined;
}

export async function updateDatabaseAdminPassword(
  id: string,
  passwordHash: string,
): Promise<StoredDatabaseAdmin | undefined> {
  const rows = await getDb()
    .update(adminUsers)
    .set({ passwordHash, updatedAt: new Date().toISOString() })
    .where(and(eq(adminUsers.id, id), eq(adminUsers.active, 1)))
    .returning();
  return rows[0] ? fromRow(rows[0]) : undefined;
}
