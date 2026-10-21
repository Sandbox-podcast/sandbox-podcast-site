import { timingSafeEqual } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { RequestBodyTooLargeError, readLimitedRequestText } from '@/lib/request-body';
import {
  readNewsTranslationBacklog,
  completeNewsTranslations,
  newsPublicEnabled,
} from '@/lib/news-store';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env['CRON_SECRET'];
  const received = request.headers.get('authorization') ?? '';
  const expected = secret ? `Bearer ${secret}` : '';
  return Boolean(
    secret &&
    secret.length >= 16 &&
    Buffer.byteLength(received) === Buffer.byteLength(expected) &&
    timingSafeEqual(Buffer.from(received), Buffer.from(expected)),
  );
}

export async function GET(request: Request): Promise<Response> {
  if (!newsPublicEnabled()) return Response.json({ error: 'News désactivé.' }, { status: 404 });
  if (!authorized(request)) return Response.json({ error: 'Accès refusé.' }, { status: 401 });
  try {
    const cursor = z
      .string()
      .min(1)
      .max(500)
      .optional()
      .safeParse(new URL(request.url).searchParams.get('after') ?? undefined);
    if (!cursor.success) return Response.json({ error: 'Curseur invalide.' }, { status: 400 });
    const result = await readNewsTranslationBacklog(cursor.data);
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error(
      'SANDBOX News known URLs unavailable:',
      error instanceof Error ? error.name : 'unknown',
    );
    return Response.json({ error: 'Liste SANDBOX News indisponible.' }, { status: 503 });
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!newsPublicEnabled()) return Response.json({ error: 'News désactivé.' }, { status: 404 });
  if (!authorized(request)) return Response.json({ error: 'Accès refusé.' }, { status: 401 });
  let value: unknown;
  try {
    value = JSON.parse(await readLimitedRequestText(request, 256_000)) as unknown;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError)
      return Response.json({ error: 'Lot SANDBOX News trop volumineux.' }, { status: 413 });
    return Response.json({ error: 'JSON SANDBOX News invalide.' }, { status: 400 });
  }
  try {
    const result = await completeNewsTranslations(value);
    for (const path of ['/news', '/en/news', '/es-es/news', '/de-de/news']) revalidatePath(path);

    return Response.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('SANDBOX News publish failed:', error instanceof Error ? error.name : 'unknown');
    return Response.json(
      { error: 'Publication SANDBOX News impossible. Vérifiez la migration 0016.' },
      { status: 503 },
    );
  }
}
