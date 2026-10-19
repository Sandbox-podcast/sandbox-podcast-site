import { episodeSchema, type Episode } from './schema.ts';
import { mergeDescriptionResources } from './episode-resources.ts';
import { parseYouTubeDescription } from './youtube.ts';

export interface YouTubeEpisodeMetadata {
  videoId: string;
  title: string;
  channel?: string | undefined;
  thumbnailUrl?: string | undefined;
  publishedAt?: string | undefined;
  durationSec?: number | undefined;
  source: 'youtube-data-api' | 'youtube-page' | 'oembed';
}

/** Construit un épisode à partir de la vidéo et du texte réellement fourni par l'équipe. */
export function createEpisodeFromYouTube(input: {
  number: number;
  metadata: YouTubeEpisodeMetadata;
  description: string;
  hosts: string[];
  status: 'draft' | 'published';
  addedAt?: string;
}): Episode {
  const { metadata } = input;
  const durationSec = metadata.durationSec;
  const description = input.description.trim();
  if (input.hosts.length === 0) {
    throw new Error('Aucun animateur n’est associé à votre compte.');
  }
  const details = parseYouTubeDescription(description);
  const videoUrl = `https://www.youtube.com/watch?v=${metadata.videoId}`;

  return episodeSchema.parse({
    number: input.number,
    title: metadata.title,
    dek: details.summary || metadata.title,
    publishedAt: metadata.publishedAt ?? input.addedAt ?? new Date().toISOString(),
    durationSec: durationSec && durationSec >= 60 ? durationSec : undefined,
    description,
    hosts: input.hosts,
    chapters: details.chapters.filter((chapter) => !durationSec || chapter.at < durationSec),
    mentions: mergeDescriptionResources([], description, metadata.videoId).filter((resource) => {
      const host = new URL(resource.url ?? '').hostname;
      return host !== 'open.spotify.com' && host !== 'podcasts.apple.com';
    }),
    sources: [],
    platforms: {
      youtubeId: metadata.videoId,
      youtubeUrl: videoUrl,
      youtubeChannel: metadata.channel,
      thumbnailUrl: metadata.thumbnailUrl,
      spotifyUrl: details.spotifyUrl,
      appleUrl: details.appleUrl,
    },
    featured: false,
    status: input.status,
    cover: { tone: input.number % 7, kicker: `Épisode ${String(input.number)}` },
  });
}
