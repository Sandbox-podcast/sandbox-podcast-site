import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/newsreader/wght.css';
import '@fontsource-variable/newsreader/wght-italic.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import '../globals.css';
import '../site-polish.css';
import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { Footer, Masthead } from '@/components/shell';
import { JsonLd } from '@/components/json-ld';
import { isMock, siteConfig } from '@/config/site';
import { localeTagFromRouteSegment } from '@/i18n/locales';
import { isLocaleUiReviewed, siteMessages } from '@/i18n/messages';
import { absoluteUrl, openGraphLocaleForTag, robotsMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: routeLocale } = await params;
  const locale = localeTagFromRouteSegment(routeLocale);
  if (!locale) return {};
  const googleSiteVerification = process.env['GOOGLE_SITE_VERIFICATION']?.trim();
  const description = locale.startsWith('fr')
    ? siteConfig.description
    : 'Video podcasts and transparent AI rankings, with dated data, sources and methods.';
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${siteConfig.name} — AI rankings and video podcasts`,
      template: `%s · ${siteConfig.name}`,
    },
    description,
    applicationName: siteConfig.name,
    robots: robotsMetadata(isMock || !isLocaleUiReviewed(locale)),
    ...(googleSiteVerification ? { verification: { google: googleSiteVerification } } : {}),
    openGraph: {
      type: 'website',
      siteName: siteConfig.name,
      locale: openGraphLocaleForTag(locale),
    },
    twitter: { card: 'summary_large_image' },
  };
}

export const viewport: Viewport = {
  themeColor: '#05090d',
  colorScheme: 'dark',
};

export const revalidate = 3600;

export default async function LocalizedRootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: routeLocale } = await params;
  const locale = localeTagFromRouteSegment(routeLocale);
  if (!locale) notFound();
  const messages = siteMessages(locale);
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <a className="skip" href="#main">
          {messages.skipToContent}
        </a>
        <Masthead locale={locale} />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <Footer locale={locale} />
        <JsonLd
          data={[
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: siteConfig.name,
              url: siteConfig.url,
              description: siteConfig.description,
              inLanguage: locale,
            },
            {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: siteConfig.name,
              url: siteConfig.url,
              logo: absoluteUrl('/sandbox-logo.png'),
            },
          ]}
        />
        <Analytics />
      </body>
    </html>
  );
}
