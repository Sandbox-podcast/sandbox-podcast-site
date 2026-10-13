// Généré par scripts/localization-catalog.mjs.
import type { TranslationDictionary } from './translation';
export const dictionaryLoaders: Record<string, () => Promise<TranslationDictionary>> = {
  en: () => import('./dictionaries/en.json').then((module) => module.default),
  'es-ES': () => import('./dictionaries/es-es.json').then((module) => module.default),
  'de-DE': () => import('./dictionaries/de-de.json').then((module) => module.default),
};
