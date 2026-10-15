import { describe, expect, it, vi } from 'vitest';
import { inspectSitemapPage, sitemapOrigin, sitemapUrls } from '../src/domain/sitemap-health.ts';
import { auditSitemap } from '../src/lib/sitemap-audit.ts';

const origin = 'https://example.com';
const xml = (urls: string[]) =>
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${url}</loc></url>`).join('')}</urlset>`;
const html = (path: string, extra = '') =>
  `<html><head><link href="${origin}${path}" rel="canonical">${extra}</head><body>Page</body></html>`;
const headers = new Headers({ 'content-type': 'text/html; charset=utf-8' });

describe('contrôle HTTP du sitemap', () => {
  it('lit les URL XML sans suivre les entrées hors domaine et refuse les doublons', () => {
    expect(sitemapUrls(xml([`${origin}/?a=1&amp;b=2`]), origin)).toEqual([`${origin}/?a=1&b=2`]);
    expect(() => sitemapUrls(xml([`${origin}/`, `${origin}/`]), origin)).toThrow(/dupliquée/);
    expect(() => sitemapUrls(xml(['https://other.example/']), origin)).toThrow(/hors domaine/);
    expect(() => sitemapUrls('<html>Erreur</html>', origin)).toThrow(/XML/);
    expect(() => sitemapUrls(xml([]), origin)).toThrow(/aucune URL/);
    expect(() => sitemapUrls(xml([`${origin}/#fragment`]), origin)).toThrow();
    expect(() => sitemapOrigin('https://user:password@example.com')).toThrow();
  });

  it("exige 200, une page indexable et un canonical unique identique à l'URL annoncée", () => {
    expect(inspectSitemapPage(`${origin}/page`, 200, headers, html('/page')).issues).toEqual([]);
    expect(inspectSitemapPage(`${origin}/page`, 404, headers, html('/page')).issues).toContain(
      'HTTP 404 (200 attendu)',
    );
    expect(inspectSitemapPage(`${origin}/page`, 308, headers, html('/page')).issues).toContain(
      'HTTP 308 (200 attendu)',
    );
    for (const meta of [
      '<meta name="robots" content="noindex, follow">',
      "<META CONTENT='NONE' NAME='Googlebot'>",
    ])
      expect(
        inspectSitemapPage(`${origin}/page`, 200, headers, html('/page', meta)).issues,
      ).toContain('URL non indexable (robots)');
    const blocked = new Headers(headers);
    blocked.set('x-robots-tag', 'googlebot: noindex');
    expect(inspectSitemapPage(`${origin}/page`, 200, blocked, html('/page')).issues).toContain(
      'URL non indexable (robots)',
    );
    expect(inspectSitemapPage(`${origin}/page`, 200, headers, html('/other')).issues).toContain(
      "Canonical différent de l'URL annoncée",
    );
    expect(
      inspectSitemapPage(`${origin}/page`, 200, headers, '<html>Page</html>').issues,
    ).toContain('Canonical unique attendu');
    expect(
      inspectSitemapPage(`${origin}/page`, 200, new Headers(), html('/page')).issues,
    ).toContain('Réponse HTML attendue');
  });

  it('ignore les faux éléments HTML contenus dans les scripts', () => {
    expect(
      inspectSitemapPage(
        `${origin}/page`,
        200,
        headers,
        html(
          '/page',
          '<script>const example = \'<meta name="robots" content="noindex">\';</script>',
        ),
      ).issues,
    ).toEqual([]);
  });

  it('contrôle toutes les entrées même après une 404 ou une erreur réseau, sans session ni redirection', async () => {
    const fetcher: typeof fetch = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        expect(init?.redirect).toBe('manual');
        expect(new Headers(init?.headers).has('cookie')).toBe(false);
        const url = input instanceof Request ? input.url : input.toString();
        if (url.endsWith('/sitemap.xml'))
          return new Response(
            xml(['/good', '/missing', '/offline', '/last'].map((path) => origin + path)),
          );
        if (url.endsWith('/offline')) throw new TypeError('network');
        const path = new URL(url).pathname;
        return new Response(html(path), { status: path === '/missing' ? 404 : 200, headers });
      },
    );
    const report = await auditSitemap(origin, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(5);
    expect(report).toMatchObject({ total: 4, passed: 2, failed: 2 });
    expect(report.pages.at(-1)?.url).toBe(`${origin}/last`);
    expect(report.pages[2]).toMatchObject({
      status: null,
      issues: ['Lecture impossible : TypeError'],
    });
  });
});
