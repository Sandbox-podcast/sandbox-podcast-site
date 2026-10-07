import type { MetadataRoute } from 'next';
import { isMock } from '@/config/site';
import { absoluteUrl } from '@/lib/seo';
import { preparePublishedEditorialContent } from '@/lib/admin-persistence';
import {
  allCharts,
  allEntities,
  allEpisodes,
  allTopics,
  entityPath,
  publishedWeeks,
  weeksOf,
} from '@/lib/repository';

export const revalidate = 3600;

/** En mode démonstration, on ne déclare rien aux moteurs de recherche : les pages sont en noindex. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await preparePublishedEditorialContent();
  if (isMock) return [];
  const entry = (
    path: string,
    lastModified?: string,
    priority = 0.5,
  ): MetadataRoute.Sitemap[number] => ({
    url: absoluteUrl(path),
    ...(lastModified ? { lastModified } : {}),
    priority,
  });
  return [
    entry('/', undefined, 1),
    entry('/charts', undefined, 0.9),
    entry('/charts/history', undefined, 0.6),
    ...publishedWeeks().map((w) => entry(`/charts/history/${w}`, undefined, 0.3)),
    ...allCharts().flatMap((c) => {
      const last = weeksOf(c.slug).at(-1);
      return [
        entry(`/charts/${c.slug}`, undefined, 0.9),
        entry(`/charts/${c.slug}/methodology`, undefined, 0.6),
        ...weeksOf(c.slug)
          .filter((w) => w !== last)
          .map((w) => entry(`/charts/${c.slug}/${w}`, undefined, 0.3)),
      ];
    }),
    entry('/episodes', undefined, 0.8),
    ...allEpisodes().map((e) => entry(`/episodes/${String(e.number)}`, e.publishedAt, 0.8)),
    entry('/topics', undefined, 0.5),
    ...allTopics().map((t) => entry(`/topics/${t.slug}`, undefined, 0.4)),
    ...allEntities().map((e) => entry(entityPath(e), undefined, 0.6)),
    entry('/about', undefined, 0.4),
  ];
}
