import type { Metadata } from 'next';
import { isMock, siteConfig } from '@/config/site';
import { hreflangAlternates, type HreflangPage } from '@/domain/ranking-catalog';

export const absoluteUrl = (path: string): string => new URL(path, siteConfig.url).toString();

/** Format attendu par Open Graph : `language_TERRITORY`, sans sous-tag de script. */
export function openGraphLocaleForTag(locale: string): string {
  const parsed = new Intl.Locale(locale);
  return parsed.region ? `${parsed.language}_${parsed.region}` : parsed.language;
}

export function robotsMetadata(noindex = false): NonNullable<Metadata['robots']> {
  const directives = {
    index: !noindex,
    follow: true,
    'max-image-preview': 'large' as const,
    'max-video-preview': -1,
  };
  return { ...directives, googleBot: { ...directives } };
}

interface PageMeta {
  title: string;
  description: string;
  /** Chemin canonique, commençant par « / ». */
  path: string;
  /** Locale BCP 47 de la page pour Open Graph. */
  locale?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
  keywords?: string[];
  /** Variantes localisées indexables de cette même page. */
  localizedAlternates?: readonly HreflangPage[];
  /** La route a son propre `opengraph-image` : on n'impose pas l'image du site. */
  ownImage?: boolean;
}

/**
 * Métadonnées d'une page : titre, description, URL canonique, OpenGraph et cartes X/LinkedIn/Discord/Slack.
 * L'image OpenGraph vient du fichier `opengraph-image.tsx` le plus proche de la route.
 * En mode démonstration, aucune page n'est indexable : on ne publie pas de fausses données dans Google.
 */
export function pageMetadata(meta: PageMeta): Metadata {
  const blocked = isMock || meta.noindex === true;
  const openGraphLocale = meta.locale ? openGraphLocaleForTag(meta.locale) : siteConfig.locale;
  const languages =
    !blocked && meta.localizedAlternates
      ? hreflangAlternates(meta.localizedAlternates, siteConfig.url)
      : undefined;
  return {
    title: meta.title,
    description: meta.description,
    ...(meta.keywords ? { keywords: meta.keywords } : {}),
    alternates: {
      canonical: meta.path,
      ...(languages && Object.keys(languages).length > 0 ? { languages } : {}),
    },
    robots: robotsMetadata(blocked),
    openGraph: {
      type: meta.type ?? 'website',
      title: meta.title,
      description: meta.description,
      url: meta.path,
      siteName: siteConfig.name,
      locale: openGraphLocale,
      // Définir `openGraph` remplace celui du parent : sans image explicite, la page perdrait l'image du site.
      ...(meta.ownImage ? {} : { images: [{ url: '/opengraph-image', width: 1200, height: 630 }] }),
      ...(meta.publishedTime ? { publishedTime: meta.publishedTime } : {}),
      ...(meta.modifiedTime ? { modifiedTime: meta.modifiedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      ...(meta.ownImage ? {} : { images: ['/opengraph-image'] }),
    },
  };
}

export const breadcrumbLd = (items: { name: string; path: string }[]): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
});

export const publisherLd = {
  '@type': 'Organization',
  name: siteConfig.name,
  url: siteConfig.url,
} as const;
