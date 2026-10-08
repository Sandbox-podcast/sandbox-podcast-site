import { Text } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
import { EpisodeCard } from '@/components/cards';
import { EpisodeLibrary } from '@/components/episode-library';
import { siteConfig } from '@/config/site';
import { allEpisodes, allTopics, getTopic } from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';
import { episodeSelectionSchema } from '@/domain/episode-selection';

interface Props {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams = Promise.resolve({}) }: Props = {}) {
  const query = await searchParams;
  return pageMetadata({
    title: 'Podcasts : tous les épisodes',
    description:
      'Retrouvez les épisodes Sandbox, leurs chapitres et les ressources mentionnées pendant les émissions.',
    path: '/episodes',
    noindex: ['q', 'topic', 'sort'].some((key) => query[key] !== undefined),
  });
}

export default async function EpisodesPage({ searchParams = Promise.resolve({}) }: Props = {}) {
  const selection = episodeSelectionSchema.parse(await searchParams);
  const episodes = allEpisodes().toSorted((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const topics = allTopics().filter((topic) =>
    episodes.some((episode) => episode.topics.includes(topic.slug)),
  );
  return (
    <div className="wrap library-page">
      <header className="library-heading">
        <div>
          <p className="eyebrow">
            <Text>{'La biblioth\u00E8que Sandbox'}</Text>
          </p>
          <h1 className="display">
            <Text>{'Tous les podcasts.'}</Text>
          </h1>
          <p className="library-description">
            <Text>
              {
                "La tech et l'IA, \u00E9pisode par \u00E9pisode. La vid\u00E9o, les chapitres et tous les liens cit\u00E9s au m\u00EAme endroit."
              }
            </Text>
          </p>
        </div>
        <div className="page-actions">
          <Link href="/search" className="btn">
            <Text>{'Recherche globale'}</Text>
          </Link>
          <a
            className="btn"
            href={siteConfig.platforms.youtube}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Text>{'Cha\u00EEne YouTube '}</Text>
            <span className="sr-only">
              <Text>{'(nouvel onglet)'}</Text>
            </span>
            <span aria-hidden="true">
              <Text>{'\u2197'}</Text>
            </span>
          </a>
        </div>
      </header>
      <EpisodeLibrary
        initialSelection={selection}
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
