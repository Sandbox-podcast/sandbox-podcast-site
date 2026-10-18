import { z } from 'zod';
import { parseYouTubeDescription, selectYouTubeThumbnail } from './youtube.ts';

const playerSchema = z.object({
  playabilityStatus: z.object({ status: z.literal('OK') }),
  videoDetails: z.object({
    videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
    title: z.string().trim().min(1).max(500),
    author: z.string().trim().min(1).max(200),
    shortDescription: z.string().max(10_000).optional(),
    lengthSeconds: z.string().optional(),
    isLive: z.boolean().optional(),
    isUpcoming: z.boolean().optional(),
    thumbnail: z
      .object({
        thumbnails: z.array(
          z.object({ url: z.url(), width: z.number().int(), height: z.number().int() }),
        ),
      })
      .optional(),
  }),
  microformat: z
    .object({
      playerMicroformatRenderer: z
        .object({
          publishDate: z.string().optional(),
          liveBroadcastDetails: z.object({ isLiveNow: z.boolean().optional() }).optional(),
        })
        .optional(),
    })
    .optional(),
});

/** Lit uniquement l'objet JSON du lecteur, sans exécuter le JavaScript de YouTube. */
function readPlayerResponse(html: string): unknown {
  const assignment =
    /(?:\bytInitialPlayerResponse|window\["ytInitialPlayerResponse"\])\s*=\s*(?=\{)/.exec(html);
  if (!assignment) return undefined;
  const start = assignment.index + assignment[0].length;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < html.length; index++) {
    const character = html[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
    } else if (character === '"') quoted = true;
    else if (character === '{') depth++;
    else if (character === '}' && --depth === 0) {
      try {
        return JSON.parse(html.slice(start, index + 1)) as unknown;
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function publicationDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = z.iso.date().safeParse(value);
  if (date.success) return `${date.data}T00:00:00.000Z`;
  const timestamp = z.iso.datetime({ offset: true }).safeParse(value);
  return timestamp.success ? new Date(timestamp.data).toISOString() : undefined;
}

/** Les champs doivent appartenir à la vidéo demandée, jamais aux recommandations de la page. */
export function parseYouTubePage(html: string, videoId: string) {
  const parsed = playerSchema.safeParse(readPlayerResponse(html));
  if (!parsed.success || parsed.data.videoDetails.videoId !== videoId) return undefined;
  const video = parsed.data.videoDetails;
  const microformat = parsed.data.microformat?.playerMicroformatRenderer;
  // La durée d'un direct en cours n'est pas la durée définitive d'un replay.
  if (video.isLive || video.isUpcoming || microformat?.liveBroadcastDetails?.isLiveNow) {
    return undefined;
  }
  const seconds = /^\d+$/.test(video.lengthSeconds ?? '') ? Number(video.lengthSeconds) : 0;
  const durationSec = Number.isSafeInteger(seconds) && seconds > 0 ? seconds : undefined;
  const description = video.shortDescription ?? '';
  const details = parseYouTubeDescription(description);
  return {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: video.title,
    channel: video.author,
    thumbnailUrl: selectYouTubeThumbnail(
      Object.fromEntries(
        (video.thumbnail?.thumbnails ?? []).map((item, index) => [String(index), item]),
      ),
      videoId,
    ),
    description,
    summary: details.summary,
    publishedAt: publicationDate(microformat?.publishDate),
    durationSec,
    chapters: details.chapters.filter((chapter) => !durationSec || chapter.at < durationSec),
    resources: details.resources,
    spotifyUrl: details.spotifyUrl,
    appleUrl: details.appleUrl,
    source: 'youtube-page' as const,
  };
}
