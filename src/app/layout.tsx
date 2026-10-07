import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/newsreader/wght.css';
import '@fontsource-variable/newsreader/wght-italic.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './globals.css';
import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { Footer, Masthead } from '@/components/shell';
import { JsonLd } from '@/components/json-ld';
import { isMock, siteConfig } from '@/config/site';
import { preparePublishedEditorialContent } from '@/lib/admin-persistence';

export async function generateMetadata(): Promise<Metadata> {
  await preparePublishedEditorialContent();
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${siteConfig.name} : ${siteConfig.tagline}`,
      template: `%s · ${siteConfig.name}`,
    },
    description: siteConfig.description,
    applicationName: siteConfig.name,
    robots: isMock ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: { type: 'website', siteName: siteConfig.name, locale: siteConfig.locale },
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
  await preparePublishedEditorialContent();
  return (
    <html lang={siteConfig.language} suppressHydrationWarning>
      <body>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <a className="skip" href="#main">
          Aller au contenu
        </a>
        <Masthead />
        <main id="main">{children}</main>
        <Footer />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: siteConfig.name,
            url: siteConfig.url,
            description: siteConfig.description,
            inLanguage: siteConfig.language,
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}
