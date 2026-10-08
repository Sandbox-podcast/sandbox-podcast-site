import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { argv } from 'node:process';
import { z } from 'zod';
import { editableContentSchema } from '../src/domain/admin-content.ts';
import {
  editorialTranslationSources,
  missingTranslationSources,
  translationSourcePack,
  translationSourcePackSchema,
  validateTranslatedBundle,
  bundleDictionary,
  TRANSLATION_LOCALES,
  type TranslationSourcePack,
} from '../src/domain/content-translations.ts';
import { loadContent } from '../src/lib/load.ts';

const action = argv[2];
const option = (name: string): string | undefined => {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : undefined;
};
const root = process.cwd();
const dictionaryDirectory = join(root, 'src', 'i18n', 'dictionaries');
const workDirectory = join(root, '.local', 'translations');
const dictionarySchema = z.record(z.string(), z.string());
async function json(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

async function sourcePack(): Promise<{
  pack: TranslationSourcePack;
  importedDictionary: Record<string, string>;
  importedLocale?: string;
}> {
  const sourceFile = option('source');
  if (sourceFile) {
    const value = await json(resolve(sourceFile));
    const exported = z
      .object({ dictionary: dictionarySchema.optional(), locale: z.string().optional() })
      .parse(value);
    return {
      pack: translationSourcePackSchema.parse(value),
      importedDictionary: exported.dictionary ?? {},
      ...(exported.locale ? { importedLocale: exported.locale } : {}),
    };
  }
  // Les snapshots chargés avec le site ne font pas partie du contenu éditorial exportable.
  let content = editableContentSchema.strip().parse(loadContent());
  try {
    const local = z
      .object({ published: editableContentSchema.optional() })
      .parse(await json(join(root, '.site-content.local.json')));
    content = local.published ?? content;
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  const sources = editorialTranslationSources(content);
  const catalog = z
    .record(z.string(), z.object({ sources: z.array(z.string()) }))
    .parse(await json(join(dictionaryDirectory, 'source-catalog.json')));
  for (const [source, item] of Object.entries(catalog)) {
    const codeSources = item.sources.filter((path) => !path.startsWith('content/'));
    if (codeSources.length) sources.push({ source, context: codeSources.join(', ') });
  }
  return { pack: translationSourcePack(sources), importedDictionary: {} };
}

if (!['prepare', 'validate', 'import'].includes(action ?? ''))
  throw new Error(
    'Commande attendue : prepare, validate ou import. Voir docs/site/prompt-traductions-harnais.md.',
  );
const { pack, importedDictionary, importedLocale } = await sourcePack();
if (action === 'prepare') {
  const locale = option('locale');
  const targets = !locale || locale === 'all' ? TRANSLATION_LOCALES : [locale];
  const limit = Number(option('limit') ?? '80');
  if (!Number.isInteger(limit) || limit < 1 || limit > 500)
    throw new Error('La taille du lot doit être comprise entre 1 et 500.');
  await mkdir(workDirectory, { recursive: true });
  for (const target of targets) {
    if (!TRANSLATION_LOCALES.includes(target))
      throw new Error(`Langue non prise en charge : ${target}`);
    const dictionary = dictionarySchema.parse(
      await json(join(dictionaryDirectory, `${target.toLowerCase()}.json`)),
    );
    const missing = missingTranslationSources(pack, {
      ...dictionary,
      ...(importedLocale === target ? importedDictionary : {}),
    });
    const path = join(workDirectory, `${target.toLowerCase()}-work.json`);
    await writeFile(
      path,
      `${JSON.stringify({ version: 1, locale: target, translations: missing.slice(0, limit).map((item) => ({ ...item, text: '' })) }, null, 2)}\n`,
      'utf8',
    );
    console.log(
      `${target} : ${String(missing.length)} textes manquants, ${String(Math.min(limit, missing.length))} dans ${path}`,
    );
  }
} else {
  const file = option('file');
  if (!file) throw new Error('Indiquer --file avec le JSON produit par le harnais.');
  const bundle = validateTranslatedBundle(pack, await json(resolve(file)));
  if (action === 'import') {
    const path = join(dictionaryDirectory, `${bundle.locale.toLowerCase()}.json`);
    const existing = dictionarySchema.parse(await json(path));
    await writeFile(
      path,
      `${JSON.stringify({ ...existing, ...bundleDictionary(bundle) }, null, 2)}\n`,
      'utf8',
    );
  }
  console.log(
    `${bundle.locale} : ${String(bundle.translations.length)} traductions ${action === 'import' ? 'ajoutées au fichier local' : 'validées'}.`,
  );
}
