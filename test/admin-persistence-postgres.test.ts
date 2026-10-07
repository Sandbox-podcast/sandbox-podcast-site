import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { editableContentSchema } from '../src/domain/admin-content.ts';
import * as schema from '../src/db/schema.ts';
import { loadContent } from '../src/lib/load.ts';
import { ContentConflictError } from '../src/lib/admin-content-conflict.ts';
import {
  postgresClearEditorial,
  postgresGetAdminContent,
  postgresReadPublished,
  postgresSaveAdminContent,
  postgresUpsertPublished,
} from '../src/lib/admin-persistence-postgres.ts';

const pglite = new PGlite();
const testDb = drizzle(pglite, { schema });

vi.mock('../src/db/client.ts', () => ({
  databaseUrl: () => 'postgresql://test',
  hasDatabaseConfiguration: () => true,
  getDb: () => testDb,
  resetDbCache: () => undefined,
}));

function editableFixture() {
  const content = loadContent();
  return editableContentSchema.parse({
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
}

beforeAll(async () => {
  const migration = readFileSync(join(process.cwd(), 'drizzle/0000_editorial_records.sql'), 'utf8');
  const statements = migration
    .split('--> statement-breakpoint')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  for (const statement of statements) {
    await pglite.exec(statement);
  }
});

afterEach(async () => {
  await postgresClearEditorial();
});

describe('persistance Postgres du backoffice', () => {
  it('publie et recharge le contenu éditorial', async () => {
    const content = editableFixture();
    await postgresUpsertPublished(content);
    const published = await postgresReadPublished();
    expect(published).toEqual(content);
  });

  it('gère brouillon, etag et publication', async () => {
    const content = editableFixture();
    const saved = await postgresSaveAdminContent(content, 'draft', null);
    expect(saved.draftEtag).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    const admin = await postgresGetAdminContent();
    expect(admin.hasDraft).toBe(true);
    expect(admin.draftEtag).toBe(saved.draftEtag);

    await expect(postgresSaveAdminContent(content, 'draft', 'stale-etag')).rejects.toBeInstanceOf(
      ContentConflictError,
    );

    await postgresSaveAdminContent(content, 'publish', saved.draftEtag);
    const published = await postgresReadPublished();
    expect(published).toEqual(content);
  });
});
