import Link from 'next/link';
import { EpisodeCard } from '@/components/cards';
import { siteConfig } from '@/config/site';
import { allEpisodes } from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Épisodes : le podcast et ses show notes complètes',
  description:
    'Tous les épisodes du podcast, avec chapitres, liens cités, sources de préparation et classements commentés.',
  path: '/episodes',
});

export default function EpisodesPage() {
  const episodes = allEpisodes();
  return (
    <div className="wrap pt-6">
      <header className="mb-10">
        <p className="label mb-3 text-ink-2">{episodes.length} épisodes · un par semaine</p>
        <h1 className="display" style={{ fontSize: 'clamp(3.5rem, 12vw, 9rem)' }}>
          Episodes
        </h1>
        <p className="mt-4 max-w-3xl font-serif text-xl leading-snug md:text-2xl">
          Chaque épisode a ses show notes complètes : tout ce qu’on a cité, avec le lien,
          l’horodatage et les sources de préparation.
        </p>
        <p className="mt-5 flex flex-wrap gap-2">
          <a
            className="btn"
            href={siteConfig.platforms.youtube}
            target="_blank"
            rel="noopener noreferrer"
          >
            YouTube ↗
          </a>
          <a
            className="btn"
            href={siteConfig.platforms.spotify}
            target="_blank"
            rel="noopener noreferrer"
          >
            Spotify ↗
          </a>
          <a
            className="btn"
            href={siteConfig.platforms.apple}
            target="_blank"
            rel="noopener noreferrer"
          >
            Apple Podcasts ↗
          </a>
          <Link className="btn" href="/feed.xml">
            RSS du site
          </Link>
        </p>
      </header>
      <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
        {episodes.map((e) => (
          <EpisodeCard key={e.number} episode={e} />
        ))}
      </div>
    </div>
  );
}
