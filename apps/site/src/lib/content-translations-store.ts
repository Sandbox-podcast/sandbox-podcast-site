import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/client.ts';
import { siteTranslationMessages } from '../db/schema.ts';
import { adminStorageMode, getPublishedAdminContent } from './admin-persistence.ts';
import { isNextProductionBuild } from './next-build.ts';
import { readChartsEditorial } from './charts-editorial.ts';
import {
  chartEditionTranslationSources,
  editorialTranslationSources,
  translationSourcePack,
  validateTranslatedBundle,
  translationHash,
  type TranslatedBundle,
} from '../domain/content-translations.ts';
import type { TranslationDictionary } from '../i18n/translation.ts';
import catalog from '../i18n/dictionaries/source-catalog.json' with { type: 'json' };

const recordSchema = z.object({
  locale: z.string(),
  sourceHash: z.string(),
  source: z.string(),
  translation: z.string().min(1),
});
type StoredTranslation = z.infer<typeof recordSchema>;
const localPath = join(process.cwd(), '.local', 'translations', 'published.json');
let localWrite: Promise<void> = Promise.resolve();
const dictionaryCache = new Map<string, { loadedAt: number; dictionary: TranslationDictionary }>();

export async function currentTranslationSourcePack() {
  const sources = editorialTranslationSources(await getPublishedAdminContent());
  if (adminStorageMode() === 'postgres') {
    for (const item of await readChartsEditorial())
      sources.push(
        ...chartEditionTranslationSources(
          item.payload,
          `edition.${item.chart}.${item.payload.week}`,
        ),
      );
  }
  // Les sources du contenu publié remplacent les anciens textes de contenu du catalogue de Git.
  for (const [source, entry] of Object.entries(catalog)) {
    const codeSources = entry.sources.filter((path) => !path.startsWith('content/'));
    if (codeSources.length) sources.push({ source, context: codeSources.join(', ') });
  }
  return translationSourcePack(sources);
}

async function localTranslations(): Promise<StoredTranslation[]> {
  try {
    return z.array(recordSchema).parse(JSON.parse(await readFile(localPath, 'utf8')) as unknown);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
}

function records(bundle: TranslatedBundle): StoredTranslation[] {
  return bundle.translations.map((item) => ({
    locale: bundle.locale,
    sourceHash: item.sourceHash,
    source: item.source,
    translation: item.text,
  }));
}

export async function importContentTranslations(
  value: unknown,
): Promise<{ locale: string; imported: number }> {
  const mode = adminStorageMode();
  if (mode === 'unavailable') throw new Error('La base Postgres n’est pas configurée.');
  const bundle = validateTranslatedBundle(await currentTranslationSourcePack(), value);
  const incoming = records(bundle);
  if (mode === 'postgres') {
    await getDb().transaction(async (tx) => {
      for (let offset = 0; offset < incoming.length; offset += 300) {
        // Mise à jour conditionnée par la même identité de source, jamais par la position dans un tableau.
        const rows = incoming.slice(offset, offset + 300);
        await tx
          .insert(siteTranslationMessages)
          .values(rows)
          .onConflictDoUpdate({
            target: [siteTranslationMessages.locale, siteTranslationMessages.sourceHash],
            set: {
              source: sql`excluded.source`,
              translation: sql`excluded.translation`,
              updatedAt: new Date().toISOString(),
            },
          });
      }
    });
  } else {
    const save = localWrite
      .catch(() => undefined)
      .then(async () => {
        const existing = await localTranslations();
        const merged = new Map(existing.map((item) => [`${item.locale}:${item.sourceHash}`, item]));
        for (const row of incoming) merged.set(`${row.locale}:${row.sourceHash}`, row);
        await mkdir(join(process.cwd(), '.local', 'translations'), { recursive: true });
        const temporary = `${localPath}.${randomUUID()}.tmp`;
        await writeFile(temporary, `${JSON.stringify([...merged.values()], null, 2)}\n`, 'utf8');
        await rename(temporary, localPath);
      });
    localWrite = save;
    await save;
  }
  dictionaryCache.delete(bundle.locale);
  return { locale: bundle.locale, imported: incoming.length };
}

function missingTable(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof current !== 'object' || current === null) return false;
    const candidate = current as { code?: unknown; cause?: unknown };
    if (candidate.code === '42P01') return true;
    current = candidate.cause;
  }
  return false;
}

/** Ajoute les imports du harnais au dictionnaire versionné, sans génération lors du rendu. */
export async function publishedContentDictionary(locale: string): Promise<TranslationDictionary> {
  if (isNextProductionBuild() || adminStorageMode() === 'unavailable') return {};
  const cached = dictionaryCache.get(locale);
  if (cached && Date.now() - cached.loadedAt < 5_000) return cached.dictionary;
  let rows: StoredTranslation[];
  if (adminStorageMode() === 'postgres') {
    try {
      rows = z
        .array(recordSchema)
        .parse(
          await getDb()
            .select()
            .from(siteTranslationMessages)
            .where(eq(siteTranslationMessages.locale, locale)),
        );
    } catch (error) {
      if (missingTable(error)) return {};
      throw error;
    }
  } else rows = (await localTranslations()).filter((item) => item.locale === locale);
  const dictionary = Object.fromEntries(
    rows
      .filter((row) => row.sourceHash === translationHash(row.source))
      .map((row) => [row.source, row.translation]),
  );
  dictionaryCache.set(locale, { loadedAt: Date.now(), dictionary });
  return dictionary;
}
