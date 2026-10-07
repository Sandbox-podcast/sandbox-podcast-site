import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseYouTubeVideoId } from '@/domain/youtube';
import { adminCan, getAuthenticatedAdmin, originIsSameSite } from '@/lib/admin-auth';

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
    const text = await request.text();
    if (Buffer.byteLength(text, 'utf8') > 4096) {
      return NextResponse.json({ error: 'Adresse trop longue.' }, { status: 413 });
    }
    raw = JSON.parse(text) as unknown;
  } catch {
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
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { error: 'Les informations YouTube sont momentanément indisponibles.' },
      { status: 502 },
    );
  }
}
