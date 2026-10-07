import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { join } from 'node:path';
import ws from 'ws';
import { adminRoleSchema } from '../src/domain/admin-users.ts';
import { bootstrapAdminUser } from '../src/lib/admin-users-store.ts';
import { closeDb, databaseUrl, resetDbCache } from '../src/db/client.ts';

const login = process.env['ADMIN_BOOTSTRAP_LOGIN'];
const password = process.env['ADMIN_BOOTSTRAP_PASSWORD'];
const displayName = process.env['ADMIN_BOOTSTRAP_DISPLAY_NAME'] ?? login;
const role = adminRoleSchema.parse(process.env['ADMIN_BOOTSTRAP_ROLE'] ?? 'admin');

if (!login || !password) {
  console.error('ADMIN_BOOTSTRAP_LOGIN et ADMIN_BOOTSTRAP_PASSWORD sont requis.');
  process.exit(1);
}

const url = databaseUrl();
if (url) {
  neonConfig.webSocketConstructor = ws;
  process.env['DATABASE_URL'] = url;
  resetDbCache();
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
  await pool.end();
}

try {
  const created = await bootstrapAdminUser({
    login,
    password,
    displayName: displayName ?? login,
    role,
  });
  if (!created) {
    console.log('Aucun compte créé : la table contient déjà au moins un utilisateur.');
  } else {
    console.log(`Compte admin créé : ${created.login} (${created.role}).`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Bootstrap admin échoué.');
  process.exit(1);
}
await closeDb();
