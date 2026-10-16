import { describe, expect, it, vi } from 'vitest';
import config from '../next.config.ts';

describe('CSP de production pour la mesure consentie', () => {
  it('autorise les tags et la réception GA4 sans ouvrir les régies publicitaires', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      const routes = await config.headers?.();
      const headers = routes?.find((route) => route.source === '/:path*')?.headers;
      const policy =
        routes
          ?.find((route) => route.source === '/((?!admin(?:/|$)).*)')
          ?.headers.find((header) => header.key === 'Content-Security-Policy')?.value ?? '';
      const directives = new Map(
        policy.split('; ').map((directive) => {
          const [name, ...values] = directive.split(' ');
          return [name, values];
        }),
      );
      expect(directives.get('script-src')).toContain('https://www.googletagmanager.com');
      expect(directives.get('connect-src')).toContain('https://*.google-analytics.com');
      expect(directives.get('connect-src')).toContain('https://www.googletagmanager.com');
      expect(policy).not.toContain('doubleclick');
      expect(policy).not.toContain('unsafe-eval');
      expect(headers?.find((header) => header.key === 'Referrer-Policy')?.value).toBe(
        'strict-origin',
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
