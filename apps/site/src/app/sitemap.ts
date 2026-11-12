import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';
import { preparePublicEditorialContent } from '@/lib/admin-persistence';
import { allEpisodes } from '@/lib/repository';
import { indexableEpisode } from '@/domain/episode-seo';
import { uniqueSitemapEntries } from '@/domain/site-sitemap';
import { personalProjects } from '@/lib/personal-projects';
import { personalProjectPath } from '@/domain/personal-projects';
import { sharedPageAlternates } from '@/i18n/indexing';
import { hreflangAlternates } from '@/domain/ranking-catalog';

export const dynamic = 'force-dynamic';

/** Site réduit : accueil, replays, projets, à propos et confidentialité. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await preparePublicEditorialContent();
  const entry = (
    path: string,
    lastModified?: string,
    priority = 0.5,
  ): MetadataRoute.Sitemap[number] => ({
    url: absoluteUrl(path),
    ...(lastModified ? { lastModified } : {}),
    priority,
  });
  const episodes = allEpisodes().filter(indexableEpisode);
  const entries = uniqueSitemapEntries([
    entry('/', undefined, 1),
    ...(episodes.length
      ? [
          entry(
            '/podcast',
            episodes
              .map((episode) => episode.publishedAt)
              .toSorted()
              .at(-1),
            0.8,
          ),
        ]
      : []),
    ...episodes.map((e) => entry(`/episodes/${String(e.number)}`, e.publishedAt, 0.8)),
    entry('/about', undefined, 0.4),
    entry('/confidentialite', '2026-10-16T00:00:00.000Z', 0.3),
    entry('/nos-projets', undefined, 0.7),
    ...personalProjects.map((project) =>
      entry(personalProjectPath(project.slug), project.verifiedAt, 0.6),
    ),
  ]);
  return uniqueSitemapEntries(
    entries.flatMap((item) => {
      const path = new URL(item.url).pathname;
      const variants = sharedPageAlternates(path);
      if (!variants.length) return [item];
      const languages = hreflangAlternates(variants, absoluteUrl('/'));
      return variants.map((alternate) => ({
        ...item,
        url: absoluteUrl(alternate.path),
        alternates: { languages },
      }));
    }),
  );
}
