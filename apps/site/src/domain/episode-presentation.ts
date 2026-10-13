import type { Episode } from './schema.ts';
import { parseYouTubeDescription } from './youtube.ts';

/** Les horodatages éditoriaux priment ; le Markdown publié sert de repli. */
export function episodeChapters(episode: Episode): Episode['chapters'] {
  return episode.chapters.length > 0
    ? episode.chapters
    : parseYouTubeDescription(episode.description).chapters;
}

/** Ne présente pas une durée contredite par les horodatages publiés. */
export function verifiedEpisodeDuration(episode: Episode): number | undefined {
  const observed = [...episode.chapters, ...parseYouTubeDescription(episode.description).chapters];
  return observed.some((chapter) => chapter.at >= episode.durationSec)
    ? undefined
    : episode.durationSec;
}

/** Segments horodatés pour les moments clés du balisage vidéo. */
export function episodeVideoClips(
  chapters: Episode['chapters'],
  durationSec: number | undefined,
  pageUrl: string,
) {
  const ordered = chapters
    .filter((chapter) => chapter.at >= 0 && (durationSec === undefined || chapter.at < durationSec))
    .toSorted((left, right) => left.at - right.at)
    .filter((chapter, index, sorted) => index === 0 || chapter.at !== sorted[index - 1]?.at);
  return ordered.flatMap((chapter, index) => {
    const endOffset = ordered[index + 1]?.at ?? durationSec;
    if (endOffset === undefined || endOffset <= chapter.at) return [];
    return [
      {
        '@type': 'Clip',
        name: chapter.title,
        startOffset: chapter.at,
        endOffset,
        url: `${pageUrl}?t=${String(chapter.at)}#episode-video`,
      },
    ];
  });
}

/** Seul un instant valide peut charger directement le lecteur depuis un lien de chapitre. */
export function episodeStartOffset(raw: unknown, durationSec?: number): number | undefined {
  if (typeof raw !== 'string' || !/^\d{1,6}$/.test(raw)) return undefined;
  const seconds = Number(raw);
  return seconds < (durationSec ?? 86_400) ? seconds : undefined;
}
