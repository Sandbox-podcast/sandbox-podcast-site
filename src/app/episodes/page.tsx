import Link from 'next/link';
import { EpisodeCard } from '@/components/cards';
import { siteConfig } from '@/config/site';
import { allEpisodes, allTopics } from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Podcasts : tous les épisodes',
  description:
    'Retrouvez les épisodes Sandbox, leurs chapitres et les ressources mentionnées pendant les émissions.',
  path: '/episodes',
});

export default function EpisodesPage() {
  const episodes = allEpisodes().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const shelves = allTopics()
    .map((topic) => ({
      topic,
      episodes: episodes.filter((episode) => episode.topics.includes(topic.slug)),
    }))
    .filter(({ episodes: items }) => items.length > 0);

  return (
    <div className="wrap library-page">
      <header className="library-heading">
        <div>
          <p className="label text-ink-3">{episodes.length} épisodes</p>
          <h1 className="display">Tous les podcasts</h1>
        </div>
        <p className="library-description">
          Chaque épisode réunit la vidéo, ses chapitres et les sources consultées pour le préparer.
        </p>
      </header>

      <nav className="library-topics" aria-label="Parcourir les thèmes">
        {shelves.map(({ topic }) => (
          <a key={topic.slug} className="chip" href={`#topic-${topic.slug}`}>
            {topic.label}
          </a>
        ))}
        <a
          className="chip"
          href={siteConfig.platforms.youtube}
          target="_blank"
          rel="noopener noreferrer"
        >
          Chaîne YouTube ↗
        </a>
      </nav>

      <section className="media-shelf" aria-labelledby="all-episodes-title">
        <div className="media-shelf-heading">
          <h2 id="all-episodes-title" className="section-title">
            Tous les épisodes
          </h2>
        </div>
        {episodes.length > 0 ? (
          <div className="episode-grid">
            {episodes.map((episode) => (
              <EpisodeCard key={episode.number} episode={episode} />
            ))}
          </div>
        ) : (
          <p className="empty-note">Aucun épisode n’a encore été publié.</p>
        )}
      </section>

      {shelves.map(({ topic, episodes: items }) => (
        <section
          className="media-shelf"
          aria-labelledby={`topic-${topic.slug}-title`}
          id={`topic-${topic.slug}`}
          key={topic.slug}
        >
          <div className="media-shelf-heading">
            <div>
              <p className="label text-ink-3">{items.length} épisodes</p>
              <h2 className="section-title" id={`topic-${topic.slug}-title`}>
                {topic.label}
              </h2>
            </div>
            <Link href={`/topics/${topic.slug}`} className="shelf-link">
              Voir le thème <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="episode-rail">
            {items.map((episode) => (
              <EpisodeCard key={episode.number} episode={episode} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
