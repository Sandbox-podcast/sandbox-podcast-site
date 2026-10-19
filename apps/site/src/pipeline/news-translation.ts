import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { NewsItem } from '../domain/news-preview.ts';
import {
  prepareNewsTranslation,
  restoreNewsTranslation,
  newsTranslationKeepsNumbers,
} from '../domain/news-translation-terms.ts';
import {
  applyNewsEditorial,
  newsEditorialForItem,
  NEWS_EDITORIAL,
  newsEditorialSourceHash,
  type NewsEditorialRecord,
} from './news-editorial.ts';
import {
  NEWS_EDITORIAL_TRANSLATIONS,
  type EditorialTranslation,
  type LocalizedEditorial,
  type NewsLocale,
} from './news-translations.ts';

const locales: readonly NewsLocale[] = ['en', 'es-ES', 'de-DE'];
const applicationRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const localDirectory = join(applicationRoot, '.local');
const workerPath = join(applicationRoot, 'scripts', 'news-argos-translate.py');
const packageDirectory = join(localDirectory, 'news-translator-models');
export function newsTranslatorPython(platform: NodeJS.Platform = process.platform): string {
  return join(
    localDirectory,
    'news-translator-venv',
    platform === 'win32' ? 'Scripts' : 'bin',
    platform === 'win32' ? 'python.exe' : 'python',
  );
}
const translationResponseSchema = z.object({
  translations: z.array(z.string().trim().min(1).max(600)).max(400),
});

export type NewsTranslationBatch = (
  texts: readonly string[],
  targetLocale: NewsLocale,
) => Promise<readonly string[]>;

export function newsEditorialTranslationsComplete(
  items: readonly NewsItem[],
  editorial: Record<string, NewsEditorialRecord> = NEWS_EDITORIAL,
): boolean {
  return items.every((item) => {
    if (item.kind !== 'article') return true;
    const record = newsEditorialForItem(item, editorial);
    if (!record) return true;
    return locales.every(
      (locale) => !!item.titles?.[locale] && item.synopses?.[locale]?.length === 3,
    );
  });
}

function validateTranslatedText(
  source: string,
  translated: string,
  locale: NewsLocale,
  maxLength: number,
): string {
  const text = translated.trim();
  let containsControl = false;
  for (const character of text) {
    if (character.charCodeAt(0) < 0x20) {
      containsControl = true;
      break;
    }
  }
  if (!text || text.length > maxLength || /[<>\uFFFD]/u.test(text) || containsControl)
    throw new Error(`Traduction News invalide en ${locale}.`);
  if (text === source.trim()) throw new Error(`Traduction News inchangée en ${locale}.`);
  if (!newsTranslationKeepsNumbers(source, text))
    throw new Error(`Valeur numérique News perdue en ${locale}.`);
  return text;
}

function editorialTranslation(
  source: NewsEditorialRecord,
  texts: readonly string[],
  locale: NewsLocale,
): EditorialTranslation {
  if (texts.length !== 4) throw new Error(`Traduction News incomplète en ${locale}.`);
  const [title, ...sentences] = texts;
  if (title === undefined || sentences.length !== 3)
    throw new Error(`Traduction News incomplète en ${locale}.`);
  const translatedTitle = validateTranslatedText(source.title, title, locale, 200);
  const translatedSentences = sentences.map((sentence, index) => {
    const sourceSentence = source.sentences[index];
    if (!sourceSentence) throw new Error(`Phrase source absente en ${locale}.`);
    const translatedSentence = validateTranslatedText(sourceSentence, sentence, locale, 600);
    if (
      [...new Intl.Segmenter(locale, { granularity: 'sentence' }).segment(translatedSentence)]
        .length !== 1
    )
      throw new Error(`La synthèse News doit rester en trois phrases en ${locale}.`);
    return translatedSentence;
  });
  return { title: translatedTitle, sentences: translatedSentences as [string, string, string] };
}

function argosPython(): string {
  const override = process.env['SANDBOX_NEWS_ARGOS_PYTHON'];
  return override ?? newsTranslatorPython();
}

function translatorWorkerEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { NODE_ENV: process.env.NODE_ENV };
  for (const key of ['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL', 'NODE_ENV']) {
    const value = process.env[key];
    if (value) environment[key] = value;
  }
  return {
    ...environment,
    ARGOS_DEVICE_TYPE: 'cpu',
    ARGOS_CHUNK_TYPE: 'MINISBD',
    ARGOS_PACKAGES_DIR: packageDirectory,
    SANDBOX_NEWS_SBD_DIR: join(localDirectory, 'news-translator-sbd'),
    XDG_DATA_HOME: join(localDirectory, 'argos-runtime', 'data'),
    XDG_CONFIG_HOME: join(localDirectory, 'argos-runtime', 'config'),
    XDG_CACHE_HOME: join(localDirectory, 'argos-runtime', 'cache'),
  };
}

