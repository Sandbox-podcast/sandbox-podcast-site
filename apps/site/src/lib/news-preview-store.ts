import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { newsFeedSchema, type NewsFeed } from '../domain/news-preview.ts';
import { NEWS_MEDIA } from '../domain/news-media.ts';
import { collectMediaNewsPreview } from '../pipeline/news-media-preview.ts';
import { applyNewsEditorial } from '../pipeline/news-editorial.ts';
import {
  newsEditorialTranslationsComplete,
  translateNewsEditorialItems,
} from '../pipeline/news-translation.ts';

export function newsPreviewEnabled(): boolean {
  return process.env.NODE_ENV === 'development' && process.env['SANDBOX_NEWS_PREVIEW'] === '1';
}
const path = () => join(process.cwd(), '.local', 'news-preview', 'feed.json');
export async function readNewsPreview(): Promise<NewsFeed> {
  try {
    const feed = newsFeedSchema.parse(JSON.parse(await readFile(path(), 'utf8')) as unknown);
    return { ...feed, items: feed.items.map((item) => applyNewsEditorial(item)) };
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return { checkedAt: null, sources: [], items: [] };
    throw error;
  }
}
let refreshing: Promise<NewsFeed> | undefined;
export async function refreshNewsPreview(): Promise<NewsFeed> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const previous = await readNewsPreview();
    if (
      previous.checkedAt &&
      previous.sources.length === NEWS_MEDIA.length &&
      newsEditorialTranslationsComplete(previous.items) &&
      Date.now() - Date.parse(previous.checkedAt) < 60_000
    )
      return previous;
    const collected = await collectMediaNewsPreview(previous);
    const feed = {
      ...collected,
      items: await translateNewsEditorialItems(collected.items),
    };
    await mkdir(join(process.cwd(), '.local', 'news-preview'), { recursive: true });
    const temporary = `${path()}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(feed), 'utf8');
    await rename(temporary, path());
    return feed;
  })();
  try {
    return await refreshing;
  } finally {
    refreshing = undefined;
  }
}
