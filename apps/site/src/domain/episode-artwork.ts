import type { Episode } from './schema';

/** La miniature de la vraie vidéo prend le relais du visuel de démonstration. */
export function episodeArtwork(episode: Pick<Episode, 'cover' | 'platforms'>): string | undefined {
  if (episode.platforms.thumbnailUrl) return episode.platforms.thumbnailUrl;
  if (episode.platforms.youtubeId) {
    return `https://i.ytimg.com/vi/${episode.platforms.youtubeId}/hqdefault.jpg`;
  }
  return episode.cover.artworkPath;
}
