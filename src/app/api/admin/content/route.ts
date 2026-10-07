import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminWriteSchema } from '@/domain/admin-content';
import { isAdminRequest, originIsSameSite } from '@/lib/admin-auth';
import {
  ContentConflictError,
  adminStorageMode,
  getAdminContent,
  saveAdminContent,
} from '@/lib/admin-persistence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAdminRequest(request))
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  try {
    const result = await getAdminContent();
    return NextResponse.json(
      { ...result, storageMode: adminStorageMode() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { error: 'Le contenu du backoffice est momentanément indisponible.' },
      { status: 503 },
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!originIsSameSite(request))
    return NextResponse.json({ error: 'Requête refusée.' }, { status: 403 });
  if (!isAdminRequest(request))
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 });
  }
  const parsed = adminWriteSchema.safeParse(body);
  if (!parsed.success) {
    const issues = z.treeifyError(parsed.error);
    return NextResponse.json(
      { error: 'Le contenu ne respecte pas son schéma.', issues },
      { status: 422 },
    );
  }
  try {
    const saved = await saveAdminContent(
      parsed.data.content,
      parsed.data.action,
      parsed.data.expectedDraftEtag,
    );
    if (parsed.data.action === 'publish') {
      revalidatePath('/', 'layout');
      revalidatePath('/feed.xml');
      revalidatePath('/sitemap.xml');
    }
    return NextResponse.json({ ...saved, published: parsed.data.action === 'publish' });
  } catch (error) {
    if (error instanceof ContentConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Le contenu ne respecte pas son schéma.', details: error.issues },
        { status: 422 },
      );
    }
    if (error instanceof Error && !error.message.includes('fetch failed')) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    return NextResponse.json({ error: 'Le stockage du contenu a échoué.' }, { status: 503 });
  }
}
