import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { proxy } from '../src/proxy.ts';
import { adminContentSecurityPolicy } from '../src/domain/admin-csp.ts';

afterEach(() => vi.unstubAllEnvs());

describe('CSP de l’administration', () => {
  it('produit un nonce neuf par réponse et le transmet au rendu Next', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const request = new NextRequest('https://sandbox.test/admin', {
      headers: { 'x-nonce': 'attacker' },
    });
    const first = proxy(request);
    const second = proxy(request);
    const policy = first.headers.get('Content-Security-Policy') ?? '';
    const scripts = policy.split('; ').find((directive) => directive.startsWith('script-src '));
    expect(scripts).toContain("'nonce-");
    expect(scripts).not.toContain('unsafe-inline');
    expect(scripts).not.toContain('unsafe-eval');
    expect(policy).not.toBe(second.headers.get('Content-Security-Policy'));
    expect(first.headers.get('x-middleware-request-content-security-policy')).toBe(policy);
    expect(first.headers.get('Cache-Control')).toContain('no-store');
    expect(policy).not.toContain('attacker');
  });
  it('ne rend pas les pages publiques dynamiques et refuse un nonce injecté', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(
      proxy(new NextRequest('https://sandbox.test/podcast')).headers.has(
        'x-middleware-request-x-nonce',
      ),
    ).toBe(false);
    expect(() => adminContentSecurityPolicy("'; unsafe-inline")).toThrow();
  });
});
