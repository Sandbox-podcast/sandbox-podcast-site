import { z } from 'zod';
import { NEWS_MEDIA, type NewsMedia } from '../domain/news-media.ts';
import {
  newsItemSchema,
  uniqueNews,
  type NewsFeed,
  type NewsItem,
} from '../domain/news-preview.ts';
import { readLimitedBody } from '../lib/limited-body.ts';
import { applyNewsEditorial, NEWS_EDITORIAL } from './news-editorial.ts';

export function newsPlainText(value: string): string {
  const entities: Record<string, string> = {
    amp: '&',
    quot: '"',
    apos: "'",
    lt: '<',
    gt: '>',
    nbsp: ' ',
    rsquo: "'",
    lsquo: "'",
    ndash: '-',
    mdash: '-',
    hellip: '...',
  };
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, entity: string) => {
      if (!entity.startsWith('#')) return entities[entity.toLowerCase()] ?? '';
      const code = entity.startsWith('#x')
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    })
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function attributes(tag: string): Record<string, string> {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((match) => [
      match[1]?.toLowerCase() ?? '',
      newsPlainText(match[2] ?? match[3] ?? ''),
    ]),
  );
}
export function discoverNewsArticles(
  html: string,
  source: NewsMedia,
): { url: string; date?: string | undefined }[] {
  const results = new Map<string, { url: string; date?: string | undefined }>();
  for (const match of html.matchAll(/<a\b([^>]*?)>([\s\S]*?)<\/a>/gi)) {
    const href = attributes(match[1] ?? '')['href'];
    if (!href) continue;
    let url: URL;
    try {
      url = new URL(href, source.url);
    } catch {
      continue;
    }
    if (
      url.origin !== new URL(source.url).origin ||
      !url.pathname.startsWith(source.path) ||
      url.username ||
      url.password
    )
      continue;
    if (source.id === 'tldr' && !/^\/ai\/\d{4}-\d{2}-\d{2}$/.test(url.pathname)) continue;
    if (['/news/about', '/articles/about'].includes(url.pathname)) continue;
    url.search = '';
    url.hash = '';
    const text = newsPlainText(match[2] ?? '');
    const day =
      /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?) \d{1,2},? \d{4}\b/.exec(
        text,
      )?.[0];
    const timestamp = day ? Date.parse(`${day} GMT`) : Number.NaN;
    const date = Number.isFinite(timestamp)
      ? new Date(timestamp).toISOString().slice(0, 10)
      : undefined;
    const previous = results.get(url.href);
    results.set(url.href, { url: url.href, date: date ?? previous?.date });
  }
  return [...results.values()].slice(0, 3);
}
const articleMetadata = z.object({
  '@type': z.union([z.string(), z.array(z.string())]),
  headline: z.string(),
  datePublished: z.string(),
  description: z.string().optional(),
});
function findArticleMetadata(
  value: unknown,
  depth = 0,
): z.infer<typeof articleMetadata> | undefined {
  if (depth > 12) return undefined;
  const article = articleMetadata.safeParse(value);
  if (
    article.success &&
    ['Article', 'NewsArticle', 'BlogPosting'].some((type) => article.data['@type'].includes(type))
  )
    return article.data;
  if (Array.isArray(value)) {
    for (const child of value.slice(0, 100)) {
      const found = findArticleMetadata(child, depth + 1);
      if (found) return found;
    }
  } else {
    const object = z.record(z.string(), z.unknown()).safeParse(value);
    if (object.success)
      for (const key of ['@graph', 'mainEntity']) {
        const found = findArticleMetadata(object.data[key], depth + 1);
        if (found) return found;
      }
  }
  return undefined;
}
export function parseNewsArticle(
  html: string,
  url: string,
  source: NewsMedia,
  hintedDate?: string,
): NewsItem | undefined {
  const location = new URL(url);
  if (location.origin !== new URL(source.url).origin || !location.pathname.startsWith(source.path))
    return undefined;
  const meta = new Map<string, string>();
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    meta.set(attrs['property'] ?? attrs['name'] ?? '', attrs['content'] ?? '');
  }
  let structured: z.infer<typeof articleMetadata> | undefined;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (attributes(match[1] ?? '')['type'] !== 'application/ld+json') continue;
    try {
      structured = findArticleMetadata(JSON.parse(match[2] ?? '') as unknown) ?? structured;
    } catch {
      /* Un bloc JSON-LD invalide ne remplace pas les métadonnées Open Graph. */
    }
  }
  const headline = newsPlainText(structured?.headline ?? meta.get('og:title') ?? '')
    .split(' | ')[0]
    ?.trim();
  const metaExcerpt = newsPlainText(
    structured?.description ??
      meta.get('og:description') ??
      meta.get('twitter:description') ??
      meta.get('description') ??
      '',
  );
  const articleHtml =
    /<article\b[^>]*>([\s\S]{0,500000}?)<\/article>/i.exec(html)?.[1] ??
    /<main\b[^>]*>([\s\S]{0,500000}?)<\/main>/i.exec(html)?.[1] ??
    '';
  const articleExcerpt = newsPlainText(
    articleHtml.replace(
      /<(?:script|style|nav|header|footer|aside)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|header|footer|aside)>/gi,
      ' ',
    ),
  );
  const sourceExcerpt = (articleExcerpt.length >= 240 ? articleExcerpt : metaExcerpt).slice(
    0,
    8000,
  );
  const rawDate =
    meta.get('article:published_time') ??
    structured?.datePublished ??
    (source.id === 'tldr'
      ? /<h1[^>]*>TLDR AI (\d{4}-\d{2}-\d{2})<\/h1>/i.exec(html)?.[1]
      : undefined) ??
    hintedDate;
  if (!headline || !rawDate) return undefined;
  const isDay = z.iso.date().safeParse(rawDate).success;
  if (!isDay && !z.iso.datetime({ offset: true }).safeParse(rawDate).success) return undefined;
  const timestamp = Date.parse(rawDate);
  if (!Number.isFinite(timestamp)) return undefined;
  const publishedAt = isDay ? rawDate : new Date(timestamp).toISOString();
  const editorial = Object.hasOwn(NEWS_EDITORIAL, location.pathname)
    ? NEWS_EDITORIAL[location.pathname]
    : undefined;
  const category: NewsItem['category'] =
    editorial?.category ??
    (/research|study|paper|slam|training/i.test(headline)
      ? 'research'
      : /code|developer|github|filesystem/i.test(headline)
        ? 'development'
        : /business|startup|fund|company|revenue/i.test(headline)
          ? 'business'
          : /safety|law|regulat|ban|privacy/i.test(headline)
            ? 'society'
            : /model|llm/i.test(headline)
              ? 'models'
              : 'uses');
  return newsItemSchema.parse({
    id: `${source.id}:${location.pathname}`,
    project: source.name,
    repository: location.hostname,
    version: 'article',
    url: location.href,
    publishedAt,
    category,
    prerelease: false,
    kind: 'article',
    headline,
    ...(sourceExcerpt ? { sourceExcerpt } : {}),
    titles: editorial ? { 'fr-FR': editorial.title } : undefined,
    synopses: editorial ? { 'fr-FR': editorial.sentences } : undefined,
  });
}

