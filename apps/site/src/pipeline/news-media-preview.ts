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
import { newsPlainText, newsHtmlAttributes as attributes } from '../domain/news-html.ts';
import { newsPublicationDate } from '../domain/news-dates.ts';
import { newsArticleUrl, newsArticleIdentity } from '../domain/news-source.ts';
export { newsPlainText } from '../domain/news-html.ts';
import { parseNewsChangelog } from './news-changelog.ts';
import { requestNewsPage } from '../lib/news-http.ts';

export function discoverNewsArticles(
  html: string,
  source: NewsMedia,
): { url: string; date?: string | undefined }[] {
  const results = new Map<string, { url: string; date?: string | undefined }>();
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1];
  for (const region of main ? [main, html] : [html]) {
    const content = region.replace(
      /<(script|style|header|nav|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi,
      ' ',
    );
    for (const match of content.matchAll(/<a\b([^>]*?)>([\s\S]*?)<\/a>/gi)) {
      const href = attributes(match[1] ?? '')['href'];
      if (!href) continue;
      const url = newsArticleUrl(source, href);
      if (!url) continue;
      if (source.id === 'tldr' && !/^\/ai\/\d{4}-\d{2}-\d{2}$/.test(url.pathname)) continue;
      if (['/news/about', '/articles/about'].includes(url.pathname)) continue;
      url.search = '';
      url.hash = '';
      const text = newsPlainText(match[2] ?? '');
      const day =
        /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?) \d{1,2},? \d{4}\b/.exec(
          text,
        )?.[0];
      const date = newsPublicationDate(day ?? text);
      const previous = results.get(url.href);
      results.set(url.href, { url: url.href, date: date ?? previous?.date });
    }
    if (results.size) break;
  }
  return [...results.values()].slice(0, 6);
}
const articleMetadata = z.object({
  '@type': z.union([z.string(), z.array(z.string())]),
  headline: z.string().optional(),
  name: z.string().optional(),
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
    ['Article', 'NewsArticle', 'BlogPosting', 'ScholarlyArticle', 'TechArticle'].some((type) =>
      article.data['@type'].includes(type),
    )
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
  const location = newsArticleUrl(source, url);
  if (!location) return undefined;
  const meta = new Map<string, string>();
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    meta.set(attrs['property'] ?? attrs['name'] ?? attrs['itemprop'] ?? '', attrs['content'] ?? '');
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
  const headline = newsPlainText(
    structured?.headline ??
      structured?.name ??
      meta.get('citation_title') ??
      meta.get('og:title') ??
      /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ??
      '',
  )
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
    meta.get('datePublished') ??
    meta.get('date') ??
    meta.get('pubdate') ??
    meta.get('publish-date') ??
    structured?.datePublished ??
    meta.get('citation_publication_date') ??
    /<time\b[^>]*datetime=["']([^"']+)["']/i.exec(articleHtml || html)?.[1] ??
    /<time\b[^>]*datetime=["']([^"']+)["']/i.exec(html)?.[1] ??
    /<time\b[^>]*>([\s\S]{0,200}?)<\/time>/i.exec(articleHtml || html)?.[1] ??
    /"publish_date"\s*:\s*"(\d{4}-\d{2}-\d{2})[|"]/.exec(html)?.[1] ??
    (source.id === 'apple-ml'
      ? /"published"\s*:\s*"(\d{4}-\d{2}-\d{2})"/.exec(html)?.[1]
      : undefined) ??
    (source.id === 'tldr'
      ? /<h1[^>]*>TLDR AI (\d{4}-\d{2}-\d{2})<\/h1>/i.exec(html)?.[1]
      : undefined) ??
    hintedDate;
  if (!headline || !rawDate) return undefined;
  const publishedAt = newsPublicationDate(newsPlainText(rawDate));
  if (!publishedAt) return undefined;
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
    id: newsArticleIdentity(source, location),
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
  async function get(url: string, source: NewsMedia): Promise<string> {
    if (active >= 4)
      await new Promise<void>((resolve) => {
        queue.push(resolve);
      });
    active += 1;
    try {
      let response: Response | undefined;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          response = await requestNewsPage(url, source, transport);
        } catch (error) {
          if (
            attempt === 0 &&
            error instanceof Error &&
            (error.name === 'TimeoutError' || error instanceof TypeError)
          )
            continue;
          throw error;
        }
        if (attempt === 0 && response.status >= 500) {
          await response.body?.cancel();
          continue;
        }
        break;
      }
      if (!response) throw new Error('Réponse absente');
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
    NEWS_MEDIA.map(async (definition) => {
      const source: NewsMedia = definition;
      const home = await get(source.fetchUrl ?? source.url, source);
      if (source.mode === 'changelog') {
        const items = parseNewsChangelog(home, source);
        if (!items.length) throw new Error('Aucune entrée datée avec ancre publique détectée');
        return { items, partial: false };
      }
      const links = discoverNewsArticles(home, source);
      if (links.length === 0) throw new Error('Aucun article public détecté');
      const pages = await Promise.allSettled(
        links.map(async (link) =>
          parseNewsArticle(await get(link.url, source), link.url, source, link.date),
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
      .slice(0, NEWS_MEDIA.length * 20),
  };
}
