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
            <Text>Le podcast IA & tech de Lou, Loïc et Nico.</Text>
          </p>
          <a
            href={siteConfig.platforms.youtube}
            target="_blank"
            rel="noopener noreferrer"
            data-analytics-event="youtube_open"
            data-analytics-placement="footer"
          >
            <Text>Retrouvez-nous sur YouTube</Text>
            <span className="sr-only">
              <Text>(nouvel onglet)</Text>
            </span>
          </a>
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
                <Text>Le podcast</Text>
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
