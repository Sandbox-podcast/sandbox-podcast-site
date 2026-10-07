import { get } from '@vercel/blob';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { join } from 'node:path';
import ws from 'ws';
import { editableContentSchema } from '../src/domain/admin-content.ts';
import { loadContent } from '../src/lib/load.ts';
import { postgresUpsertPublished } from '../src/lib/admin-persistence-postgres.ts';
import { adminRoleSchema } from '../src/domain/admin-users.ts';
import { bootstrapAdminUser } from '../src/lib/admin-users-store.ts';
import { closeDb, resetDbCache } from '../src/db/client.ts';

const PUBLISHED_BLOB_PATH = 'sandbox-podcast/content/published.json';

async function readBlobPublished(): Promise<unknown> {
  const hasBlob =
    Boolean(process.env['BLOB_READ_WRITE_TOKEN']) || Boolean(process.env['BLOB_STORE_ID']);
  if (!hasBlob) return null;
  const result = await get(PUBLISHED_BLOB_PATH, { access: 'private', useCache: false });
  if (result?.statusCode !== 200) return null;
  const raw = await new Response(result.stream).text();
  return JSON.parse(raw) as unknown;
}

const url = process.env['DATABASE_URL'] ?? process.env['POSTGRES_URL'];
if (!url) {
  console.error('DATABASE_URL ou POSTGRES_URL requis pour db:seed.');
  process.exit(1);
}

neonConfig.webSocketConstructor = ws;
process.env['DATABASE_URL'] = url;
resetDbCache();

const pool = new Pool({ connectionString: url });
const db = drizzle(pool);
await migrate(db, { migrationsFolder: join(process.cwd(), 'drizzle') });
await pool.end();

const fromBlob = await readBlobPublished();
const content = loadContent();
const baseline = editableContentSchema.parse({
  site: content.site,
  hosts: content.hosts,
  topics: content.topics,
  sources: content.sources,
  scoring: content.scoring,
  charts: content.charts,
  entities: content.entities,
  takes: content.takes,
  episodes: content.episodes,
  stories: content.stories,
});
const published = fromBlob ? editableContentSchema.parse(fromBlob) : baseline;

await postgresUpsertPublished(published);

const bootstrapLogin = process.env['ADMIN_BOOTSTRAP_LOGIN'];
const bootstrapPassword = process.env['ADMIN_BOOTSTRAP_PASSWORD'];
if (bootstrapLogin && bootstrapPassword) {
  const user = await bootstrapAdminUser({
    login: bootstrapLogin,
    password: bootstrapPassword,
    displayName: process.env['ADMIN_BOOTSTRAP_DISPLAY_NAME'] ?? bootstrapLogin,
    role: adminRoleSchema.parse(process.env['ADMIN_BOOTSTRAP_ROLE'] ?? 'admin'),
  });
  if (user) {
    console.log(`Seed : compte admin créé (${user.login}).`);
  }
}

await closeDb();
console.log(
  fromBlob
    ? 'Seed : version publiée importée depuis Vercel Blob.'
    : 'Seed : version publiée importée depuis content/ du dépôt.',
);
