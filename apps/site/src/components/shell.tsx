import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '@/config/site';
import { allEpisodes } from '@/lib/repository';
import { CHART_LABELS } from '@/domain/sandbox-charts';
import { lastUpdated } from '@/lib/graph';
import { LocaleSwitcher, MainNav } from './nav';
import { ScrollState, TimeAgo } from './client';
import { localeRouteSegment } from '@/i18n/locales';
import { siteMessageLocale, siteMessages } from '@/i18n/messages';

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
  const messages = siteMessages(locale);
  const prefix = localeRouteSegment(locale);
  const homeHref = prefix ? `/${prefix}` : '/';
  const isFrench = locale.startsWith('fr');
  return (
    <>
      <ScrollState />
      <header className="site-header border-b border-hair bg-paper">
        <div className="wrap masthead-row">
          <Link
            href={homeHref}
            aria-label={`${siteConfig.name} — ${messages.homeLabel}`}
            className="shrink-0"
          >
            <Wordmark />
          </Link>
          <div className="hidden md:block">
            <MainNav locale={locale} />
          </div>
          <div className="masthead-tools">
            {isFrench ? (
              <form action="/search" role="search" className="header-search">
                <label className="sr-only" htmlFor="site-search">
                  {messages.searchLabel}
                </label>
                <input
                  id="site-search"
                  type="search"
                  name="q"
                  placeholder={messages.searchPlaceholder}
                />
                <button type="submit" aria-label={messages.searchSubmit}>
                  ↵
                </button>
              </form>
            ) : null}
            <LocaleSwitcher locale={locale} />
          </div>
        </div>
        <div className="wrap md:hidden">
          <MainNav locale={locale} />
        </div>
      </header>
    </>
  );
}

export function Footer({ locale = 'fr-FR' }: { locale?: string }) {
  if (!locale.startsWith('fr')) {
    const messages = siteMessages(locale);
    const prefix = localeRouteSegment(locale);
    const chartsHref = `/${prefix ?? ''}/charts`;
    const homeHref = `/${prefix ?? ''}`;
    return (
      <footer
        className="site-footer border-t border-hair bg-paper-2 text-ink"
        lang={siteMessageLocale(locale)}
      >
        <div className="wrap flex flex-wrap items-center justify-between gap-6 py-8">
          <div>
            <Wordmark className="footer-wordmark" />
            <p className="mt-3 max-w-sm text-sm opacity-80">{messages.podcastsDescription}</p>
          </div>
          <nav aria-label={messages.navigationLabel} className="footer-utilities">
            <Link href={homeHref}>{messages.homeLabel}</Link>
            <Link href={chartsHref}>{messages.rankings}</Link>
          </nav>
          <span className="label opacity-70">
            © {new Date().getUTCFullYear()} {siteConfig.name}
          </span>
        </div>
      </footer>
    );
  }
  const charts = Object.values(CHART_LABELS);
  const episodes = allEpisodes();
  const updated = lastUpdated();
  const messages = siteMessages(locale);
  return (
    <footer className="site-footer border-t border-hair bg-paper-2 text-ink">
      <div className="wrap grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Wordmark className="footer-wordmark" />
          <p className="mt-4 max-w-xs text-sm opacity-80">
            {siteConfig.tagline} {messages.podcastsDescription}
          </p>
          <p className="label mt-4 opacity-70">
            {messages.updated} <TimeAgo iso={updated.publishedAt} />
          </p>
        </div>
        <nav aria-label="Podcasts">
          <p className="label mb-3 opacity-60">Podcasts</p>
          <ul className="grid gap-2 text-sm">
            {episodes.slice(0, 4).map((episode) => (
              <li key={episode.number}>
                <Link href={`/episodes/${String(episode.number)}`} className="hover:underline">
                  {episode.title}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/episodes" className="hover:underline">
                {messages.allEpisodes}
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Classements">
          <p className="label mb-3 opacity-60">Classements</p>
          <ul className="grid gap-2 text-sm">
            {charts.map((c) => (
              <li key={c.slug}>
                <Link href={`/charts/${c.slug}`} className="hover:underline">
                  {c.title}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/charts/history" className="hover:underline">
                {messages.history}
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="À propos">
          <p className="label mb-3 opacity-60">Transparence</p>
          <ul className="grid gap-2 text-sm">
            <li>
              <Link href="/about" className="hover:underline">
                À propos
              </Link>
            </li>
            {charts.slice(0, 2).map((c) => (
              <li key={c.slug}>
                <Link href={`/charts/${c.slug}/methodology`} className="hover:underline">
                  Méthode : {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-hair">
        <div className="wrap label flex flex-wrap justify-between gap-2 py-4 opacity-70">
          <span>
            © {new Date().getUTCFullYear()} {siteConfig.name}
          </span>
          <div className="footer-utilities">
            <Link href="/topics">{messages.topics}</Link>
            <Link href="/search">{messages.search}</Link>
            <a href="/feed.xml">{messages.rss}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
