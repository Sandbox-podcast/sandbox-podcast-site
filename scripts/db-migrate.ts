import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { join } from 'node:path';

const url = process.env['DATABASE_URL'] ?? process.env['POSTGRES_URL'];
if (!url) {
  console.error('DATABASE_URL ou POSTGRES_URL requis pour db:migrate.');
  process.exit(1);
}

const db = drizzle(neon(url));
await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
console.log('Migrations Postgres appliquées.');
