import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EntityCard, EpisodeCard, StoryCard } from '@/components/cards';
import { SectionHead } from '@/components/ui';
import { allEntities, allEpisodes, allStories, allTopics, findTopic } from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return allTopics().map((t) => ({ slug: t.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const topic = findTopic(slug);
  if (!topic) return {};
  return pageMetadata({
    title: `${topic.label} : épisodes, articles et fiches`,
    description: topic.description,
    path: `/topics/${topic.slug}`,
  });
}

export default async function TopicPage({ params }: Props) {
  const { slug } = await params;
  const topic = findTopic(slug);
  if (!topic) notFound();
  const stories = allStories().filter((s) => s.topics.includes(slug));
  const episodes = allEpisodes().filter((e) => e.topics.includes(slug));
  const entities = allEntities().filter((e) => e.topics.includes(slug));
  return (
    <div className="wrap pt-6">
      <nav aria-label="Fil d’Ariane" className="label mb-5 text-ink-2">
        <Link href="/topics" className="underline decoration-2 underline-offset-4">
          Topics
        </Link>{' '}
        / {topic.label}
      </nav>
      <header className="mb-12">
        <h1 className="display" style={{ fontSize: 'clamp(3.5rem, 12vw, 9rem)' }}>
          {topic.label}
        </h1>
        <p className="mt-4 max-w-3xl font-serif text-xl leading-snug md:text-2xl">
          {topic.description}
        </p>
      </header>
      <div className="grid gap-16">
        {stories.length > 0 ? (
          <section aria-labelledby="t-stories">
            <SectionHead
              kicker={`${String(stories.length)} contenus`}
              title="Articles"
              id="t-stories"
            />
            <div className="grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
              {stories.map((s) => (
                <StoryCard key={s.slug} story={s} />
              ))}
            </div>
          </section>
        ) : null}
        {episodes.length > 0 ? (
          <section aria-labelledby="t-episodes">
            <SectionHead
              kicker={`${String(episodes.length)} épisodes`}
              title="Épisodes"
              id="t-episodes"
            />
            <div className="grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
              {episodes.map((e) => (
                <EpisodeCard key={e.number} episode={e} />
              ))}
            </div>
          </section>
        ) : null}
        {entities.length > 0 ? (
          <section aria-labelledby="t-entities">
            <SectionHead
              kicker={`${String(entities.length)} fiches`}
              title="Projets et modèles"
              id="t-entities"
            />
            <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {entities.map((e) => (
                <EntityCard key={e.slug} entity={e} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
