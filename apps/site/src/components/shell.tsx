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
          sizes="252px"
        />
      </span>
    </span>
  );
}
export function Masthead({
  locale = 'fr-FR',
  newsAvailable = false,
}: {
  locale?: string;
  newsAvailable?: boolean;
}) {
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
            <MainNav locale={locale} newsAvailable={newsAvailable} />
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
          <MobileNav locale={locale} newsAvailable={newsAvailable} />
        </div>
      </header>
    </>
  );
}
export function Footer({ newsAvailable = false }: { newsAvailable?: boolean } = {}) {
  return (
    <footer className="site-footer discovery-footer">
      <div className="wrap discovery-footer-grid">
        <div>
          <Wordmark className="footer-wordmark" />
          <p>
            <Text>Le Talk Show IA & tech de Lou, Loïc et Nico.</Text>
          </p>
          <div className="footer-platforms">
            {(
              [
                { label: 'YouTube', href: siteConfig.platforms.youtube },
                { label: 'Spotify', href: siteConfig.platforms.spotify },
                { label: 'X', href: 'https://x.com/SandboxTalkShow' },
                { label: 'TikTok', href: 'https://www.tiktok.com/@sandbox.talkshow' },
                { label: 'Instagram', href: 'https://www.instagram.com/Sandbox.TalkShow/' },
              ] as const
            ).map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                data-analytics-event={label === 'YouTube' ? 'youtube_open' : 'social_click'}
                data-analytics-placement="footer"
                data-analytics-platform={label.toLowerCase()}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  {label === 'YouTube' ? (
                    <path d="M23 7a3 3 0 0 0-2-2C19 4.5 12 4.5 12 4.5S5 4.5 3 5a3 3 0 0 0-2 2 31 31 0 0 0 0 10 3 3 0 0 0 2 2c2 .5 9 .5 9 .5s7 0 9-.5a3 3 0 0 0 2-2 31 31 0 0 0 0-10ZM9.5 15.5v-7l6 3.5-6 3.5Z" />
                  ) : label === 'Spotify' ? (
                    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.6 14.5a.75.75 0 0 1-1 .25c-2.7-1.65-5.65-1.9-9.1-1.1a.75.75 0 1 1-.35-1.45c3.85-.9 7.25-.6 10.2 1.25a.75.75 0 0 1 .25 1.05Zm1.2-2.7a.9.9 0 0 1-1.25.3c-3.05-1.85-7.65-2.4-11.2-1.3a.9.9 0 1 1-.55-1.7c4.05-1.25 9.15-.65 12.7 1.5a.9.9 0 0 1 .3 1.2Zm.1-2.8C14.25 8.85 8.2 8.65 4.7 9.7a1.1 1.1 0 1 1-.65-2.1c4.05-1.2 10.75-.95 14.95 1.5a1.1 1.1 0 0 1-1.1 1.9Z" />
                  ) : label === 'X' ? (
                    <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-5-7.2L5.6 22H2.4l7.3-8.4L1.8 2h6.5l4.5 6.7L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z" />
                  ) : label === 'TikTok' ? (
                    <path d="M19.6 6.2a5.1 5.1 0 0 1-3.1-4.4V1h-4v15.4a2.8 2.8 0 1 1-2.8-2.8c.4 0 .8.1 1.1.2v-4.1a6.8 6.8 0 1 0 5.7 6.7V8.6a9.1 9.1 0 0 0 5.3 1.7V6.3c-.8 0-1.5 0-2.2-.1Z" />
                  ) : (
                    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 3a7 7 0 0 1 4.1 12.7c-.1-1.2-.4-2.3-1.3-3 .3-.5.5-1.1.5-1.8 0-1.4-.8-2.4-2-2.8.6-.4.9-1 .9-1.8 0-1.4-1-2.3-2.6-2.3s-2.6.9-2.6 2.3c0 .8.4 1.4.9 1.8-1.2.4-2 1.4-2 2.8 0 .7.2 1.3.5 1.8-.9.7-1.2 1.8-1.3 3A7 7 0 0 1 12 5Zm-3.5 12.9c.1-1.1.4-1.8 1.2-2.3.6.4 1.4.7 2.3.7s1.7-.3 2.3-.7c.8.5 1.1 1.2 1.2 2.3a7 7 0 0 1-7 0Z" />
                  )}
                </svg>
                {label}
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
            {newsAvailable ? (
              <li>
                <Link href="/news">
                  <Text>Actualités</Text>
                </Link>
              </li>
            ) : null}
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
        <a href="mailto:sandbox.podcast.pro@gmail.com">sandbox.podcast.pro@gmail.com</a>
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
