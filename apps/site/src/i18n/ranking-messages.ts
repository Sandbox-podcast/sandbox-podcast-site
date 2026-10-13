import { siteLocaleSchema } from './locales.ts';
/** Textes d'interface des classements dans les quatre langues du site. */
const MESSAGE_KEYS = [
  'hubTitle',
  'hubDescription',
  'hubIntroduction',
  'openRanking',
  'emptyHub',
  'rankings',
  'week',
  'rankedEntries',
  'publishedEditions',
  'updated',
  'availableLanguages',
  'rank',
  'name',
  'score',
  'movement',
  'source',
  'profile',
  'limitations',
  'evidence',
  'methodology',
  'newEntry',
  'sourceRepository',
  'sourcePublisher',
  'sourceIndependentTest',
  'sourceBenchmark',
  'sourceEditorial',
] as const;

type RankingMessageKey = (typeof MESSAGE_KEYS)[number];
type RankingMessageValues = Record<RankingMessageKey, string>;

// Rows use a visible separator so translations stay compact while their field order is testable.
const TRANSLATIONS = {
  fr: 'Classements IA¦Des classements IA datés et sourcés, calculés selon des méthodes publiées.¦Explorez des classements datés avec leurs candidats, leurs sources et leurs méthodes publiées.¦Ouvrir le classement →¦Aucune édition localisée n’est encore prête. Les classements relus apparaîtront après publication de leurs données.¦Classements IA¦Semaine¦{{count}} entrées classées¦{{count}} éditions publiées¦Mis à jour :¦Aussi disponible en¦Rang¦Nom¦Score¦Mouvement¦Source¦Profil¦Limites¦Preuves ({{count}})¦Méthode et limites¦NOUVEAU¦Dépôt¦Éditeur¦Test indépendant¦Benchmark¦Éditorial',
  en: 'AI rankings¦Dated, sourced AI rankings built with published methods.¦Explore dated rankings with their candidates, sources and published methods.¦Open ranking →¦No localized ranking edition is ready yet. Reviewed collections will appear after their data is published.¦AI rankings¦Week¦{{count}} ranked entries¦{{count}} published editions¦Updated:¦Also available in¦Rank¦Name¦Score¦Movement¦Source¦Profile¦Limitations¦Evidence ({{count}})¦Methodology and limitations¦NEW¦Repository¦Publisher¦Independent test¦Benchmark¦Editorial',
  es: 'Rankings de IA¦Rankings de IA fechados, con fuentes y métodos publicados.¦Explora rankings fechados con sus candidatos, fuentes y métodos publicados.¦Abrir ranking →¦Aún no hay una edición localizada lista. Los rankings revisados aparecerán cuando se publiquen sus datos.¦Rankings de IA¦Semana¦{{count}} elementos clasificados¦{{count}} ediciones publicadas¦Actualizado:¦También disponible en¦Puesto¦Nombre¦Puntuación¦Cambio¦Fuente¦Perfil¦Limitaciones¦Pruebas ({{count}})¦Metodología y limitaciones¦NUEVO¦Repositorio¦Editor¦Prueba independiente¦Benchmark¦Selección editorial',
  de: 'KI-Ranglisten¦Datierte KI-Ranglisten mit Quellen und veröffentlichten Methoden.¦Entdecken Sie datierte Ranglisten mit Kandidaten, Quellen und veröffentlichten Methoden.¦Rangliste öffnen →¦Eine lokalisierte Ausgabe ist noch nicht verfügbar. Geprüfte Ranglisten erscheinen nach Veröffentlichung ihrer Daten.¦KI-Ranglisten¦Woche¦{{count}} gelistete Einträge¦{{count}} veröffentlichte Ausgaben¦Aktualisiert:¦Auch verfügbar auf¦Rang¦Name¦Punktzahl¦Veränderung¦Quelle¦Profil¦Einschränkungen¦Belege ({{count}})¦Methode und Einschränkungen¦NEU¦Repository¦Herausgeber¦Unabhängiger Test¦Benchmark¦Redaktionelle Auswahl',
} as const;

type TranslationKey = keyof typeof TRANSLATIONS;
const translationEntries = Object.entries(TRANSLATIONS).map(([key, row]) => {
  const values = row.split('¦');
  if (values.length !== MESSAGE_KEYS.length) {
    throw new Error(`La traduction de classement « ${key} » contient ${values.length} champs.`);
  }
  return [
    key,
    Object.fromEntries(MESSAGE_KEYS.map((messageKey, index) => [messageKey, values[index]])),
  ];
});
const parsedTranslations = Object.fromEntries(translationEntries) as Record<
  TranslationKey,
  RankingMessageValues
>;

export interface RankingMessages extends RankingMessageValues {
  /** Locale du texte renvoyé ; différente de la locale demandée en cas de repli. */
  sourceLocale: string;
}

const SOURCE_LOCALES: Record<TranslationKey, string> = {
  fr: 'fr-FR',
  en: 'en',
  es: 'es-ES',
  de: 'de-DE',
};

export const RANKING_UI_TRANSLATION_LOCALES = Object.values(SOURCE_LOCALES);

export function rankingMessages(locale: string): RankingMessages {
  const supported = siteLocaleSchema.parse(locale);
  const key: TranslationKey =
    supported === 'fr-FR'
      ? 'fr'
      : supported === 'es-ES'
        ? 'es'
        : supported === 'de-DE'
          ? 'de'
          : 'en';
  return { ...parsedTranslations[key], sourceLocale: SOURCE_LOCALES[key] };
}

export function hasRankingUiTranslation(locale: string): boolean {
  return siteLocaleSchema.safeParse(locale).success;
}
export function formatRankingCount(template: string, count: number, locale: string): string {
  const number = new Intl.NumberFormat(locale).format(count);
  if (template.startsWith('{{count}} ')) {
    return `${template.slice('{{count}}'.length).trim()}: ${number}`;
  }
  return template.replace('{{count}}', number);
}
