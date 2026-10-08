import { Text, LocalizedElement } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
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
  params: Promise<{
    slug: string;
  }>;
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
            <Text>{episodes.length}</Text>
            <Text>{' \u00E9pisode'}</Text>
            <Text>{episodes.length === 1 ? '' : 's'}</Text>
          </p>
          <h1 className="display">
            <Text>{topic.label}</Text>
          </h1>
        </div>
        <p className="library-description">
          <Text>{topic.description}</Text>
        </p>
      </header>
      <LocalizedElement
        as="nav"
        className="library-filters"
        aria-label="Explorer les autres thèmes"
      >
        <Text>
          {allTopics().map((item) => (
            <Link
              key={item.slug}
              className="filter-pill"
              href={`/topics/${item.slug}`}
              aria-current={item.slug === slug ? 'page' : undefined}
            >
              <Text>{item.label}</Text>
            </Link>
          ))}
        </Text>
      </LocalizedElement>
      <Text>
        {episodes.length > 0 ? (
          <div className="episode-grid">
            <Text>
              {episodes.map((episode) => (
                <EpisodeCard key={episode.number} episode={episode} />
              ))}
            </Text>
          </div>
        ) : (
          <div className="empty-state">
            <h2>
              <Text>{'Aucun \u00E9pisode dans ce th\u00E8me pour le moment.'}</Text>
            </h2>
            <p>
              <Text>{'Explorez les autres sujets de la biblioth\u00E8que.'}</Text>
            </p>
            <Link href="/episodes" className="btn">
              <Text>{'Tous les podcasts'}</Text>
            </Link>
          </div>
        )}
      </Text>
    </div>
  );
}
