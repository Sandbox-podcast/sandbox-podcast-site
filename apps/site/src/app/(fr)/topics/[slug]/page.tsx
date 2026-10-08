import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EpisodeCard } from '@/components/cards';
import { Breadcrumbs } from '@/components/ui';
import { allEpisodes, allTopics, findTopic } from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return allTopics().map((topic) => ({ slug: topic.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const topic = findTopic(slug);
  if (!topic) return {};
  return pageMetadata({
    title: `${topic.label} : les épisodes du podcast`,
    description: topic.description,
    path: `/topics/${topic.slug}`,
  });
}

export default async function TopicPage({ params }: Props) {
  const { slug } = await params;
  const topic = findTopic(slug);
  if (!topic) notFound();
  const episodes = allEpisodes()
    .filter((episode) => episode.topics.includes(slug))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return (
    <div className="wrap library-page">
      <Breadcrumbs
        items={[
          { label: 'Podcasts', href: '/episodes' },
          { label: 'Thèmes', href: '/topics' },
          { label: topic.label },
        ]}
      />
      <header className="library-heading">
        <div>
          <p className="label text-ink-3">
            {episodes.length} épisode{episodes.length === 1 ? '' : 's'}
          </p>
          <h1 className="display">{topic.label}</h1>
        </div>
        <p className="library-description">{topic.description}</p>
      </header>
      <nav className="library-filters" aria-label="Explorer les autres thèmes">
        {allTopics().map((item) => (
          <Link
            key={item.slug}
            className="filter-pill"
            href={`/topics/${item.slug}`}
            aria-current={item.slug === slug ? 'page' : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {episodes.length > 0 ? (
        <div className="episode-grid">
          {episodes.map((episode) => (
            <EpisodeCard key={episode.number} episode={episode} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>Aucun épisode dans ce thème pour le moment.</h2>
          <p>Explorez les autres sujets de la bibliothèque.</p>
          <Link href="/episodes" className="btn">
            Tous les podcasts
          </Link>
        </div>
      )}
    </div>
  );
}
