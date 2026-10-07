import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema.ts';

neonConfig.webSocketConstructor = ws;

function envUrl(name: 'DATABASE_URL' | 'POSTGRES_URL'): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export function databaseUrl(): string | undefined {
  return envUrl('DATABASE_URL') ?? envUrl('POSTGRES_URL');
}

export function hasDatabaseConfiguration(): boolean {
  return databaseUrl() !== undefined;
}

let pool: Pool | undefined;
let cached: NeonDatabase<typeof schema> | undefined;

export function getDb(): NeonDatabase<typeof schema> {
  const url = databaseUrl();
  if (!url) {
    throw new Error('Postgres n’est pas configuré (DATABASE_URL ou POSTGRES_URL manquant).');
  }
  pool ??= new Pool({ connectionString: url });
  cached ??= drizzle(pool, { schema });
  return cached;
}

export async function closeDb(): Promise<void> {
  cached = undefined;
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

export function resetDbCache(): void {
  cached = undefined;
  pool = undefined;
}
