import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { join } from 'node:path';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const url = process.env['DATABASE_URL'] ?? process.env['POSTGRES_URL'];
if (!url) {
  console.error('DATABASE_URL ou POSTGRES_URL requis pour db:migrate.');
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
const db = drizzle(pool);
await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
await pool.end();
console.log('Migrations Postgres appliquées.');
