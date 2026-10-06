import type { Metadata } from 'next';
import { isMock, siteConfig } from '@/config/site';

export const absoluteUrl = (path: string): string => new URL(path, siteConfig.url).toString();

interface PageMeta {
  title: string;
  description: string;
  /** Chemin canonique, commençant par « / ». */
  path: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
  keywords?: string[];
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
  return {
    title: meta.title,
    description: meta.description,
    ...(meta.keywords ? { keywords: meta.keywords } : {}),
    alternates: { canonical: meta.path },
    robots: blocked ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type: meta.type ?? 'website',
      title: meta.title,
      description: meta.description,
      url: meta.path,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
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
