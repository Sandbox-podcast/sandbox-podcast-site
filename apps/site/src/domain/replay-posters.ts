import { episodeArtwork } from './episode-artwork';
import type { Episode } from './schema';

/** Affiches dérivées des miniatures officielles, associées à la vidéo, jamais au numéro seul. */
const posters: Readonly<Record<string, string>> = {
  GgSiPkADCz4: '/images/home/replays/episode-001-vintage-v1.webp',
  '7KVqydbGow0': '/images/home/replays/episode-002-vintage-v1.webp',
};

/** Décors d'affiches sans texte, réservés à la salle cinéma et titrés en HTML. */
const cinemaPosters: Readonly<Record<string, string>> = {
  GgSiPkADCz4: '/images/home/replays/episode-001-cinema-v2.webp',
  '7KVqydbGow0': '/images/home/replays/episode-002-cinema-v2.webp',
};

export function cinemaPosterArtwork(videoId?: string): string | undefined {
  return videoId ? cinemaPosters[videoId] : undefined;
}

/** Visuel connu dont la partie haute ne contient que la marque et les portraits. */
export function replayPortraitArtwork(videoId?: string): string | undefined {
  return videoId ? posters[videoId] : undefined;
}

/** Titres courts de vignette, séparés du titre éditorial complet affiché à côté. */
export function replayPosterCaption(videoId?: string): string | undefined {
  if (videoId === 'GgSiPkADCz4') return 'Le modèle ne suffit pas';
  if (videoId === '7KVqydbGow0') return 'L’IA dans votre métier';
  return undefined;
}

export function replayPosterArtwork(episode: Pick<Episode, 'cover' | 'platforms'>) {
  return replayPortraitArtwork(episode.platforms.youtubeId) ?? episodeArtwork(episode);
}
