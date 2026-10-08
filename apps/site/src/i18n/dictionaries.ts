import { cache } from 'react';
import { dictionaryLoaders } from './dictionary-loaders';
import { DEFAULT_SITE_LOCALE } from './locales';
import type { TranslationDictionary } from './translation';
import { publishedContentDictionary } from '../lib/content-translations-store';

export const siteDictionary = cache(async (locale: string): Promise<TranslationDictionary> => {
  if (locale === DEFAULT_SITE_LOCALE) return {};
  const [versioned, published] = await Promise.all([
    dictionaryLoaders[locale]?.() ?? {},
    publishedContentDictionary(locale),
  ]);
  return { ...versioned, ...published };
});
