import { Text, LocalizedElement } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
import Image from 'next/image';
import { siteConfig } from '@/config/site';
import { allEpisodes } from '@/lib/repository';
import { CHART_LABELS } from '@/domain/sandbox-charts';
import { lastUpdated } from '@/lib/graph';
import { LocaleSwitcher, MainNav } from './nav';
import { ScrollState, TimeAgo } from './client';
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
          <div className="hidden md:block">
            <MainNav locale={locale} />
          </div>
          <div className="masthead-tools">
            <Text>
              {
                <LocalizedElement
                  as="form"
                  action="/search"
                  role="search"
                  className="header-search"
                >
                  <label className="sr-only" htmlFor="site-search">
                    <Text>{messages.searchLabel}</Text>
                  </label>
                  <LocalizedElement
                    as="input"
                    id="site-search"
                    type="search"
                    name="q"
                    placeholder={messages.searchPlaceholder}
                  />
                  <LocalizedElement as="button" type="submit" aria-label={messages.searchSubmit}>
                    <Text>{'\u21B5'}</Text>
                  </LocalizedElement>
                </LocalizedElement>
              }
            </Text>
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
export function Footer() {
  const charts = Object.values(CHART_LABELS);
  const episodes = allEpisodes();
  const updated = lastUpdated();
  const messages = siteMessages('fr-FR');
  return (
    <footer className="site-footer border-t border-hair bg-paper-2 text-ink">
      <div className="wrap grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Wordmark className="footer-wordmark" />
          <p className="mt-4 max-w-xs text-sm opacity-80">
            <Text>{siteConfig.tagline}</Text> <Text>{messages.podcastsDescription}</Text>
          </p>
          <p className="label mt-4 opacity-70">
            <Text>{messages.updated}</Text> <TimeAgo iso={updated.publishedAt} />
          </p>
        </div>
        <LocalizedElement as="nav" aria-label="Podcasts">
          <p className="label mb-3 opacity-60">
            <Text>{'Podcasts'}</Text>
          </p>
          <ul className="grid gap-2 text-sm">
            <Text>
              {episodes.slice(0, 4).map((episode) => (
                <li key={episode.number}>
                  <Link href={`/episodes/${String(episode.number)}`} className="hover:underline">
                    <Text>{episode.title}</Text>
                  </Link>
                </li>
              ))}
            </Text>
            <li>
              <Link href="/episodes" className="hover:underline">
                <Text>{messages.allEpisodes}</Text>
              </Link>
            </li>
          </ul>
        </LocalizedElement>
        <LocalizedElement as="nav" aria-label="Classements">
          <p className="label mb-3 opacity-60">
            <Text>{'Classements'}</Text>
          </p>
          <ul className="grid gap-2 text-sm">
            <Text>
              {charts.map((c) => (
                <li key={c.slug}>
                  <Link href={`/charts/${c.slug}`} className="hover:underline">
                    <Text>{c.title}</Text>
                  </Link>
                </li>
              ))}
            </Text>
            <li>
              <Link href="/charts/history" className="hover:underline">
                <Text>{messages.history}</Text>
              </Link>
            </li>
          </ul>
        </LocalizedElement>
        <LocalizedElement as="nav" aria-label="À propos">
          <p className="label mb-3 opacity-60">
            <Text>{'Transparence'}</Text>
          </p>
          <ul className="grid gap-2 text-sm">
            <li>
              <Link href="/about" className="hover:underline">
                <Text>{'\u00C0 propos'}</Text>
              </Link>
            </li>
            <Text>
              {charts.slice(0, 2).map((c) => (
                <li key={c.slug}>
                  <Link href={`/charts/${c.slug}/methodology`} className="hover:underline">
                    <Text>{'M\u00E9thode : '}</Text>
                    <Text>{c.title}</Text>
                  </Link>
                </li>
              ))}
            </Text>
          </ul>
        </LocalizedElement>
      </div>
      <div className="border-t border-hair">
        <div className="wrap label flex flex-wrap justify-between gap-2 py-4 opacity-70">
          <span>
            <Text>{'\u00A9 '}</Text>
            <Text>{new Date().getUTCFullYear()}</Text> <Text>{siteConfig.name}</Text>
          </span>
          <div className="footer-utilities">
            <Link href="/topics">
              <Text>{messages.topics}</Text>
            </Link>
            <Link href="/search">
              <Text>{messages.search}</Text>
            </Link>
            <a href="/feed.xml">
              <Text>{messages.rss}</Text>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
