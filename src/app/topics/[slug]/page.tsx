import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EpisodeCard } from '@/components/cards';
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
      <nav aria-label="Fil d’Ariane" className="label mb-5 text-ink-2">
        <Link href="/episodes" className="underline decoration-2 underline-offset-4">
          Podcasts
        </Link>{' '}
        / {topic.label}
      </nav>
      <header className="library-heading">
        <div>
          <p className="label text-ink-3">
            {episodes.length} épisode{episodes.length === 1 ? '' : 's'}
          </p>
          <h1 className="display">{topic.label}</h1>
        </div>
        <p className="library-description">{topic.description}</p>
      </header>
      {episodes.length > 0 ? (
        <div className="episode-grid">
          {episodes.map((episode) => (
            <EpisodeCard key={episode.number} episode={episode} />
          ))}
        </div>
      ) : (
        <p className="empty-note">Aucun épisode n’est encore classé dans ce thème.</p>
      )}
    </div>
  );
}