function runArgosBatch(
  texts: readonly string[],
  targetLocale: NewsLocale,
  signal?: AbortSignal,
): Promise<readonly string[]> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Le budget du lot News est épuisé.'));
      return;
    }
    const child = spawn(/* turbopackIgnore: true */ argosPython(), [workerPath], {
      cwd: applicationRoot,
      env: translatorWorkerEnvironment(),
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let outputSize = 0;
    let errorSize = 0;
    let settled = false;
    const finish = (error?: Error, value?: readonly string[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      if (error) reject(error);
      else resolve(value ?? []);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish(new Error('La traduction locale News a dépassé deux minutes.'));
    }, 120_000);
    const abort = () => {
      child.kill();
      finish(new Error('Le budget du lot News est épuisé.'));
    };
    signal?.addEventListener('abort', abort, { once: true });
    child.stdout.on('data', (chunk: Buffer) => {
      outputSize += chunk.length;
      if (outputSize > 500_000) {
        child.kill();
        finish(new Error('Réponse Argos trop volumineuse.'));
        return;
      }
      stdout.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      errorSize += chunk.length;
      if (errorSize <= 8_000) stderr.push(chunk);
    });
    child.once('error', (error) => {
      finish(new Error(`Argos Translate est indisponible : ${error.message}`));
    });
    child.once('close', (code) => {
      if (settled) return;
      if (code !== 0) {
        const detail = Buffer.concat(stderr).toString('utf8').trim();
        finish(
          new Error(
            detail ||
              'Argos Translate est absent ou ses modèles français vers anglais, espagnol et allemand ne sont pas installés.',
          ),
        );
        return;
      }
      try {
        const parsed = translationResponseSchema.parse(
          JSON.parse(Buffer.concat(stdout).toString('utf8')) as unknown,
        );
        if (parsed.translations.length !== texts.length)
          throw new Error('Argos n’a pas renvoyé toutes les phrases.');
        finish(
          undefined,
          parsed.translations.map((text, index) =>
            restoreNewsTranslation(texts[index] ?? '', text, targetLocale),
          ),
        );
      } catch (error) {
        finish(error instanceof Error ? error : new Error('Réponse Argos invalide.'));
      }
    });
    child.stdin.end(
      JSON.stringify({
        sourceLocale: 'fr-FR',
        targetLocale,
        texts: texts.map(prepareNewsTranslation),
      }),
    );
  });
}

/** Traduit une entrée éditoriale française si elle ne possède pas encore les trois langues. */
export async function translateNewsEditorialItems(
  items: readonly NewsItem[],
  translate?: NewsTranslationBatch,
  editorial: Record<string, NewsEditorialRecord> = NEWS_EDITORIAL,
  knownTranslations: Partial<Record<string, LocalizedEditorial>> = NEWS_EDITORIAL_TRANSLATIONS,
  signal?: AbortSignal,
): Promise<NewsItem[]> {
  const translateBatch = translate ?? ((texts, locale) => runArgosBatch(texts, locale, signal));
  const prepared = items.map((item) => applyNewsEditorial(item, editorial, knownTranslations));
  const pendingByLocale = new Map<NewsLocale, { index: number; source: NewsEditorialRecord }[]>();

  for (const [index, item] of prepared.entries()) {
    if (item.kind !== 'article') continue;
    const source = newsEditorialForItem(item, editorial);
    if (!source) continue;
    for (const locale of locales) {
      if (item.titles?.[locale] && item.synopses?.[locale]?.length === 3) continue;
      pendingByLocale.set(locale, [...(pendingByLocale.get(locale) ?? []), { index, source }]);
    }
  }

  for (const [locale, pending] of pendingByLocale) {
    signal?.throwIfAborted();
    const input = pending.flatMap(({ source }) => [source.title, ...source.sentences]);
    const output = await translateBatch(input, locale);
    if (output.length !== input.length)
      throw new Error(`Le moteur n’a pas traduit tous les textes News en ${locale}.`);
    const generated = new Map<number, EditorialTranslation>();
    for (const [position, entry] of pending.entries()) {
      const texts = output.slice(position * 4, position * 4 + 4);
      generated.set(entry.index, editorialTranslation(entry.source, texts, locale));
    }
    for (const [index, translation] of generated) {
      const item = prepared[index];
      if (!item) throw new Error('Entrée News absente après traduction.');
      const source = newsEditorialForItem(item, editorial);
      if (!source) throw new Error('Texte source News absent après traduction.');
      prepared[index] = {
        ...item,
        titles: { ...item.titles, [locale]: translation.title },
        synopses: { ...item.synopses, [locale]: translation.sentences },
        editorialSourceHash: newsEditorialSourceHash(source),
      };
    }
  }

  return prepared;
}
