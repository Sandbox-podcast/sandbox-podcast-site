import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AttemptResult } from '../src/lib/admin-rate-limit.ts';

const mocks = vi.hoisted(() => ({
  attempt: vi.fn<() => Promise<AttemptResult>>(),
  login: vi.fn(),
  change: vi.fn(),
}));
vi.mock('../src/lib/admin-rate-limit.ts', () => ({ checkAdminAttempt: mocks.attempt }));
vi.mock('../src/lib/admin-auth-db.ts', () => ({
  adminAuthReady: async () => true,
  loginAdmin: mocks.login,
  getAuthenticatedAdmin: async () => ({ id: 'test', role: 'admin' }),
  changeAdminPassword: mocks.change,
  AdminPasswordChangeError: class extends Error {},
  ADMIN_PASSWORD_MIN_LENGTH: 12,
  ADMIN_PASSWORD_MAX_LENGTH: 200,
}));
import { POST as login } from '../src/app/api/admin/login/route.ts';
import { POST as password } from '../src/app/api/admin/password/route.ts';

afterEach(() => vi.clearAllMocks());

describe('protection des routes de connexion', () => {
  it.each([login, password])(
    'refuse avant authentification lorsque le quota est épuisé ou indisponible',
    async (route) => {
      const request = () =>
        new Request('https://sandbox.test/api/admin/login', {
          method: 'POST',
          headers: { origin: 'https://sandbox.test', host: 'sandbox.test' },
          body: JSON.stringify({ username: 'test', password: 'not-used' }),
        });
      mocks.attempt.mockResolvedValue({ status: 'limited', retryAfter: 127 });
      const limited = await route(request());
      expect(limited.status).toBe(429);
      expect(limited.headers.get('retry-after')).toBe('127');
      expect(limited.headers.get('set-cookie')).toBeNull();
      mocks.attempt.mockResolvedValue({ status: 'unavailable' });
      expect((await route(request())).status).toBe(503);
      expect(mocks.login).not.toHaveBeenCalled();
      expect(mocks.change).not.toHaveBeenCalled();
    },
  );
});
