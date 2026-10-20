import type { SiteSettings } from './schema.ts';

const marketingFields = [
  'tagline',
  'strapline',
  'description',
  'heroEyebrow',
  'heroTitle',
  'heroDek',
  'aboutEyebrow',
  'aboutTitle',
  'aboutIntro',
] as const;
type MarketingField = (typeof marketingFields)[number];

/** Valeurs exactes attestées dans Git et les publications locale/publique du 20 octobre (DD-0068). */
const previousCopy: Record<MarketingField, readonly string[]> = {
  tagline: ['La tech mérite mieux que du bruit.'],
  strapline: [
    "Le Talk Show qui teste les outils d'IA, débat de leurs usages et remet les annonces en perspective.",
    'Le Talk Show qui teste, débat et remet les chiffres en perspective.',
  ],
  description: [
    "L'actualité de l'IA et de la tech, expliquée dans un podcast vidéo : tests d'outils IA, débats et classements avec leurs sources.",
    "Sandbox, le Talk Show sur l'IA et la tech. Retrouvez les épisodes, leurs sources et les classements commentés.",
    'Explorez les podcasts vidéo Sandbox sur l’IA, le développement et l’open source. Retrouvez les sources de chaque épisode et nos classements tech hebdomadaires.',
  ],
  heroEyebrow: [
    'Actualité IA · outils · développement · open source',
    'Talk Show indépendant · IA · développement · open source',
    'Podcast indépendant · IA · développement · open source',
  ],
  heroTitle: [
    "L'actualité de l'IA, testée et mise en perspective.",
    'Un Talk Show pour y voir plus clair.',
    'Un podcast pour y voir plus clair.',
  ],
  heroDek: [
    "Chaque semaine, nous testons des outils d'IA, confrontons nos expériences et vérifions ce que les annonces changent vraiment. Retrouve les épisodes, leurs sources et nos classements commentés.",
    'Chaque semaine, nos épisodes vidéo explorent les outils, les modèles et les idées qui changent le travail. Retrouvez aussi les sources citées et les classements commentés.',
  ],
  aboutEyebrow: ['L’équipe'],
  aboutTitle: ["L'équipe Sandbox.", 'Retrouvez-nous.'],
  aboutIntro: [
    'Lou, Nicolas et Loïc animent Sandbox. Retrouve leurs profils et leurs projets.',
    "Lou, Nicolas et Loïc. Les liens de l'équipe Sandbox, réunis ici.",
    'Lou, Nicolas et Loïc. Les liens de l’équipe Sandbox, réunis ici.',
  ],
};

/** Compatibilité de lecture seulement : les textes personnalisés et le stockage restent intacts. */
export function resolvePublishedSiteSettings(
  published: SiteSettings,
  current: SiteSettings,
): SiteSettings {
  const resolved = { ...published };
  for (const field of marketingFields) {
    if (previousCopy[field].includes(published[field])) resolved[field] = current[field];
  }
  return resolved;
}
