import { z } from 'zod';

const httpUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.hash;
}, 'URL HTTP sans identifiants ni fragment requise');

function decodeXml(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, (match, entity: string) => {
    if (entity.startsWith('#')) {
      const code =
        entity[1]?.toLowerCase() === 'x'
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return (
      ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[
        entity.toLowerCase()
      ] ?? match
    );
  });
}

export function sitemapOrigin(value: string): string {
  return new URL(httpUrlSchema.parse(value)).origin;
}

/** Format urlset utilisé par le site. Une entrée hors domaine n'est jamais suivie. */
export function sitemapUrls(xml: string, origin: string): string[] {
  if (!/<urlset(?:\s|>)/i.test(xml) || !/<\/urlset\s*>/i.test(xml))
    throw new Error('Sitemap urlset XML attendu.');
  const urls = [...xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc\s*>/gi)].map((match) =>
    httpUrlSchema.parse(decodeXml((match[1] ?? '').trim())),
  );
  if (!urls.length) throw new Error('Le sitemap ne contient aucune URL.');
  const expectedOrigin = sitemapOrigin(origin);
  for (const url of urls)
    if (new URL(url).origin !== expectedOrigin)
      throw new Error(`URL du sitemap hors domaine : ${url}`);
  if (new Set(urls).size !== urls.length) throw new Error('URL dupliquée dans le sitemap.');
  return urls;
}

function attributes(tag: string): Record<string, string> {
  return Object.fromEntries(
    [...tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map((match) => [
      (match[1] ?? '').toLowerCase(),
      decodeXml(match[2] ?? match[3] ?? match[4] ?? ''),
    ]),
  );
}

export interface SitemapPageResult {
  url: string;
  status: number | null;
  canonical: string | null;
  robots: string[];
  issues: string[];
}

export function inspectSitemapPage(
  url: string,
  status: number,
  headers: Headers,
  html: string,
): SitemapPageResult {
  const issues: string[] = [];
  if (status !== 200) issues.push(`HTTP ${String(status)} (200 attendu)`);
  if (!headers.get('content-type')?.toLowerCase().includes('text/html'))
    issues.push('Réponse HTML attendue');
  // Écarte les chaînes sérialisées des scripts Next : seuls les éléments du document comptent.
  const document = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const tags = [...document.matchAll(/<(meta|link)\b[^>]*>/gi)].map((match) => ({
    name: match[1]?.toLowerCase(),
    attributes: attributes(match[0]),
  }));
  const robots = tags.flatMap((tag) =>
    tag.name === 'meta' && /^(robots|googlebot)$/i.test(tag.attributes['name'] ?? '')
      ? [tag.attributes['content'] ?? '']
      : [],
  );
  const headerRobots = headers.get('x-robots-tag');
  if (headerRobots) robots.push(headerRobots);
  if (robots.some((value) => /\b(noindex|none)\b/i.test(value)))
    issues.push('URL non indexable (robots)');
  const canonicals = tags.filter(
    (tag) => tag.name === 'link' && /\bcanonical\b/i.test(tag.attributes['rel'] ?? ''),
  );
  const canonical = canonicals[0]?.attributes['href'] ?? null;
  if (canonicals.length !== 1 || !canonical) issues.push('Canonical unique attendu');
  else if (!URL.canParse(canonical) || new URL(canonical).href !== new URL(url).href)
    issues.push("Canonical différent de l'URL annoncée");
  return { url, status, canonical, robots, issues };
}
