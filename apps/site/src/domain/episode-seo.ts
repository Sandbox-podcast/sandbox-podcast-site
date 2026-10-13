import type { Episode } from './schema.ts';

/** L'index ne reçoit que des épisodes publiés, avec vidéo et contenu éditorial substantiel. */
export function indexableEpisode(episode: Episode): boolean {
  return (
    episode.status === 'published' &&
    Boolean(episode.platforms.youtubeId) &&
    episode.description.trim().length >= 100 &&
    episode.dek.trim().length >= 50
  );
}
