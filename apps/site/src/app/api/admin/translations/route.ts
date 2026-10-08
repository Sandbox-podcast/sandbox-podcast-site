import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { originIsSameSite } from '@/lib/admin-auth';
import { adminCan, getAuthenticatedAdmin } from '@/lib/admin-auth-db';
import {
  currentTranslationSourcePack,
  importContentTranslations,
} from '@/lib/content-translations-store';
import { translatedBundleSchema } from '@/domain/content-translations';
import { dictionaryLoaders } from '@/i18n/dictionary-loaders';
import { publishedContentDictionary } from '@/lib/content-translations-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
  const user = await getAuthenticatedAdmin(request);
  if (!user || !adminCan(user, 'read'))
    return Response.json({ error: 'Connexion requise.' }, { status: 401 });
  try {
    const pack = await currentTranslationSourcePack();
    const locale = new URL(request.url).searchParams.get('locale');
    if (locale) {
      if (!dictionaryLoaders[locale])
        return Response.json({ error: 'Langue inconnue.' }, { status: 422 });
      const [versioned, published] = await Promise.all([
        dictionaryLoaders[locale](),
        publishedContentDictionary(locale),
      ]);
      return Response.json(
        { ...pack, locale, dictionary: { ...versioned, ...published } },
        {
          headers: {
            'Cache-Control': 'no-store',
            'Content-Disposition': 'attachment; filename="sandbox-translation-sources.json"',
          },
        },
      );
    }
    return Response.json(pack, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Disposition': 'attachment; filename="sandbox-translation-sources.json"',
      },
    });
  } catch {
    return Response.json(
      { error: 'Export indisponible. Vérifiez la base et ses migrations.' },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  if (!originIsSameSite(request))
    return Response.json({ error: 'Requête refusée.' }, { status: 403 });
  const user = await getAuthenticatedAdmin(request);
  if (!user) return Response.json({ error: 'Connexion requise.' }, { status: 401 });
  if (!adminCan(user, 'publish'))
    return Response.json({ error: 'Import réservé aux administrateurs.' }, { status: 403 });
  if (Number(request.headers.get('content-length') ?? '0') > 1_600_000)
    return Response.json({ error: 'Fichier trop volumineux (limite : 1,5 Mo).' }, { status: 413 });
  let value: unknown;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > 1_600_000)
      return Response.json(
        { error: 'Fichier trop volumineux (limite : 1,5 Mo).' },
        { status: 413 },
      );
    value = JSON.parse(raw) as unknown;
  } catch {
    return Response.json({ error: 'Fichier JSON illisible.' }, { status: 400 });
  }
  const parsed = translatedBundleSchema.safeParse(value);
  if (!parsed.success)
    return Response.json(
      { error: 'Format de traduction invalide.', issues: z.treeifyError(parsed.error) },
      { status: 422 },
    );
  try {
    const result = await importContentTranslations(parsed.data);
    revalidatePath('/', 'layout');
    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error && /source|répété|nombre|HTML/.test(error.message)
        ? error.message
        : 'Import impossible. Vérifiez la base et ses migrations.';
    return Response.json({ error: message }, { status: 422 });
  }
}
