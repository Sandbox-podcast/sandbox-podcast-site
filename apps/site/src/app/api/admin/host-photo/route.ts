import { NextResponse } from 'next/server';
import { originIsSameSite } from '@/lib/admin-auth';
import { adminCan, getAuthenticatedAdmin } from '@/lib/admin-auth-db';
import { MAX_HOST_PHOTO_UPLOAD_BYTES, prepareHostPhoto, saveHostPhoto } from '@/lib/host-photos';
import { readLimitedBody } from '@/lib/limited-body';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOO_LARGE = 'La photo doit faire au plus 8 Mo.';

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
  if (declaredSize > MAX_HOST_PHOTO_UPLOAD_BYTES) {
    return NextResponse.json({ error: TOO_LARGE }, { status: 413 });
  }
  let input: Buffer | undefined;
  try {
    input = await readLimitedBody(request.body, MAX_HOST_PHOTO_UPLOAD_BYTES);
  } catch {
    return NextResponse.json({ error: 'Lecture du fichier impossible.' }, { status: 400 });
  }
  if (!input) return NextResponse.json({ error: TOO_LARGE }, { status: 413 });
  let photo;
  try {
    photo = await prepareHostPhoto(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ce fichier image est illisible.';
    return NextResponse.json({ error: message }, { status: 422 });
  }
  try {
    const path = await saveHostPhoto(photo);
    return NextResponse.json(
      { path, size: photo.size },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'Enregistrement de la photo impossible.' }, { status: 503 });
  }
}
