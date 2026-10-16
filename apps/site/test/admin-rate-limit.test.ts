import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  adminAttemptKey,
  checkAdminAttempt,
  consumeDatabaseAttempt,
} from '../src/lib/admin-rate-limit.ts';

afterEach(() => vi.unstubAllEnvs());

describe('limiteur partagé des connexions', () => {
  it('partage le compteur entre instances et réserve exactement cinq tentatives concurrentes', async () => {
    const pg = new PGlite();
    try {
      await pg.exec(readFileSync('drizzle/0015_admin_login_attempts.sql', 'utf8'));
      const first = drizzle(pg);
      const second = drizzle(pg);
      const results = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          consumeDatabaseAttempt(i % 2 ? first : second, 'address-hash'),
        ),
      );
      expect(results.filter((result) => result.status === 'allowed')).toHaveLength(5);
      expect(results.filter((result) => result.status === 'limited')).toHaveLength(15);
      expect(await consumeDatabaseAttempt(second, 'other-hash')).toEqual({ status: 'allowed' });
      await pg.exec("UPDATE admin_login_attempts SET expires_at = now() - interval '2 days'");
      expect(await consumeDatabaseAttempt(first, 'address-hash')).toEqual({ status: 'allowed' });
      const rows = await pg.query('SELECT * FROM admin_login_attempts');
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0]).toMatchObject({ key: 'address-hash', attempts: 1 });
    } finally {
      await pg.close();
    }
  });

  it('ignore les en-têtes usurpables hors Vercel et ne conserve pas les IP en clair', () => {
    const request = (address: string) =>
      new Request('https://sandbox.test', { headers: { 'x-forwarded-for': address } });
    vi.stubEnv('VERCEL', '');
    expect(adminAttemptKey(request('192.0.2.1'), 'secret')).toBe(
      adminAttemptKey(request('192.0.2.2'), 'secret'),
    );
    vi.stubEnv('VERCEL', '1');
    const key = adminAttemptKey(request('192.0.2.1'), 'secret');
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(key).not.toBe(adminAttemptKey(request('192.0.2.2'), 'secret'));
    expect(key).not.toBe(adminAttemptKey(request('192.0.2.1'), 'rotated'));
    expect(adminAttemptKey(request('2001:db8::1'), 'secret')).toBe(
      adminAttemptKey(request('2001:0DB8:0:0:0:0:0:1'), 'secret'),
    );
    expect(adminAttemptKey(request('fake, 192.0.2.1'), 'secret')).toBe(
      adminAttemptKey(request('bad'), 'secret'),
    );
  });

  it('ferme les connexions en production si la protection partagée manque', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SITE_ADMIN_SECRET', 'a'.repeat(48));
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('POSTGRES_URL', '');
    expect(await checkAdminAttempt(new Request('https://sandbox.test'))).toEqual({
      status: 'unavailable',
    });
  });
});
