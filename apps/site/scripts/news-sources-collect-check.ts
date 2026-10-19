import { readFile, writeFile } from 'node:fs/promises';
import { NEWS_MEDIA, type NewsMedia } from '../src/domain/news-media.ts';
import { collectMediaNewsPreview } from '../src/pipeline/news-media-preview.ts';
import { createHash } from 'node:crypto';
import { readLimitedBody } from '../src/lib/limited-body.ts';

const folder = new URL('../../../.local/news-sources-2026-10-19/', import.meta.url);
const report = JSON.parse(await readFile(new URL('http-report.json', folder), 'utf8')) as {
  id: string;
  url: string;
  status?: number;
}[];
const listings = new Map(
  NEWS_MEDIA.map((definition) => {
    const source: NewsMedia = definition;
    return [source.fetchUrl ?? source.url, source] as const;
  }),
);
const pages: { url: string; status: number; file: string }[] = [];
const transport: typeof fetch = async (input, options) => {
  const url = input instanceof Request ? input.url : input.toString();
  const source = listings.get(url);
  if (source && source.id !== 'gemini-api') {
    const observed = report.find((row) => row.id === source.id);
    if (observed?.status === 200)
      return new Response(await readFile(new URL(`${source.id}.html`, folder)));
    if (observed?.status) return new Response(null, { status: observed.status });
  }
  const file = `article-${createHash('sha256').update(url).digest('hex')}.html`;
  try {
    const content = await readFile(new URL(file, folder));
    pages.push({ url, status: 200, file });
    return new Response(content);
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  const response = await fetch(input, options);
  if (response.status !== 200) {
    pages.push({ url, status: response.status, file });
    return response;
  }
  const body = await readLimitedBody(response.body, 6_000_000);
  if (body) await writeFile(new URL(file, folder), body);
  pages.push({ url, status: response.status, file });
  return new Response(body ? new Uint8Array(body) : null, {
    status: response.status,
    headers: response.headers,
  });
};
const feed = await collectMediaNewsPreview({ checkedAt: null, sources: [], items: [] }, transport);
await writeFile(new URL('collection.json', folder), JSON.stringify(feed, null, 2));
await writeFile(new URL('article-pages.json', folder), JSON.stringify(pages, null, 2));
console.log(
  JSON.stringify({
    sources: feed.sources.filter((source) => source.ok).length,
    partial: feed.sources.filter((source) => !source.ok && source.reason === 'Lecture partielle')
      .length,
    articles: feed.items.length,
    failures: feed.sources.filter((source) => !source.ok),
  }),
);
