import type { NewsMedia } from './news-media.ts';

export function newsArticleUrl(source: NewsMedia, value: string): URL | undefined {
  let url: URL;
  try {
    url = new URL(value, source.fetchUrl ?? source.url);
  } catch {
    return undefined;
  }
  const origins = [new URL(source.url).origin, ...(source.articleOrigins ?? [])];
  if (source.fetchUrl) origins.push(new URL(source.fetchUrl).origin);
  if (
    url.protocol !== 'https:' ||
    url.port ||
    url.username ||
    url.password ||
    !origins.includes(url.origin)
  )
    return undefined;
  const paths = source.articlePaths ?? [source.path];
  if (!paths.some((path) => url.pathname.startsWith(path))) return undefined;
  url.search = '';
  if (source.mode === 'changelog') {
    if (
      url.pathname !== new URL(source.fetchUrl ?? source.url).pathname ||
      !/^#[\p{L}\p{N}_.:%,/-]{1,180}$/u.test(url.hash)
    )
      return undefined;
  } else {
    url.hash = '';
    const pathname = url.pathname.replace(/\/$/, '');
    if (!pathname) return undefined;
    if (
      [source.url, source.fetchUrl].some(
        (index) => index && new URL(index).pathname.replace(/\/$/, '') === pathname,
      )
    )
      return undefined;
    if (
      /\/(?:tags?|category|categories|authors?|page|privacy|terms|about|contact|subscribe|subscription|register|sign-in|login|search|feed|rss|atom|sitemap|community)(?:\/|$)/i.test(
        url.pathname,
      )
    )
      return undefined;
  }
  return url;
}

export function newsArticleIdentity(source: NewsMedia, url: URL): string {
  return `${source.id}:${url.pathname}${source.mode === 'changelog' ? url.hash : ''}`;
}

export function newsSourceMatches(source: NewsMedia, id: string, value: string): boolean {
  const url = newsArticleUrl(source, value);
  return !!url && url.href === value && newsArticleIdentity(source, url) === id;
}
