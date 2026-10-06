import Link from 'next/link';
import Image from 'next/image';
import { siteConfig, isMock } from '@/config/site';
import { shortWeek } from '@/domain/weeks';
import { highlightTicker } from '@/lib/moves';
import { allCharts, weeklyHighlights } from '@/lib/repository';
import { lastUpdated } from '@/lib/graph';
import { MainNav } from './nav';
import { TimeAgo } from './client';

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`wordmark ${className ?? ''}`}>
      <Image src="/sandbox-logo.png" alt={siteConfig.name} width={120} height={80} />
    </span>
  );
}

function Ticker() {
  const items = weeklyHighlights().map(highlightTicker);
  if (items.length === 0) return null;
  const color = (tone: string): string =>
    tone === 'up'
      ? '#3CD6FC'
      : tone === 'down'
        ? '#9BAEBB'
        : tone === 'hot'
          ? '#1CB5ED'
          : '#F4F7FA';
  const run = (suffix: string, hidden: boolean) => (
    <div className="ticker-item" aria-hidden={hidden || undefined} key={suffix}>
      {items.map((item, i) => (
        <span key={`${suffix}${String(i)}`} className="ticker-item label">
          <b style={{ color: color(item.tone) }}>{item.badge}</b>
          <span>{item.text}</span>
          <span style={{ opacity: 0.35 }}>/</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="ticker" role="region" aria-label="Mouvements de la semaine">
      <div className="ticker-track">
        {run('a', false)}
        {run('b', true)}
      </div>
    </div>
  );
}

export function Masthead() {
  const updated = lastUpdated();
  return (
    <>
      {isMock ? (
        <div className="ribbon">
          <div className="wrap label flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1.5">
            <span>
              <b>Données de démonstration</b> · aucune valeur affichée n’est issue d’une API ni d’un
              benchmark réel.
            </span>
            <Link href="/about#donnees" className="underline decoration-2 underline-offset-2">
              Pourquoi ?
            </Link>
          </div>
        </div>
      ) : null}
      <Ticker />
      <header className="site-header border-b border-hair bg-paper">
        <div className="wrap flex items-center justify-between gap-4 py-3">
          <Link href="/" aria-label={`${siteConfig.name} : accueil`} className="shrink-0">
            <Wordmark />
          </Link>
          <div className="hidden md:block">
            <MainNav />
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/charts/history"
              className="label hidden items-center gap-2 lg:flex"
              title="Historique des classements"
            >
              <span className="pulse" aria-hidden="true" />
              <span>
                {shortWeek(updated.week)} · <TimeAgo iso={updated.publishedAt} />
              </span>
            </Link>
          </div>
        </div>
        <div className="wrap md:hidden">
          <MainNav />
        </div>
      </header>
    </>
  );
}

export function Footer() {
  const charts = allCharts();
  const updated = lastUpdated();
  return (
    <footer className="mt-24 border-t border-hair bg-paper-2 text-ink">
      <div className="wrap grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Wordmark className="footer-wordmark" />
          <p className="mt-4 max-w-xs text-sm opacity-80">
            {siteConfig.tagline} Trois personnes, un micro, et des classements qu’on essaie de
            rendre incontestables.
          </p>
          <p className="label mt-4 opacity-70">
            Dernière mise à jour : <TimeAgo iso={updated.publishedAt} />
          </p>
        </div>
        <nav aria-label="Classements">
          <p className="label mb-3 opacity-60">Charts</p>
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
                Historique par semaine
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Explorer">
          <p className="label mb-3 opacity-60">Explorer</p>
          <ul className="grid gap-2 text-sm">
            <li>
              <Link href="/latest" className="hover:underline">
                Latest
              </Link>
            </li>
            <li>
              <Link href="/episodes" className="hover:underline">
                Épisodes
              </Link>
            </li>
            <li>
              <Link href="/topics" className="hover:underline">
                Thèmes
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:underline">
                À propos
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <p className="label mb-3 opacity-60">Transparence</p>
          <ul className="grid gap-2 text-sm">
            <li>
              <Link href="/about#donnees" className="hover:underline">
                D’où viennent les données
              </Link>
            </li>
            <li>
              <Link href="/about#separation" className="hover:underline">
                Données et avis, séparés
              </Link>
            </li>
            {charts.slice(0, 2).map((c) => (
              <li key={c.slug}>
                <Link href={`/charts/${c.slug}/methodology`} className="hover:underline">
                  Méthode : {c.short}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-hair">
        <div className="wrap label flex flex-wrap justify-between gap-2 py-4 opacity-70">
          <span>
            © {new Date().getUTCFullYear()} {siteConfig.name}
          </span>
          <span>
            {isMock
              ? 'Mode démonstration : indexation désactivée'
              : 'Données sourcées, avis signés'}
          </span>
        </div>
      </div>
    </footer>
  );
}
