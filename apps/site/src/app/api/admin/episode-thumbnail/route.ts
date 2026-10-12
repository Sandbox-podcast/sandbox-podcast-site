import { NextResponse } from 'next/server';
import { originIsSameSite } from '@/lib/admin-auth';
import { adminCan, getAuthenticatedAdmin } from '@/lib/admin-auth-db';
import {
  MAX_THUMBNAIL_UPLOAD_BYTES,
  prepareEpisodeThumbnail,
  saveEpisodeThumbnail,
} from '@/lib/episode-thumbnails';
import { readLimitedBody } from '@/lib/limited-body';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<NextResponse> {
  if (!originIsSameSite(request)) {
    return NextResponse.json({ error: 'Requête refusée.' }, { status: 403 });
  }
  const user = await getAuthenticatedAdmin(request);
  if (!user) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  if (!adminCan(user, 'draft')) {
    return NextResponse.json({ error: 'Droits insuffisants.' }, { status: 403 });
  }
  const contentType = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (!contentType || !['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
    return NextResponse.json(
      { error: 'Choisissez un fichier JPEG, PNG ou WebP.' },
      { status: 415 },
    );
  }
  const declaredSize = Number(request.headers.get('content-length') ?? '0');
  if (declaredSize > MAX_THUMBNAIL_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'La miniature doit faire au plus 5 Mo.' }, { status: 413 });
  }
  try {
    const input = await readLimitedBody(request.body, MAX_THUMBNAIL_UPLOAD_BYTES);
    if (!input) {
      return NextResponse.json({ error: 'La miniature doit faire au plus 5 Mo.' }, { status: 413 });
    }
    const thumbnail = await prepareEpisodeThumbnail(input);
    const path = await saveEpisodeThumbnail(thumbnail);
    return NextResponse.json(
      { path, width: thumbnail.width, height: thumbnail.height },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('La miniature')) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof Error && error.message.startsWith('Choisissez')) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof Error && error.message === 'Ce fichier image est illisible.') {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    return NextResponse.json(
      { error: 'Enregistrement de la miniature impossible.' },
      { status: 503 },
    );
  }
}
