import { cache } from 'react';
import { newsPreviewEnabled, readNewsPreview } from './news-preview-store';
import { newsPublicEnabled, readPublishedNews } from './news-store';
import type { NewsFeed } from '@/domain/news-preview';

type NewsPageData =
  { status: 'disabled' | 'unavailable' } | { status: 'preview' | 'published'; feed: NewsFeed };

/** Partage un même relevé entre le rendu et ses métadonnées pendant la requête. */
export const readNewsPageData = cache(async (): Promise<NewsPageData> => {
  if (newsPreviewEnabled()) return { status: 'preview', feed: await readNewsPreview() };
  if (!newsPublicEnabled()) return { status: 'disabled' };
  try {
    return { status: 'published', feed: await readPublishedNews() };
  } catch (error) {
    console.error('SANDBOX News unavailable:', error instanceof Error ? error.name : 'unknown');
    return { status: 'unavailable' };
  }
});

/** Le drapeau de collecte seul ne suffit pas à annoncer une rubrique publique. */
export async function newsPageAvailable(): Promise<boolean> {
  const data = await readNewsPageData();
  return data.status === 'preview' || (data.status === 'published' && data.feed.items.length > 0);
}
