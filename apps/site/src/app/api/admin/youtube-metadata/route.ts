import { readLimitedRequestText, RequestBodyTooLargeError } from '@/lib/request-body';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  parseYouTubeDescription,
  parseYouTubeDuration,
  parseYouTubeVideoId,
  selectYouTubeThumbnail,
} from '@/domain/youtube';
import { originIsSameSite } from '@/lib/admin-auth';
import { adminCan, getAuthenticatedAdmin } from '@/lib/admin-auth-db';
import { fetchYouTubePageMetadata } from '@/lib/youtube-page';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = z.object({ url: z.url().max(2048) });
const oEmbedSchema = z.object({
  title: z.string().trim().min(1).max(500),
  author_name: z.string().trim().min(1).max(200),
  thumbnail_url: z.url().refine((value) => {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'i.ytimg.com';
  }),
});
const videoListSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      snippet: z.object({
        title: z.string().trim().min(1).max(500),
        description: z.string().max(10_000),
        channelTitle: z.string().trim().min(1).max(200),
        publishedAt: z.iso.datetime(),
        thumbnails: z
          .record(
            z.string(),
            z.object({ url: z.url(), width: z.number().int(), height: z.number().int() }),
          )
          .optional(),
      }),
      contentDetails: z.object({ duration: z.string() }),
    }),
  ),
});

async function fullMetadata(videoId: string, apiKey: string) {
  const endpoint = new URL('https://www.googleapis.com/youtube/v3/videos');
  endpoint.searchParams.set('part', 'snippet,contentDetails');
  endpoint.searchParams.set('id', videoId);
  endpoint.searchParams.set('key', apiKey);
  const response = await fetch(endpoint, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('YouTube Data API indisponible.');
  const parsed = videoListSchema.parse(await response.json());
  const video = parsed.items.find((item) => item.id === videoId);
  if (!video) throw new Error('La vidéo est introuvable ou privée.');
  const details = parseYouTubeDescription(video.snippet.description);
  const durationSec = parseYouTubeDuration(video.contentDetails.duration);
  return {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: video.snippet.title,
    channel: video.snippet.channelTitle,
    thumbnailUrl: selectYouTubeThumbnail(video.snippet.thumbnails, videoId),
    description: video.snippet.description,
    summary: details.summary,
    publishedAt: video.snippet.publishedAt,
    durationSec,
    chapters: details.chapters.filter((chapter) => !durationSec || chapter.at < durationSec),
    resources: details.resources,
    spotifyUrl: details.spotifyUrl,
    appleUrl: details.appleUrl,
    source: 'youtube-data-api' as const,
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!originIsSameSite(request)) {
    return NextResponse.json({ error: 'Requête refusée.' }, { status: 403 });
  }
  const user = await getAuthenticatedAdmin(request);
  if (!user || !adminCan(user, 'draft')) {
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  }

  const declaredSize = Number(request.headers.get('content-length') ?? '0');
  if (declaredSize > 4096) {
    return NextResponse.json({ error: 'Adresse trop longue.' }, { status: 413 });
  }
  let raw: unknown;
  try {
    const text = await readLimitedRequestText(request, 4096);
    if (Buffer.byteLength(text, 'utf8') > 4096) {
      return NextResponse.json({ error: 'Adresse trop longue.' }, { status: 413 });
    }
    raw = JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError)
      return NextResponse.json({ error: 'Requête trop volumineuse.' }, { status: 413 });

    return NextResponse.json({ error: 'Adresse YouTube illisible.' }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Saisissez une adresse YouTube valide.' }, { status: 422 });
  }
  const videoId = parseYouTubeVideoId(parsed.data.url);
  if (!videoId) {
    return NextResponse.json(
      { error: 'Cette adresse ne correspond pas à une vidéo YouTube.' },
      { status: 422 },
    );
  }

  const canonicalUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;
  try {
    const apiKey = process.env['YOUTUBE_API_KEY']?.trim();
    if (apiKey) {
      // Une clé expirée ou un quota épuisé ne doit pas bloquer la lecture publique.
      const full = await fullMetadata(videoId, apiKey).catch(() => undefined);
      if (full?.publishedAt && full.durationSec) {
        return NextResponse.json(full, { headers: { 'Cache-Control': 'no-store' } });
      }
    }
    const pageMetadata = await fetchYouTubePageMetadata(videoId).catch(() => undefined);
    if (pageMetadata) {
      return NextResponse.json(pageMetadata, { headers: { 'Cache-Control': 'no-store' } });
    }
    const response = await fetch(oEmbedUrl, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: 'YouTube ne fournit pas les informations de cette vidéo.' },
        { status: 422 },
      );
    }
    const metadata = oEmbedSchema.safeParse(await response.json());
    if (!metadata.success) {
      return NextResponse.json(
        { error: 'Les informations reçues de YouTube sont incomplètes.' },
        { status: 502 },
      );
    }
    return NextResponse.json(
      {
        videoId,
        url: canonicalUrl,
        title: metadata.data.title,
        channel: metadata.data.author_name,
        thumbnailUrl: metadata.data.thumbnail_url,
        source: 'oembed',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === 'La vidéo est introuvable ou privée.'
            ? error.message
            : 'Les informations YouTube sont momentanément indisponibles.',
      },
      { status: 502 },
    );
  }
}
