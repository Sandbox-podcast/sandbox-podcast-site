import type { Metadata } from 'next';
import { isMock, siteConfig } from '@/config/site';
import { hreflangAlternates, type HreflangPage } from '@/domain/ranking-catalog';
import { sharedPageAlternates } from '@/i18n/indexing';

export const absoluteUrl = (path: string): string => new URL(path, siteConfig.url).toString();
export const SITE_SHARE_IMAGE_ALT = 'Sandbox : Talk Show et classements tech';

export function siteShareImage() {
  return {
    url: absoluteUrl('/api/social-image'),
    width: 1200,
    height: 630,
    alt: SITE_SHARE_IMAGE_ALT,
  } as const;
}

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
  /** `false` autorise une page vérifiée même si d'autres contenus restent simulés. */
  noindex?: boolean;
  keywords?: string[];
  /** Variantes localisées indexables de cette même page. */
  localizedAlternates?: readonly HreflangPage[];
  /** La route a son propre `opengraph-image` : Next.js publie son URL avec une empreinte. */
  ownImage?: boolean;
}

/**
 * Métadonnées d'une page : titre, description, URL canonique, OpenGraph et cartes X/LinkedIn/Discord/Slack.
 * Les pages avec carte dédiée utilisent le fichier `opengraph-image.tsx` de leur route.
 * Les autres utilisent une image de marque à URL stable.
 * Une page explicitement vérifiée peut être indexée sans exposer les fixtures du reste du site.
 */
export function pageMetadata(meta: PageMeta): Metadata {
  const blocked = meta.noindex === true || (isMock && meta.noindex !== false);
  const openGraphLocale = openGraphLocaleForTag(meta.locale ?? siteConfig.locale);
  const fallbackImage = siteShareImage();
  const languages = !blocked
    ? hreflangAlternates(
        meta.localizedAlternates ?? sharedPageAlternates(meta.path),
        siteConfig.url,
      )
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
      ...(meta.ownImage ? {} : { images: [fallbackImage] }),
      ...(meta.publishedTime ? { publishedTime: meta.publishedTime } : {}),
      ...(meta.modifiedTime ? { modifiedTime: meta.modifiedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      ...(meta.ownImage ? {} : { images: [{ url: fallbackImage.url, alt: fallbackImage.alt }] }),
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
