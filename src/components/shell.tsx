import Link from 'next/link';
import Image from 'next/image';
import { siteConfig, isMock } from '@/config/site';
import { shortWeek } from '@/domain/weeks';
import { allCharts, allEpisodes } from '@/lib/repository';
import { lastUpdated } from '@/lib/graph';
import { MainNav } from './nav';
import { ScrollState, ThemeSelector, TimeAgo } from './client';

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`wordmark ${className ?? ''}`}>
      <Image
        className="wordmark-image-blue"
        src="/sandbox-logo.png"
        alt={siteConfig.name}
        width={120}
        height={80}
      />
      <Image
        className="wordmark-image-red"
        src="/sandbox-logo-red.png"
        alt={siteConfig.name}
        width={120}
        height={107}
      />
    </span>
  );
}

export function Masthead() {
  const updated = lastUpdated();
  return (
    <>
      <ScrollState />
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
      <header className="site-header border-b border-hair bg-paper">
        <div className="wrap flex items-center justify-between gap-4 py-3">
          <Link href="/" aria-label={`${siteConfig.name} : accueil`} className="shrink-0">
            <Wordmark />
          </Link>
          <div className="hidden md:block">
            <MainNav />
          </div>
          <div className="flex items-center gap-3">
            <form action="/search" role="search" className="header-search">
              <label className="sr-only" htmlFor="site-search">
                Rechercher dans les podcasts et les classements
              </label>
              <input id="site-search" type="search" name="q" placeholder="Rechercher" />
              <button type="submit" aria-label="Lancer la recherche">
                ↵
              </button>
            </form>
            <Link href="/search" className="mobile-search btn" aria-label="Ouvrir la recherche">
              ⌕
            </Link>
            <ThemeSelector />
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
  const episodes = allEpisodes();
  const updated = lastUpdated();
  return (
    <footer className="mt-24 border-t border-hair bg-paper-2 text-ink">
      <div className="wrap grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Wordmark className="footer-wordmark" />
          <p className="mt-4 max-w-xs text-sm opacity-80">
            {siteConfig.tagline} Les épisodes, leurs ressources et les classements de la semaine.
          </p>
          <p className="label mt-4 opacity-70">
            Dernière mise à jour : <TimeAgo iso={updated.publishedAt} />
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
                Tous les épisodes
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
                Historique par semaine
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
        </nav>
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
