import { scryptSync } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ADMIN_COOKIE,
  adminSecretsReady,
  adminUsername,
  createAdminSession,
  isAdminRequest,
  originIsSameSite,
  passwordMatches,
} from '../src/lib/admin-auth.ts';

afterEach(() => vi.unstubAllEnvs());

function adminRequest(origin?: string, host = '127.0.0.1:3000'): Request {
  return new Request('http://localhost:3000/api/admin/content', {
    headers: {
      host,
      ...(origin ? { origin } : {}),
    },
  });
}

describe('protection des écritures du backoffice', () => {
  it('accepte localhost et 127.0.0.1 quand le Host correspond en développement', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(originIsSameSite(adminRequest('http://localhost:3000'))).toBe(true);
    expect(originIsSameSite(adminRequest('http://127.0.0.1:3000'))).toBe(true);
  });

  it('refuse une origine externe ou absente', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(originIsSameSite(adminRequest('https://example.com'))).toBe(false);
    expect(originIsSameSite(adminRequest('https://example.com', 'example.com'))).toBe(false);
    expect(originIsSameSite(adminRequest())).toBe(false);
  });

  it('n’utilise pas la tolérance locale en production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(originIsSameSite(adminRequest('http://localhost:3000'))).toBe(true);
    expect(originIsSameSite(adminRequest('http://127.0.0.1:3000'))).toBe(false);
  });
});

const passwords = {
  lou: 'Lou-Test-Secret-1234',
  nicolas: 'Nicolas-Test-Secret-1234',
  loic: 'Loic-Test-Secret-1234',
};

function configureAccounts(): void {
  const salt = Buffer.alloc(16, 1);
  vi.stubEnv('SITE_ADMIN_SECRET', 'a'.repeat(48));
  vi.stubEnv(
    'SITE_ADMIN_USERS',
    JSON.stringify(
      Object.entries(passwords).map(([username, password]) => ({
        username,
        passwordHash: `scrypt:${salt.toString('hex')}:${scryptSync(password, salt, 64).toString('hex')}`,
      })),
    ),
  );
}

function requestWithSession(value?: string): Request {
  return new Request('http://localhost:3000/api/admin/content', {
    headers: value ? { cookie: `${ADMIN_COOKIE}=${value}` } : {},
  });
}

describe('comptes nominatifs du backoffice', () => {
  it('refuse l’accès local sans session, même en développement', () => {
    configureAccounts();
    vi.stubEnv('NODE_ENV', 'development');
    expect(adminSecretsReady()).toBe(true);
    expect(isAdminRequest(requestWithSession())).toBe(false);
  });

  it('ouvre une session distincte pour chacun des trois comptes', () => {
    configureAccounts();
    for (const [username, password] of Object.entries(passwords)) {
      expect(passwordMatches(username, password)).toBe(true);
      expect(passwordMatches(username, 'mauvais mot de passe')).toBe(false);
      const session = createAdminSession(username);
      expect(session).toBeDefined();
      expect(adminUsername(requestWithSession(session?.value))).toBe(username);
    }
    expect(passwordMatches('inconnu', passwords.lou)).toBe(false);
    expect(passwordMatches('nicolas', passwords.lou)).toBe(false);
    expect(createAdminSession('inconnu')).toBeUndefined();
  });

  it('refuse un cookie altéré et invalide la session après rotation du mot de passe', () => {
    configureAccounts();
    const session = createAdminSession('lou');
    expect(session).toBeDefined();
    const value = session?.value ?? '';
    expect(adminUsername(requestWithSession(value.replace(/^lou/, 'loic')))).toBeUndefined();
    expect(adminUsername(requestWithSession(`${value}x`))).toBeUndefined();
    vi.stubEnv(
      'SITE_ADMIN_USERS',
      JSON.stringify([
        { username: 'lou', passwordHash: `scrypt:${'a'.repeat(32)}:${'b'.repeat(128)}` },
      ]),
    );
    expect(adminUsername(requestWithSession(value))).toBeUndefined();
  });

  it('refuse une configuration de comptes invalide ou dupliquée', () => {
    vi.stubEnv('SITE_ADMIN_SECRET', 'a'.repeat(48));
    vi.stubEnv('SITE_ADMIN_USERS', '[{"username":"lou","passwordHash":"clair"}]');
    expect(adminSecretsReady()).toBe(false);
    vi.stubEnv(
      'SITE_ADMIN_USERS',
      JSON.stringify([
        { username: 'lou', passwordHash: `scrypt:${'a'.repeat(32)}:${'b'.repeat(128)}` },
        { username: 'lou', passwordHash: `scrypt:${'a'.repeat(32)}:${'b'.repeat(128)}` },
      ]),
    );
    expect(adminSecretsReady()).toBe(false);
  });
});
