import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema.ts';

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

let cached: NeonHttpDatabase<typeof schema> | undefined;

export function getDb(): NeonHttpDatabase<typeof schema> {
  const url = databaseUrl();
  if (!url) {
    throw new Error('Postgres n’est pas configuré (DATABASE_URL ou POSTGRES_URL manquant).');
  }
  cached ??= drizzle(neon(url), { schema });
  return cached;
}

export function resetDbCache(): void {
  cached = undefined;
}
