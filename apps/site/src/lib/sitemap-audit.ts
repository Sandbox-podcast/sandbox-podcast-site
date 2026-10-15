import {
  inspectSitemapPage,
  sitemapOrigin,
  sitemapUrls,
  type SitemapPageResult,
} from '../domain/sitemap-health.ts';

export interface SitemapAuditReport {
  checkedAt: string;
  origin: string;
  sitemap: string;
  total: number;
  passed: number;
  failed: number;
  pages: SitemapPageResult[];
}

/** GET sans session, sans suivre les redirections, avec un délai borné par URL. */
export async function auditSitemap(
  value: string,
  fetcher: typeof fetch = fetch,
): Promise<SitemapAuditReport> {
  const origin = sitemapOrigin(value);
  const sitemap = `${origin}/sitemap.xml`;
  const request = (url: string) =>
    fetcher(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(30_000),
      headers: {
        Accept: 'text/html, application/xml;q=0.9',
        'User-Agent': 'Sandbox-Sitemap-Check/1.0',
      },
    });
  const response = await request(sitemap);
  if (response.status !== 200) throw new Error(`Sitemap : HTTP ${String(response.status)}`);
  const urls = sitemapUrls(await response.text(), origin);
  const pages: SitemapPageResult[] = [];
  // Une lecture à la fois limite la charge et les compilations simultanées en développement.
  for (const url of urls) {
    try {
      const page = await request(url);
      pages.push(inspectSitemapPage(url, page.status, page.headers, await page.text()));
    } catch (error) {
      pages.push({
        url,
        status: null,
        canonical: null,
        robots: [],
        issues: [`Lecture impossible : ${error instanceof Error ? error.name : 'erreur inconnue'}`],
      });
    }
  }
  const passed = pages.filter((page) => page.issues.length === 0).length;
  return {
    checkedAt: new Date().toISOString(),
    origin,
    sitemap,
    total: urls.length,
    passed,
    failed: urls.length - passed,
    pages,
  };
}
