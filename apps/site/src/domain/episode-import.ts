import { episodeSchema, type Episode } from './schema.ts';
import { parseYouTubeDescription, parseYouTubeVideoId } from './youtube.ts';

export interface YouTubeEpisodeMetadata {
  videoId: string;
  title: string;
  channel: string;
  thumbnailUrl: string;
  publishedAt?: string | undefined;
  durationSec?: number | undefined;
  source: 'youtube-data-api' | 'oembed';
}

/** Construit un épisode à partir de la vidéo et du texte réellement fourni par l'équipe. */
export function createEpisodeFromYouTube(input: {
  number: number;
  metadata: YouTubeEpisodeMetadata;
  description: string;
  hosts: string[];
  status: 'draft' | 'published';
}): Episode {
  const { metadata } = input;
  const durationSec = metadata.durationSec;
  if (metadata.source !== 'youtube-data-api') {
    throw new Error(
      'La date et la durée doivent venir de YouTube. Configurez YOUTUBE_API_KEY sur le serveur.',
    );
  }
  if (!metadata.publishedAt || !durationSec) {
    throw new Error('YouTube n’a pas fourni la date ou la durée de cette vidéo.');
  }
  if (durationSec < 60) {
    throw new Error('La vidéo doit durer au moins une minute.');
  }
  const description = input.description.trim();
  if (!description) {
    throw new Error('Collez la description de l’épisode avec ses sources.');
  }
  if (input.hosts.length === 0) {
    throw new Error('Aucun animateur n’est associé à votre compte.');
  }
  const details = parseYouTubeDescription(description);
  const videoUrl = `https://www.youtube.com/watch?v=${metadata.videoId}`;

  return episodeSchema.parse({
    number: input.number,
    title: metadata.title,
    dek: details.summary || metadata.title,
    publishedAt: metadata.publishedAt,
    durationSec,
    description,
    hosts: input.hosts,
    chapters: details.chapters.filter((chapter) => chapter.at < durationSec),
    mentions: details.resources.filter(
      (resource) => parseYouTubeVideoId(resource.url) !== metadata.videoId,
    ),
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
