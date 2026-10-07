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
import { loadContent } from '@/lib/load';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAdminRequest(request))
    return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 });
  try {
    const result = await getAdminContent();
    const snapshots = loadContent().snapshots;
    const chartEntries = Object.fromEntries(
      result.content.charts.map((chart) => {
        const latest = snapshots[chart.slug]?.at(-1);
        return [
          chart.slug,
          {
            week: latest?.week ?? null,
            entities: latest?.entries.map((entry) => entry.entity) ?? [],
          },
        ];
      }),
    );
    return NextResponse.json(
      { ...result, chartEntries, storageMode: adminStorageMode() },
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
  const declaredSize = Number(request.headers.get('content-length') ?? '0');
  if (declaredSize > 1_600_000) {
    return NextResponse.json({ error: 'Le contenu dépasse la limite de 1,5 Mo.' }, { status: 413 });
  }
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 });
  }
  if (Buffer.byteLength(raw, 'utf8') > 1_600_000) {
    return NextResponse.json({ error: 'Le contenu dépasse la limite de 1,5 Mo.' }, { status: 413 });
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
