import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/newsreader/wght.css';
import '@fontsource-variable/newsreader/wght-italic.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import '../globals.css';
import '../site-polish.css';
import '../(fr)/charts/charts.css';
import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { Footer, Masthead } from '@/components/shell';
import { LocalizationProvider, Text } from '@/components/localization';
import { siteDictionary } from '@/i18n/dictionaries';
import { translateText } from '@/i18n/translation';
import { localeDirection } from '@/i18n/routing';
import { preparePublishedEditorialContent } from '@/lib/admin-persistence';
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
  const dictionary = await siteDictionary(locale);
  const description = translateText(siteConfig.description, dictionary, locale);
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${siteConfig.name} — ${translateText('Podcasts et classements IA', dictionary, locale)}`,
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
  await preparePublishedEditorialContent();
  const dictionary = await siteDictionary(locale);
  const messages = siteMessages('fr-FR');
  return (
    <html lang={locale} dir={localeDirection(locale)} suppressHydrationWarning>
      <body>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <LocalizationProvider locale={locale} dictionary={dictionary}>
          <a className="skip" href="#main">
            <Text>{messages.skipToContent}</Text>
          </a>
          <Masthead locale={locale} />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <Footer locale={locale} />
        </LocalizationProvider>
        <JsonLd
          data={[
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: siteConfig.name,
              url: siteConfig.url,
              description: translateText(siteConfig.description, dictionary, locale),
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
