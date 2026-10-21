import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import {
  browserLocaleRedirect,
  manualLocaleCookie,
  preferredBrowserLocale,
  SITE_LOCALE_COOKIE,
} from '../src/domain/browser-locale';
import { proxy } from '../src/proxy';

describe('langue de première visite', () => {
  it.each([
    ['en-US,en;q=0.9,fr;q=0.7', 'en'],
    ['fr;q=0.3,de-DE;q=0.9,en;q=0.6', 'de-DE'],
    ['es-MX,es;q=0.8', 'es-ES'],
    ['fr-CA,en;q=0.5', 'fr-FR'],
    ['ja-JP,zh;q=0.8', 'fr-FR'],
    ['en;q=0,de;q=0.8', 'de-DE'],
    ['de;q=0.9,en;q=0.9', 'de-DE'],
    ['en;q=2,de;q=bad,es;q=0.7', 'es-ES'],
    ['__proto__,constructor,*', 'fr-FR'],
    ['', 'fr-FR'],
  ])('respecte le classement %s', (header, expected) => {
    expect(preferredBrowserLocale(header)).toBe(expected);
  });

  it('privilégie les choix manuels français et étrangers', () => {
    expect(preferredBrowserLocale('en-US', 'fr-FR')).toBe('fr-FR');
    expect(preferredBrowserLocale('fr-FR', 'de-DE')).toBe('de-DE');
    expect(preferredBrowserLocale('es-ES', 'invalid')).toBe('es-ES');
    expect(preferredBrowserLocale(null, '%0aen')).toBe('fr-FR');
  });

  it('sérialise uniquement les quatre langues proposées pour un an', () => {
    expect(manualLocaleCookie('fr-FR', false)).toBe(
      `${SITE_LOCALE_COOKIE}=fr-FR; Path=/; Max-Age=31536000; SameSite=Lax`,
    );
    expect(manualLocaleCookie('en', true)).toMatch(/; Secure$/);
    expect(() => manualLocaleCookie('invalid; Path=/', true)).toThrow();
  });

  it.each([
    '/about',
    '/time-machine',
    '/api/news',
    '/admin',
    '/slides',
    '/images/rooms/cinema-room-v2.webp',
    '/favicon.ico',
    '/_next/static/a.js',
  ])('respecte le chemin explicite %s', (pathname) => {
    expect(
      browserLocaleRedirect({ pathname, method: 'GET', acceptLanguage: 'de-DE' }),
    ).toBeUndefined();
  });

  it('ne redirige aucune écriture', () => {
    expect(
      browserLocaleRedirect({ pathname: '/', method: 'POST', acceptLanguage: 'en' }),
    ).toBeUndefined();
  });

  it.each(['en', 'es-es', 'de-de'])(
    'redirige les anciennes pages %s en français sans perdre les paramètres',
    (locale) => {
      const response = proxy(
        new NextRequest(`https://sandbox.test/${locale}/news?source=direct`, {
          headers: { 'accept-language': 'en-US', host: 'sandbox.test' },
        }),
      );
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('https://sandbox.test/news?source=direct');
      expect(response.headers.get('cache-control')).toContain('private, no-store');
      expect(response.headers.get('vary')).toBe('Accept-Language, Cookie');
      const landed = proxy(
        new NextRequest(response.headers.get('location') ?? 'https://sandbox.test/', {
          headers: { 'accept-language': 'de-DE', host: 'sandbox.test' },
        }),
      );
      expect(landed.headers.get('location')).toBeNull();
    },
  );

  it('ignore une ancienne préférence étrangère et la langue du navigateur sur l’accueil', () => {
    const response = proxy(
      new NextRequest('https://sandbox.test/?source=direct', {
        headers: {
          'accept-language': 'en-US',
          cookie: `${SITE_LOCALE_COOKIE}=de-DE`,
          host: 'sandbox.test',
        },
      }),
    );
    expect(response.headers.get('location')).toBeNull();
    for (const pathname of ['/en', '/es-es', '/de-de'])
      expect(browserLocaleRedirect({ pathname, method: 'HEAD' })).toBe('/');
    expect(browserLocaleRedirect({ pathname: '/en/news', method: 'POST' })).toBeUndefined();
  });

  it('conserve le choix français malgré un navigateur anglais', () => {
    const response = proxy(
      new NextRequest('https://sandbox.test/', {
        headers: {
          'accept-language': 'en-US',
          cookie: `${SITE_LOCALE_COOKIE}=fr-FR`,
          host: 'sandbox.test',
        },
      }),
    );
    expect(response.headers.get('location')).toBeNull();
  });

  it('ne modifie pas le routage du sous-domaine slides', () => {
    const response = proxy(
      new NextRequest('https://slides.sandboxpodcast.fr/', {
        headers: { 'accept-language': 'en', host: 'slides.sandboxpodcast.fr' },
      }),
    );
    expect(response.headers.get('location') ?? '').not.toContain('/en');
  });
});
