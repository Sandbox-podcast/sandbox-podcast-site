import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { adminUsers } from '../src/db/schema.ts';
import { closeDb, getDb, hasDatabaseConfiguration } from '../src/db/client.ts';

const legacyUsersSchema = z
  .array(
    z.object({
      username: z.string().regex(/^[a-z][a-z0-9-]{2,31}$/),
      passwordHash: z.string().regex(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/),
    }),
  )
  .min(1)
  .max(20);

if (!hasDatabaseConfiguration()) {
  throw new Error('DATABASE_URL ou POSTGRES_URL requis pour importer les comptes.');
}
const raw = process.env['SITE_ADMIN_USERS'];
if (!raw) throw new Error('SITE_ADMIN_USERS requis pour importer les comptes existants.');
const accounts = legacyUsersSchema.parse(JSON.parse(raw) as unknown);
if (new Set(accounts.map((account) => account.username)).size !== accounts.length) {
  throw new Error('Identifiants dupliqués dans SITE_ADMIN_USERS.');
}

const db = getDb();
try {
  const existing = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);
  if (existing.length > 0) {
    throw new Error('La table admin_users contient déjà un compte ; import interrompu.');
  }
  await db.insert(adminUsers).values(
    accounts.map((account) => ({
      id: randomUUID(),
      login: account.username,
      displayName: account.username,
      passwordHash: account.passwordHash,
      role: 'admin',
      active: 1,
    })),
  );
  console.log(`${String(accounts.length)} comptes importés sans mot de passe en clair.`);
} finally {
  await closeDb();
}