/** Quatre requêtes simultanées au maximum, aucune inscription ou page privée. */
export async function collectMediaNewsPreview(
  previous: NewsFeed,
  transport: typeof fetch = fetch,
  now = new Date(),
): Promise<NewsFeed> {
  let active = 0;
  const queue: (() => void)[] = [];
  async function get(url: string): Promise<string> {
    if (active >= 4)
      await new Promise<void>((resolve) => {
        queue.push(resolve);
      });
    active += 1;
    try {
      const response = await transport(url, {
        headers: { Accept: 'text/html', 'User-Agent': 'SANDBOX-News-Local/1.0' },
        redirect: 'error',
        cache: 'no-store',
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await readLimitedBody(response.body, 6_000_000);
      if (!body) throw new Error('Réponse absente ou trop grande');
      return body.toString('utf8');
    } finally {
      active -= 1;
      queue.shift()?.();
    }
  }
  const results = await Promise.allSettled(
    NEWS_MEDIA.map(async (source) => {
      // Accès refusé lors de la vérification navigateur ; aucun contournement.
      if (source.id === 'taaft') throw new Error('Accès indisponible');
      const home = await get(source.url);
      const links = discoverNewsArticles(home, source);
      if (links.length === 0) throw new Error('Aucun article public détecté');
      const pages = await Promise.allSettled(
        links.map(async (link) =>
          parseNewsArticle(await get(link.url), link.url, source, link.date),
        ),
      );
      const items = pages.flatMap((page) =>
        page.status === 'fulfilled' && page.value ? [page.value] : [],
      );
      if (!items.length) throw new Error('Date de publication exploitable absente');
      return { items, partial: pages.some((page) => page.status === 'rejected' || !page.value) };
    }),
  );
  const items = previous.items.filter((item) => item.kind === 'article');
  const sources = results.map((result, index) => {
    const source = NEWS_MEDIA[index];
    if (result.status === 'fulfilled') items.push(...result.value.items);
    return {
      name: source?.name ?? 'Média',
      url: source?.url,
      ok: result.status === 'fulfilled' && !result.value.partial,
      reason:
        result.status === 'rejected'
          ? result.reason instanceof Error
            ? result.reason.message.slice(0, 180)
            : 'Source indisponible'
          : result.value.partial
            ? 'Lecture partielle'
            : undefined,
    };
  });
  return {
    checkedAt: now.toISOString(),
    sources,
    items: uniqueNews(items)
      .map((item) => applyNewsEditorial(item))
      .filter(
        (item) =>
          Date.parse(item.publishedAt) <= now.getTime() &&
          Date.parse(item.publishedAt) >= now.getTime() - 14 * 86_400_000,
      )
      .slice(0, 200),
  };
}
