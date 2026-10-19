import type { NewsMedia } from '../domain/news-media.ts';
import { newsItemSchema, type NewsItem } from '../domain/news-preview.ts';
import { newsPublicationDate } from '../domain/news-dates.ts';
import { newsPlainText, newsHtmlAttributes } from '../domain/news-html.ts';
import { newsArticleUrl, newsArticleIdentity } from '../domain/news-source.ts';
import { z } from 'zod';

const declaredArticle = z.object({
  url: z.url(),
  headline: z.string(),
  datePublished: z.string(),
  description: z.string().optional(),
});

/** Une entrée par titre daté et ancre réellement présents dans la page de l'éditeur. */
export function parseNewsChangelog(html: string, source: NewsMedia): NewsItem[] {
  const declared = new Map<string, z.infer<typeof declaredArticle>>();
  function visit(value: unknown, depth = 0): void {
    if (depth > 12) return;
    const article = declaredArticle.safeParse(value);
    if (article.success) {
      const url = newsArticleUrl(source, article.data.url);
      if (url?.hash) declared.set(url.hash.slice(1), article.data);
    }
    if (Array.isArray(value)) for (const child of value.slice(0, 1000)) visit(child, depth + 1);
    else if (value && typeof value === 'object') {
      const object = value as Record<string, unknown>;
      for (const key of ['@graph', 'itemListElement', 'item', 'mainEntity'])
        visit(object[key], depth + 1);
    }
  }
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (newsHtmlAttributes(script[1] ?? '')['type'] !== 'application/ld+json') continue;
    try {
      visit(JSON.parse(script[2] ?? '') as unknown);
    } catch {
      /* Les métadonnées invalides sont ignorées. */
    }
  }
  const sections: { start: number; end: number; title: string; date: string; anchor: string }[] =
    [];
  let year: string | undefined;
  for (const match of html.matchAll(/<h[234]\b([^>]*)>([\s\S]*?)<\/h[234]>/gi)) {
    const text = newsPlainText(match[2] ?? '');
    const declaredYear = /\b(20\d{2})\b/.exec(text)?.[1];
    if (declaredYear && text.length < 90) year = declaredYear;
    const anchor =
      newsHtmlAttributes(match[1] ?? '')['id'] ??
      /href=["']#([^"']+)["']/i.exec(match[2] ?? '')?.[1];
    const date =
      newsPublicationDate(text, year) ??
      (anchor
        ? (newsPublicationDate(anchor.replace(/-/g, ' '), year) ?? newsPublicationDate(anchor))
        : undefined);
    if (date && anchor && match.index >= 0)
      sections.push({
        start: match.index,
        end: match.index + match[0].length,
        title: text,
        date,
        anchor,
      });
  }
  const anchors = new Map(sections.map((section) => [section.anchor, section]));
  const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (match) =>
    ' '.repeat(match.length),
  );
  for (const match of visible.matchAll(/<[a-z][\w-]*\b([^>]*)>/gi)) {
    const anchor = newsHtmlAttributes(match[1] ?? '')['id'];
    if (!anchor || anchors.has(anchor)) continue;
    const metadata = declared.get(anchor);
    const date = metadata
      ? newsPublicationDate(metadata.datePublished)
      : (newsPublicationDate(anchor.replace(/-/g, ' ')) ?? newsPublicationDate(anchor));
    if (date)
      anchors.set(anchor, {
        start: match.index,
        end: match.index + match[0].length,
        title: metadata?.headline ?? `${source.name}, ${date}`,
        date,
        anchor,
      });
  }
  const ordered = [...anchors.values()].sort((left, right) => left.start - right.start);
  const latest = ordered
    .toSorted((left, right) => right.date.localeCompare(left.date))
    .slice(0, 20);
  return latest.flatMap((section) => {
    const index = ordered.indexOf(section);
    const base = new URL(source.fetchUrl ?? source.url);
    base.search = '';
    base.hash = section.anchor;
    const url = newsArticleUrl(source, base.href);
    if (!url) return [];
    const body = html
      .slice(section.end, ordered[index + 1]?.start ?? html.length)
      .replace(
        /<(?:script|style|nav|footer|aside)\b[^>]*>[\s\S]*?<\/(?:script|style|nav|footer|aside)>/gi,
        ' ',
      );
    const excerpt = newsPlainText(body).slice(0, 8000);
    if (!excerpt) return [];
    return [
      newsItemSchema.parse({
        id: newsArticleIdentity(source, url),
        project: source.name,
        repository: url.hostname,
        version: 'article',
        kind: 'article',
        url: url.href,
        publishedAt: section.date,
        category: 'development',
        prerelease: false,
        headline: `${source.name} : ${section.title}`.slice(0, 500),
        sourceExcerpt: excerpt,
      }),
    ];
  });
}
