import type { Episode } from './schema';

/** Le fichier choisi dans l'admin prime sur YouTube, qui prime sur le visuel de démonstration. */
export function episodeArtwork(episode: Pick<Episode, 'cover' | 'platforms'>): string | undefined {
  if (episode.cover.uploadedArtworkPath) return episode.cover.uploadedArtworkPath;
  const thumbnailUrl = episode.platforms.thumbnailUrl;
  if (thumbnailUrl) {
    const lowResolution =
      /^https:\/\/i\.ytimg\.com\/vi\/([A-Za-z0-9_-]{11})\/(?:default|mqdefault|hqdefault|sddefault)\.jpg$/i.exec(
        thumbnailUrl,
      );
    return lowResolution ? `/api/youtube-thumbnail/${lowResolution[1]}` : thumbnailUrl;
  }
  if (episode.platforms.youtubeId) {
    return `/api/youtube-thumbnail/${episode.platforms.youtubeId}`;
  }
  return episode.cover.artworkPath;
}
