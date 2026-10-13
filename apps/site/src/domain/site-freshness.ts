import type { Episode } from './schema.ts';

/** Date de la publication la plus récente visible sur le site. */
export function latestSitePublication(
  chartPublishedAt: string,
  episodes: readonly Pick<Episode, 'publishedAt'>[],
): string {
  return episodes.reduce(
    (latest, episode) =>
      Date.parse(episode.publishedAt) > Date.parse(latest) ? episode.publishedAt : latest,
    chartPublishedAt,
  );
}
