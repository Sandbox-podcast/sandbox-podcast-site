import Link from 'next/link';
import { EpisodeCard } from '@/components/cards';
import { EpisodeLibrary } from '@/components/episode-library';
import { siteConfig } from '@/config/site';
import { allEpisodes, allTopics, getTopic } from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Podcasts : tous les épisodes',
  description:
    'Retrouvez les épisodes Sandbox, leurs chapitres et les ressources mentionnées pendant les émissions.',
  path: '/episodes',
});

export default function EpisodesPage() {
  const episodes = allEpisodes().toSorted((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const topics = allTopics().filter((topic) =>
    episodes.some((episode) => episode.topics.includes(topic.slug)),
  );
  return (
    <div className="wrap library-page">
      <header className="library-heading">
        <div>
          <p className="eyebrow">La bibliothèque Sandbox</p>
          <h1 className="display">Tous les podcasts.</h1>
          <p className="library-description">
            La tech et l'IA, épisode par épisode. La vidéo, les chapitres et tous les liens cités au
            même endroit.
          </p>
        </div>
        <div className="page-actions">
          <Link href="/search" className="btn">
            Recherche globale
          </Link>
          <a
            className="btn"
            href={siteConfig.platforms.youtube}
            target="_blank"
            rel="noopener noreferrer"
          >
            Chaîne YouTube <span className="sr-only">(nouvel onglet)</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>
      <EpisodeLibrary
        topics={topics.map(({ slug, label }) => ({ slug, label }))}
        entries={episodes.map((episode) => ({
          number: episode.number,
          publishedAt: episode.publishedAt,
          durationSec: episode.durationSec,
          topics: episode.topics,
          searchable: [
            episode.title,
            episode.dek,
            episode.description,
            ...episode.topics.map((slug) => getTopic(slug).label),
            ...episode.mentions.flatMap((mention) => [mention.label, mention.note ?? '']),
            ...episode.sources.flatMap((source) => [source.label, source.publisher ?? '']),
          ],
          node: <EpisodeCard episode={episode} />,
        }))}
      />
    </div>
  );
}
