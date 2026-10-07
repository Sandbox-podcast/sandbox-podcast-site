import Link from 'next/link';
import { allEpisodes, allTopics } from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Explorer les podcasts par thème',
  description:
    'Parcourez les épisodes Sandbox par sujet : IA, développement, modèles ouverts et outils.',
  path: '/topics',
});

export default function TopicsPage() {
  const episodes = allEpisodes();
  const topics = allTopics().map((topic) => ({
    topic,
    count: episodes.filter((episode) => episode.topics.includes(topic.slug)).length,
  }));

  return (
    <div className="wrap library-page">
      <header className="library-heading">
        <div>
          <p className="label text-ink-3">Explorer la bibliothèque</p>
          <h1 className="display">Par thème</h1>
        </div>
        <p className="library-description">
          Retrouvez les épisodes qui parlent des sujets qui vous intéressent.
        </p>
      </header>
      <ul className="topic-catalog">
        {topics.map(({ topic, count }) => (
          <li key={topic.slug}>
            <Link href={`/topics/${topic.slug}`} className="topic-catalog-link">
              <span className="topic-catalog-copy">
                <span className="topic-catalog-label">{topic.label}</span>
                <span className="topic-catalog-description">{topic.description}</span>
              </span>
              <span className="topic-catalog-count">
                {count} épisode{count > 1 ? 's' : ''} <span aria-hidden="true">→</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
