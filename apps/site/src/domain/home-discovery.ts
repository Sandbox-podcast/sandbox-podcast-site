import type { Episode } from './schema';

export function latestVideoEpisode(episodes: readonly Episode[]): Episode | undefined {
  return episodes
    .filter((episode) => episode.status !== 'draft' && episode.platforms.youtubeId)
    .toSorted((a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.number - a.number)[0];
}

export function episodeYoutubeUrl(episode: Episode): string | undefined {
  return episode.platforms.youtubeId
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(episode.platforms.youtubeId)}`
    : episode.platforms.youtubeUrl;
}
