import { cache } from 'react';
import { dictionaryLoaders } from './dictionary-loaders';
import { DEFAULT_SITE_LOCALE, siteLocaleSchema } from './locales';
import type { TranslationDictionary } from './translation';
import { publishedContentDictionary } from '../lib/content-translations-store';

const publishedDictionaries = new Map<string, TranslationDictionary>();
const retryAt = new Map<string, number>();

async function publicContentDictionary(locale: string): Promise<TranslationDictionary> {
  if (Date.now() < (retryAt.get(locale) ?? 0)) return publishedDictionaries.get(locale) ?? {};
  try {
    const dictionary = await publishedContentDictionary(locale);
    publishedDictionaries.set(locale, dictionary);
    retryAt.delete(locale);
    return dictionary;
  } catch (error) {
    retryAt.set(locale, Date.now() + 5_000);
    console.error(
      'Public translations unavailable:',
      error instanceof Error ? error.name : 'unknown',
    );
    return publishedDictionaries.get(locale) ?? {};
  }
}

export const siteDictionary = cache(async (locale: string): Promise<TranslationDictionary> => {
  siteLocaleSchema.parse(locale);
  if (locale === DEFAULT_SITE_LOCALE) return {};
  const [versioned, published] = await Promise.all([
    dictionaryLoaders[locale]?.() ?? {},
    publicContentDictionary(locale),
  ]);
  return { ...versioned, ...published };
});
