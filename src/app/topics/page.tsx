import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';
import { topicStats } from '@/lib/graph';

export const metadata = pageMetadata({
  title: 'Topics : les grands thèmes du podcast',
  description:
    'Agents, coding, open source, benchmarks, MCP, modèles, infra : tous les contenus du podcast classés par thème.',
  path: '/topics',
});

export default function TopicsPage() {
  const topics = topicStats();
  return (
    <div className="wrap pt-6">
      <header className="mb-10">
        <p className="label mb-3 text-ink-2">{topics.length} thèmes</p>
        <h1 className="display" style={{ fontSize: 'clamp(3.5rem, 12vw, 9rem)' }}>
          Topics
        </h1>
        <p className="mt-4 max-w-3xl font-serif text-xl leading-snug md:text-2xl">
          Chaque thème rassemble les épisodes, les articles et les fiches qui le concernent.
        </p>
      </header>
      <ul className="m-0 grid list-none gap-px border-2 border-ink bg-ink p-0 sm:grid-cols-2 lg:grid-cols-4">
        {topics.map(({ topic, stories, episodes, entities }) => (
          <li
            key={topic.slug}
            className="relative flex min-h-56 flex-col gap-2 bg-paper p-4 hover:bg-hl hover:text-on-hl"
          >
            <h2 className="display text-3xl">
              <Link href={`/topics/${topic.slug}`} className="after:absolute after:inset-0">
                {topic.label}
              </Link>
            </h2>
            <p className="text-sm opacity-80">{topic.description}</p>
            <p className="label mt-auto flex flex-wrap gap-x-4 gap-y-1">
              <span>{stories} articles</span>
              <span>{episodes} épisodes</span>
              <span>{entities} fiches</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
