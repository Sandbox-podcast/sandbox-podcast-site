import { pageMetadata } from './seo';
import { sharedPageAlternates } from '@/i18n/indexing';
import { newsPublicEnabled } from './news-store';
import { readNewsPageData } from './news-page-data';

const COPY = {
  'fr-FR': {
    title: 'Actualité IA pour les équipes tech : annonces et sources',
    description:
      'Suis les annonces en intelligence artificielle et en développement pour préparer tes prochains essais. Des synthèses automatiques, avec un lien vers chaque source.',
  },
  en: {
    title: 'AI news for tech teams: announcements and sources',
    description:
      'Follow AI and development announcements to plan your next experiments. Automated summaries with a link to every source.',
  },
  'es-ES': {
    title: 'Actualidad de IA para equipos de tecnología: anuncios y fuentes',
    description:
      'Sigue los anuncios sobre inteligencia artificial y desarrollo para preparar tus próximas pruebas. Resúmenes automáticos con un enlace a cada fuente.',
  },
  'de-DE': {
    title: 'KI-Nachrichten für Tech-Teams: Ankündigungen und Quellen',
    description:
      'Verfolge Ankündigungen zu KI und Softwareentwicklung für deine nächsten Tests. Automatische Zusammenfassungen mit einem Link zu jeder Quelle.',
  },
} as const;

export function newsPageMetadata(locale = 'fr-FR', indexable = newsPublicEnabled()) {
  const copy = Object.hasOwn(COPY, locale) ? COPY[locale as keyof typeof COPY] : COPY['fr-FR'];
  return pageMetadata({
    ...copy,
    path: locale === 'fr-FR' ? '/news' : `/${locale.toLowerCase()}/news`,
    locale,
    keywords: [
      'actualité IA',
      'actualités intelligence artificielle',
      'AI news',
      'noticias IA',
      'KI-Nachrichten',
      'modèles IA',
      'open source',
    ],
    noindex: !indexable,
    localizedAlternates: indexable ? sharedPageAlternates('/news') : [],
  });
}

export async function publicNewsPageMetadata(locale = 'fr-FR') {
  const data = await readNewsPageData();
  return newsPageMetadata(locale, data.status === 'published' && data.feed.items.length > 0);
}
