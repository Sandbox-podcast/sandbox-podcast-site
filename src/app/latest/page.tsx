import { EpisodeCard, StoryCard } from '@/components/cards';
import { LatestFeed, type FeedEntry } from '@/components/latest-feed';
import { STORY_TYPE_LABEL } from '@/components/ui';
import { feed } from '@/lib/graph';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Latest : épisodes, analyses, news et benchmarks',
  description:
    'Le fil de tout ce que nous publions : épisodes, analyses, expériences, benchmarks, guides, opinions et récaps.',
  path: '/latest',
});

const FILTERS = [
  { kind: 'episode', label: 'Episodes' },
  ...Object.entries(STORY_TYPE_LABEL).map(([kind, label]) => ({ kind, label })),
];

export default function LatestPage() {
  const entries: FeedEntry[] = feed().map((item) =>
    item.type === 'episode'
      ? {
          id: `e${String(item.episode.number)}`,
          kind: 'episode',
          label: 'Episode',
          node: <EpisodeCard episode={item.episode} />,
        }
      : {
          id: item.story.slug,
          kind: item.story.type,
          label: item.story.type,
          node: <StoryCard story={item.story} />,
        },
  );
  return (
    <div className="wrap pt-6">
      <header className="mb-10">
        <p className="label mb-3 text-ink-2">{entries.length} contenus</p>
        <h1 className="display" style={{ fontSize: 'clamp(3.5rem, 12vw, 9rem)' }}>
          Latest
        </h1>
        <p className="mt-4 max-w-3xl font-serif text-xl leading-snug md:text-2xl">
          Épisodes et articles, du plus récent au plus ancien. Chaque contenu est relié aux
          classements et aux fiches dont il parle.
        </p>
      </header>
      <LatestFeed entries={entries} filters={FILTERS} />
    </div>
  );
}
