import { siteFonts } from '../fonts';
import '../globals.css';
import '../site-polish.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AnalyticsConsent } from '@/components/analytics-consent';
import { Footer, Masthead } from '@/components/shell';
import { JsonLd } from '@/components/json-ld';
import { isMock, siteConfig } from '@/config/site';
import { preparePublicEditorialContent } from '@/lib/admin-persistence';
import { newsPageAvailable } from '@/lib/news-page-data';
import { absoluteUrl, openGraphLocaleForTag, robotsMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  await preparePublicEditorialContent();
  const googleSiteVerification = process.env['GOOGLE_SITE_VERIFICATION']?.trim();
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${siteConfig.name} : IA, engineering et produit`,
      template: `%s · ${siteConfig.name}`,
    },
    description: siteConfig.description,
    applicationName: siteConfig.name,
    robots: robotsMetadata(isMock),
    ...(googleSiteVerification ? { verification: { google: googleSiteVerification } } : {}),
    openGraph: {
      type: 'website',
      siteName: siteConfig.name,
      locale: openGraphLocaleForTag(siteConfig.locale),
    },
    twitter: { card: 'summary_large_image' },
    alternates: { types: { 'application/rss+xml': '/feed.xml' } },
  };
}

export const viewport: Viewport = {
  themeColor: '#05090d',
  colorScheme: 'dark',
};

/** Les textes publiés restent statiques entre deux revalidations ISR. */
export const revalidate = 3600;

export default async function RootLayout({ children }: { children: ReactNode }) {
  await preparePublicEditorialContent();
  const newsAvailable = await newsPageAvailable();
  return (
    <html lang={siteConfig.language} className={siteFonts} data-scroll-behavior="smooth">
      <body>
        <a className="skip" href="#main">
          Aller au contenu
        </a>
        <Masthead newsAvailable={newsAvailable} />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <Footer newsAvailable={newsAvailable} />
        <JsonLd
          data={[
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: siteConfig.name,
              url: siteConfig.url,
              description: siteConfig.description,
              inLanguage: siteConfig.language,
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
        <AnalyticsConsent language={siteConfig.language} />
      </body>
    </html>
  );
}
