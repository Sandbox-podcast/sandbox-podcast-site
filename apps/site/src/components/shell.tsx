import { Text, LocalizedElement } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
import Image from 'next/image';
import { siteConfig } from '@/config/site';

import { LocaleSwitcher, MainNav, MobileNav } from './nav';
import { ScrollState } from './client';
import { siteMessages } from '@/i18n/messages';
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`site-brand ${className ?? ''}`}>
      <span className="wordmark">
        <Image
          className="wordmark-image"
          src="/sandbox-logo.png"
          alt={siteConfig.name}
          width={2172}
          height={724}
        />
      </span>
    </span>
  );
}
export function Masthead({ locale = 'fr-FR' }: { locale?: string }) {
  const messages = siteMessages('fr-FR');
  return (
    <>
      <ScrollState />
      <header className="site-header border-b border-hair bg-paper">
        <div className="wrap masthead-row">
          <Link
            href="/"
            aria-label={`${siteConfig.name} — ${messages.homeLabel}`}
            className="shrink-0"
          >
            <Wordmark />
          </Link>
          <div className="desktop-navigation">
            <MainNav locale={locale} />
          </div>
          <div className="masthead-tools">
            <Link href="/search" className="site-search-action" aria-label={messages.searchLabel}>
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="10" cy="10" r="6" />
                <path d="m15 15 6 6" />
              </svg>
              <span className="sr-only">
                <Text>{messages.search}</Text>
              </span>
            </Link>
            <LocaleSwitcher locale={locale} />
          </div>
          <MobileNav locale={locale} />
        </div>
      </header>
    </>
  );
}
export function Footer() {
  return (
    <footer className="site-footer discovery-footer">
      <div className="wrap discovery-footer-grid">
        <div>
          <Wordmark className="footer-wordmark" />
          <p>
            <Text>Le Talk Show IA & tech de Lou, Loïc et Nico.</Text>
          </p>
          <div className="footer-platforms">
            {(['youtube', 'spotify'] as const).map((platform) => (
              <a
                key={platform}
                href={siteConfig.platforms[platform]}
                target="_blank"
                rel="noopener noreferrer"
                data-analytics-event={platform === 'youtube' ? 'youtube_open' : 'listen_click'}
                data-analytics-placement="footer"
                data-analytics-platform={platform}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  {platform === 'youtube' ? (
                    <path d="M23 7a3 3 0 0 0-2-2C19 4.5 12 4.5 12 4.5S5 4.5 3 5a3 3 0 0 0-2 2 31 31 0 0 0 0 10 3 3 0 0 0 2 2c2 .5 9 .5 9 .5s7 0 9-.5a3 3 0 0 0 2-2 31 31 0 0 0 0-10ZM9.5 15.5v-7l6 3.5-6 3.5Z" />
                  ) : (
                    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.6 14.5a.75.75 0 0 1-1 .25c-2.7-1.65-5.65-1.9-9.1-1.1a.75.75 0 1 1-.35-1.45c3.85-.9 7.25-.6 10.2 1.25a.75.75 0 0 1 .25 1.05Zm1.2-2.7a.9.9 0 0 1-1.25.3c-3.05-1.85-7.65-2.4-11.2-1.3a.9.9 0 1 1-.55-1.7c4.05-1.25 9.15-.65 12.7 1.5a.9.9 0 0 1 .3 1.2Zm.1-2.8C14.25 8.85 8.2 8.65 4.7 9.7a1.1 1.1 0 1 1-.65-2.1c4.05-1.2 10.75-.95 14.95 1.5a1.1 1.1 0 0 1-1.1 1.9Z" />
                  )}
                </svg>
                {platform === 'youtube' ? 'YouTube' : 'Spotify'}
                <span className="sr-only">
                  <Text>(nouvel onglet)</Text>
                </span>
              </a>
            ))}
          </div>
        </div>
        <LocalizedElement as="nav" aria-label="Explorer">
          <h2>
            <Text>Explorer</Text>
          </h2>
          <ul>
            <li>
              <Link href="/charts">
                <Text>Classements</Text>
              </Link>
            </li>
            <li>
              <Link href="/time-machine">
                <Text>Time Machine (en français)</Text>
              </Link>
            </li>
            <li>
              <Link href="/nos-projets">
                <Text>Nos projets</Text>
              </Link>
            </li>
            <li>
              <Link href="/search">
                <Text>Rechercher</Text>
              </Link>
            </li>
          </ul>
        </LocalizedElement>
        <LocalizedElement as="nav" aria-label="Sandbox">
          <h2>Sandbox</h2>
          <ul>
            <li>
              <Link href="/podcast">
                <Text>Le Talk Show</Text>
              </Link>
            </li>
            <li>
              <Link href="/about">
                <Text>À propos</Text>
              </Link>
            </li>
            <li>
              <Link href="/charts/history">
                <Text>Archives des classements</Text>
              </Link>
            </li>
            <li>
              <Link href="/charts/awards">
                <Text>Badges & Awards</Text>
              </Link>
            </li>
          </ul>
        </LocalizedElement>
      </div>
      <div className="wrap discovery-footer-bottom">
        <span>© {new Date().getUTCFullYear()} SANDBOX</span>
        <Link href="/confidentialite">
          <Text>Données personnelles</Text>
        </Link>
        <a href="/feed.xml">
          <Text>Flux RSS</Text>
        </a>
      </div>
    </footer>
  );
}
