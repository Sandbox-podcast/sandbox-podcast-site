import { pageMetadata } from './seo';
import { sharedPageAlternates } from '@/i18n/indexing';
import { newsPublicEnabled } from './news-store';

const COPY = {
  'fr-FR': {
    title: 'Actualité IA : recherche, outils, entreprises et usages',
    description:
      "L'actualité de l'intelligence artificielle : recherche, outils, entreprises et usages. Des synthèses générées à partir des médias cités, avec un lien direct vers chaque source.",
  },
  en: {
    title: 'AI news: research, tools, companies and real-world uses',
    description:
      'Follow AI research, tools, companies and real-world uses through automatically generated summaries, translated into four languages and linked to their original publishers.',
  },
  'es-ES': {
    title: 'Noticias sobre IA: investigación, herramientas, empresas y usos',
    description:
      'Sigue la actualidad de la inteligencia artificial, la investigación, las herramientas, las empresas y sus usos con resúmenes automáticos y enlaces directos a las fuentes originales.',
  },
  'de-DE': {
    title: 'KI-Nachrichten: Forschung, Tools, Unternehmen und Anwendungen',
    description:
      'Verfolge KI-Forschung, Tools, Unternehmen und Anwendungen mit automatisch erstellten Zusammenfassungen und direkten Links zu den Originalquellen.',
  },
} as const;

export function newsPageMetadata(locale = 'fr-FR') {
  const copy = Object.hasOwn(COPY, locale) ? COPY[locale as keyof typeof COPY] : COPY['fr-FR'];
  const indexable = newsPublicEnabled();
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
