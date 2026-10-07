import { and, eq } from 'drizzle-orm';
import { adminRoleSchema, type AdminUser } from '../domain/admin-users.ts';
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
