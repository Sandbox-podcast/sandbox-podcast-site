import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { permissionsForRole } from '../src/domain/admin-users.ts';
import * as schema from '../src/db/schema.ts';
import { adminCan, createAdminSession, sessionSigningReady } from '../src/lib/admin-auth.ts';
import {
  authenticateAdminUser,
  bootstrapAdminUser,
  clearAdminUsers,
  countAdminUsers,
} from '../src/lib/admin-users-store.ts';

const pglite = new PGlite();
const testDb = drizzle(pglite, { schema });

vi.mock('../src/db/client.ts', () => ({
  databaseUrl: () => 'postgresql://test',
  hasDatabaseConfiguration: () => true,
  getDb: () => testDb,
  resetDbCache: () => undefined,
  closeDb: () => Promise.resolve(),
}));

beforeAll(async () => {
  for (const file of ['0000_editorial_records.sql', '0001_admin_users.sql']) {
    const migration = readFileSync(join(process.cwd(), 'drizzle', file), 'utf8');
    const statements = migration
      .split('--> statement-breakpoint')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    for (const statement of statements) {
      await pglite.exec(statement);
    }
  }
  vi.stubEnv('SITE_ADMIN_SECRET', 'x'.repeat(32));
});

afterEach(async () => {
  await clearAdminUsers();
});

describe('comptes admin Postgres', () => {
  it('crée un compte bootstrap et authentifie par identifiant', async () => {
    const created = await bootstrapAdminUser({
      login: 'loic',
      password: 'mot-de-passe-securise',
      displayName: 'Loïc',
      role: 'admin',
    });
    expect(created?.login).toBe('loic');
    const user = await authenticateAdminUser('loic', 'mot-de-passe-securise');
    expect(user?.role).toBe('admin');
    if (!user) throw new Error('user');
    expect(sessionSigningReady()).toBe(true);
    const session = createAdminSession(user);
    expect(session?.value).toContain(user.id);
  });

  it('refuse un bootstrap avec identifiant vide', async () => {
    await expect(
      bootstrapAdminUser({
        login: '   ',
        password: 'mot-de-passe-securise',
        displayName: '',
        role: 'admin',
      }),
    ).rejects.toThrow(/Identifiant/);
    expect(await countAdminUsers()).toBe(0);
  });

  it('utilise l’identifiant comme nom affiché si besoin', async () => {
    const created = await bootstrapAdminUser({
      login: 'lea',
      password: 'mot-de-passe-securise',
      displayName: '   ',
      role: 'admin',
    });
    expect(created?.displayName).toBe('lea');
  });

  it('applique les droits par rôle', () => {
    const editor = permissionsForRole('editor');
    expect(editor.draft).toBe(true);
    expect(editor.publish).toBe(false);
    expect(
      adminCan({ id: '1', login: 'e', displayName: 'E', role: 'editor', active: true }, 'publish'),
    ).toBe(false);
  });
});
