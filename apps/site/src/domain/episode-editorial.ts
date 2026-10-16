import type { Episode } from './schema.ts';

const pilotTitle =
  'Sandbox #1 (pilote)  Mistral Large 4, Claude Haiku 5.5, Gemini at Work, Sillage et les harnais IA';
const pilotDek =
  "Premier épisode (pilote) de Sandbox, le podcast qui teste, débat et remet les chiffres en perspective. Lou, Nicolas et Loïc passent en revue l'actualité IA et tech de la semaine, présentent un outil fait maison et racontent leurs expérimentations en cours.";

/** Corrige la copie historique connue ; une nouvelle rédaction dans l'admin reste prioritaire. */
export function episodeEditorialPresentation(episode: Episode): Episode {
  if (episode.platforms.youtubeId !== 'GgSiPkADCz4') return episode;
  return {
    ...episode,
    title:
      episode.title.trim().replace(/\s+/g, ' ') === pilotTitle.replace(/\s+/g, ' ')
        ? 'Codex, Claude Code, OpenCode : le modèle ne suffit pas'
        : episode.title,
    dek:
      episode.dek === pilotDek || episode.dek === pilotDek.replace('le podcast', 'le Talk Show')
        ? 'Que change le harnais autour du modèle ? Lou, Nicolas et Loïc présentent Sillage à 25:50, puis confrontent les approches de Codex, Claude Code et OpenCode à 37:17, avec leurs essais et leurs limites.'
        : episode.dek,
  };
}
