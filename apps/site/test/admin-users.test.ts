import { randomBytes, scryptSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { permissionsForRole } from '../src/domain/admin-users.ts';
import * as schema from '../src/db/schema.ts';
import {
  AdminPasswordChangeError,
  adminCan,
  changeAdminPassword,
  getAuthenticatedAdmin,
  loginAdmin,
} from '../src/lib/admin-auth-db.ts';
import {
  AdminUserManageError,
  createManagedAdminUser,
  deactivateManagedAdminUser,
  listManagedAdminUsers,
  resetManagedAdminPassword,
  updateManagedAdminUser,
} from '../src/lib/admin-users-manage.ts';
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

  it('change le mot de passe d’un compte en base et invalide l’ancienne session', async () => {
    const salt = randomBytes(16);
    const hash = scryptSync('ancien-mot-de-passe', salt, 64);
    await testDb.insert(schema.adminUsers).values({
      id: 'admin-2',
      login: 'lou',
      displayName: 'Lou',
      passwordHash: `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`,
      role: 'admin',
      active: 1,
    });
    const before = await loginAdmin('lou', 'ancien-mot-de-passe');
    expect(before).toBeDefined();
    const user = before?.user;
    if (!user) throw new Error('compte absent');
    const changed = await changeAdminPassword(
      user,
      'ancien-mot-de-passe',
      'nouveau-mot-de-passe',
      'nouveau-mot-de-passe',
    );
    expect(changed.session.value).toContain('db_admin-2');
    expect(await loginAdmin('lou', 'ancien-mot-de-passe')).toBeUndefined();
    expect((await loginAdmin('lou', 'nouveau-mot-de-passe'))?.user.username).toBe('lou');
    const stale = new Request('https://sandboxpodcast.fr/admin', {
      headers: { cookie: `sandbox_admin_session=${before?.session.value ?? ''}` },
    });
    expect(await getAuthenticatedAdmin(stale)).toBeUndefined();
    await expect(
      changeAdminPassword(user, 'mauvais', 'autre-mot-de-passe', 'autre-mot-de-passe'),
    ).rejects.toBeInstanceOf(AdminPasswordChangeError);
  });

  it('gère les comptes : création, rôle, désactivation et garde du dernier admin', async () => {
    const salt = randomBytes(16);
    const hash = scryptSync('mot-de-passe-admin', salt, 64);
    await testDb.insert(schema.adminUsers).values({
      id: 'admin-manager',
      login: 'nicolas',
      displayName: 'Nicolas',
      passwordHash: `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`,
      role: 'admin',
      active: 1,
    });
    const managerLogin = await loginAdmin('nicolas', 'mot-de-passe-admin');
    const manager = managerLogin?.user;
    if (!manager) throw new Error('compte manager absent');

    const created = await createManagedAdminUser(manager, {
      username: 'alice',
      displayName: 'Alice',
      role: 'editor',
      password: 'mot-de-passe-alice',
    });
    expect(created.role).toBe('editor');
    expect((await listManagedAdminUsers(manager)).some((user) => user.username === 'alice')).toBe(
      true,
    );
    expect((await loginAdmin('alice', 'mot-de-passe-alice'))?.user.role).toBe('editor');

    const promoted = await updateManagedAdminUser(manager, created.id, { role: 'admin' });
    expect(promoted.role).toBe('admin');
    await resetManagedAdminPassword(manager, created.id, 'mot-de-passe-alice-2');
    expect(await loginAdmin('alice', 'mot-de-passe-alice')).toBeUndefined();
    expect((await loginAdmin('alice', 'mot-de-passe-alice-2'))?.user.username).toBe('alice');

    await deactivateManagedAdminUser(manager, created.id);
    expect(await loginAdmin('alice', 'mot-de-passe-alice-2')).toBeUndefined();

    await expect(deactivateManagedAdminUser(manager, manager.id)).rejects.toMatchObject({
      code: 'self_lockout',
    } satisfies Partial<AdminUserManageError>);
    await expect(
      updateManagedAdminUser(manager, manager.id, { role: 'editor' }),
    ).rejects.toMatchObject({ code: 'self_lockout' });
    await expect(
      createManagedAdminUser(
        { id: 'x', username: 'e', displayName: 'E', role: 'editor', active: true },
        {
          username: 'bob',
          displayName: 'Bob',
          role: 'viewer',
          password: 'mot-de-passe-bob1',
        },
      ),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });
});
