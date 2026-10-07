import { randomBytes, scryptSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { permissionsForRole } from '../src/domain/admin-users.ts';
import * as schema from '../src/db/schema.ts';
import { adminCan, getAuthenticatedAdmin, loginAdmin } from '../src/lib/admin-auth-db.ts';
import { databaseAdminMode } from '../src/lib/admin-users-store.ts';

const pglite = new PGlite();
const testDb = drizzle(pglite, { schema });

vi.mock('../src/db/client.ts', () => ({
  hasDatabaseConfiguration: () => true,
  getDb: () => testDb,
}));

beforeAll(async () => {
  for (const file of ['0000_editorial_records.sql', '0001_admin_users.sql']) {
    const migration = readFileSync(join(process.cwd(), 'drizzle', file), 'utf8');
    const statements = migration
      .split('--> statement-breakpoint')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    for (const statement of statements) await pglite.exec(statement);
  }
  vi.stubEnv('SITE_ADMIN_SECRET', 'x'.repeat(32));
});

describe('comptes admin Postgres', () => {
  it('authentifie un compte importé et lit sa session', async () => {
    const salt = randomBytes(16);
    const hash = scryptSync('mot-de-passe-securise', salt, 64);
    await testDb.insert(schema.adminUsers).values({
      id: 'admin-1',
      login: 'loic',
      displayName: 'Loïc',
      passwordHash: `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`,
      role: 'admin',
      active: 1,
    });
    expect(await databaseAdminMode()).toBe(true);
    const result = await loginAdmin('loic', 'mot-de-passe-securise');
    expect(result?.user.role).toBe('admin');
    expect(result?.session.value).toContain('db_admin-1');
    const request = new Request('https://sandboxpodcast.fr/admin', {
      headers: { cookie: `sandbox_admin_session=${result?.session.value ?? ''}` },
    });
    expect((await getAuthenticatedAdmin(request))?.username).toBe('loic');
    expect(await loginAdmin('loic', 'mauvais')).toBeUndefined();
  });

  it('applique les droits par rôle', () => {
    const editor = permissionsForRole('editor');
    expect(editor.draft).toBe(true);
    expect(editor.publish).toBe(false);
    expect(
      adminCan(
        { id: '1', username: 'e', displayName: 'E', role: 'editor', active: true },
        'publish',
      ),
    ).toBe(false);
  });
});
