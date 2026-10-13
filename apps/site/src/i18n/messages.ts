export interface SiteMessages {
  skipToContent: string;
  homeLabel: string;
  navigationLabel: string;
  podcasts: string;
  rankings: string;
  about: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchSubmit: string;
  switchLanguage: string;
  podcastsDescription: string;
  rankingsDescription: string;
  updated: string;
  allEpisodes: string;
  history: string;
  topics: string;
  search: string;
  rss: string;
  rank: string;
  name: string;
  score: string;
  movement: string;
  source: string;
  methodology: string;
  chapters: string;
  availableLanguages: string;
}

export type SiteMessageLocale = 'en' | 'fr';

const MESSAGES: Record<'en' | 'fr', SiteMessages> = {
  en: {
    skipToContent: 'Skip to content',
    homeLabel: 'Sandbox home',
    navigationLabel: 'Main navigation',
    podcasts: 'Podcasts',
    rankings: 'AI rankings',
    about: 'About',
    searchLabel: 'Search podcasts and AI rankings',
    searchPlaceholder: 'Search',
    searchSubmit: 'Run search',
    switchLanguage: 'Français',
    podcastsDescription: 'Episodes, resources and the latest AI rankings.',
    rankingsDescription: 'Explore the latest measured AI rankings.',
    updated: 'Last updated:',
    allEpisodes: 'All episodes',
    history: 'Weekly history',
    topics: 'Topics',
    search: 'Search',
    rss: 'RSS feed',
    rank: 'Rank',
    name: 'Name',
    score: 'Score',
    movement: 'Movement',
    source: 'Source',
    methodology: 'Methodology and limits',
    chapters: 'Chapters',
    availableLanguages: 'Also available in',
  },
  fr: {
    skipToContent: 'Aller au contenu',
    homeLabel: 'Accueil Sandbox',
    navigationLabel: 'Navigation principale',
    podcasts: 'Podcasts',
    rankings: 'Classements IA',
    about: 'À propos',
    searchLabel: 'Rechercher dans les podcasts et les classements',
    searchPlaceholder: 'Rechercher',
    searchSubmit: 'Lancer la recherche',
    switchLanguage: 'English',
    podcastsDescription: 'Les épisodes, leurs ressources et les classements IA.',
    rankingsDescription: 'Explorez les derniers classements IA mesurés.',
    updated: 'Dernière mise à jour :',
    allEpisodes: 'Tous les épisodes',
    history: 'Historique hebdomadaire',
    topics: 'Les thèmes',
    search: 'Rechercher',
    rss: 'Flux RSS',
    rank: 'Rang',
    name: 'Nom',
    score: 'Score',
    movement: 'Mouvement',
    source: 'Source',
    methodology: 'Méthode et limites',
    chapters: 'Chapitres',
    availableLanguages: 'Aussi disponible en',
  },
};

export function siteMessageLocale(locale: string): SiteMessageLocale {
  return locale.startsWith('fr') ? 'fr' : 'en';
}

export function siteMessages(locale: string): SiteMessages {
  return MESSAGES[siteMessageLocale(locale)];
}

/** L'espagnol et l'allemand restent hors indexation tant que leur interface n'est pas relue. */
export function isLocaleUiReviewed(locale: string): boolean {
  return locale === 'fr-FR' || locale === 'en';
}
