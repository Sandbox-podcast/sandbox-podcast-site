import Link from 'next/link';
import {
  allCharts,
  allEntities,
  allEpisodes,
  allTopics,
  entityPath,
  getHost,
  getTopic,
} from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = pageMetadata({
  title: 'Rechercher dans les podcasts et classements',
  description: 'Recherchez un épisode, une ressource, un sujet ou un classement Sandbox.',
  path: '/search',
  noindex: true,
});

interface Props {
  searchParams: Promise<{ q?: string | string[] }>;
}

const normalize = (value: string): string =>
  value
    .trim()
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = Array.isArray(params.q) ? (params.q[0] ?? '') : (params.q ?? '');
  const needle = normalize(query);
  const includes = (...values: (string | undefined)[]): boolean =>
    needle.length > 0 && values.some((value) => value && normalize(value).includes(needle));
  const episodes = allEpisodes().filter((episode) =>
    includes(
      episode.title,
      episode.dek,
      episode.description,
      ...episode.hosts.map((slug) => getHost(slug).name),
      ...episode.topics.map((slug) => getTopic(slug).label),
      ...episode.mentions.flatMap((mention) => [mention.label, mention.note]),
      ...episode.sources.flatMap((source) => [source.label, source.publisher]),
    ),
  );
  const entities = allEntities().filter((entity) =>
    includes(entity.name, entity.org, entity.category, entity.tagline, entity.description),
  );
  const charts = allCharts().filter((chart) =>
    includes(chart.title, chart.short, chart.tagline, chart.description),
  );
  const topics = allTopics().filter((topic) => includes(topic.label, topic.description));
  const resources = allEpisodes()
    .flatMap((episode) => [
      ...episode.mentions.map((mention, index) => ({
        title: mention.label,
        detail: `${episode.title} · ${mention.kind}${mention.at === undefined ? '' : ` · ${String(Math.floor(mention.at / 60))} min`}`,
        href: `/episodes/${String(episode.number)}#resource-${String(index)}`,
        searchable: [mention.label, mention.note, mention.kind],
      })),
      ...episode.sources.map((source) => ({
        title: source.label,
        detail: `${episode.title} · ${source.publisher ?? source.kind}`,
        href: `/episodes/${String(episode.number)}#mentions`,
        searchable: [source.label, source.publisher, source.kind],
      })),
    ])
    .filter((resource) => includes(...resource.searchable));
  const count =
    episodes.length + entities.length + charts.length + topics.length + resources.length;

  return (
    <div className="wrap search-page">
      <header className="library-heading">
        <div>
          <p className="label text-ink-3">Podcasts · ressources · classements</p>
          <h1 className="display">Recherche</h1>
        </div>
        <form action="/search" role="search" className="search-page-form">
          <label className="sr-only" htmlFor="search-query">
            Rechercher
          </label>
          <input
            id="search-query"
            type="search"
            name="q"
            value={query}
            placeholder="Un sujet, un épisode, une source…"
          />
          <button className="btn btn-solid" type="submit">
            Rechercher
          </button>
        </form>
      </header>

      {!needle ? (
        <p className="empty-note">
          Saisissez au moins un mot pour rechercher dans les épisodes, les sources citées et les
          classements.
        </p>
      ) : count === 0 ? (
        <p className="empty-note">Aucun résultat pour « {query} ».</p>
      ) : (
        <p className="label mb-5 text-ink-3">
          {count} résultat{count === 1 ? '' : 's'} pour « {query} »
        </p>
      )}

      {episodes.length > 0 ? (
        <section className="search-results" aria-labelledby="search-episodes">
          <h2 id="search-episodes" className="section-title">
            Podcasts <span>{episodes.length}</span>
          </h2>
          {episodes.map((episode) => (
            <Link
              key={episode.number}
              className="search-result"
              href={`/episodes/${String(episode.number)}`}
            >
              <span className="search-result-kicker">Épisode {episode.number}</span>
              <span className="search-result-title">{episode.title}</span>
              <span className="search-result-detail">{episode.dek}</span>
            </Link>
          ))}
        </section>
      ) : null}

      {resources.length > 0 ? (
        <section className="search-results" aria-labelledby="search-resources">
          <h2 id="search-resources" className="section-title">
            Sources et ressources <span>{resources.length}</span>
          </h2>
          {resources.map((resource, index) => (
            <Link
              key={`${resource.href}-${resource.title}-${String(index)}`}
              className="search-result"
              href={resource.href}
            >
              <span className="search-result-title">{resource.title}</span>
              <span className="search-result-detail">{resource.detail}</span>
            </Link>
          ))}
        </section>
      ) : null}

      {entities.length > 0 ? (
        <section className="search-results" aria-labelledby="search-entities">
          <h2 id="search-entities" className="section-title">
            Projets, modèles et outils <span>{entities.length}</span>
          </h2>
          {entities.map((entity) => (
            <Link key={entity.slug} className="search-result" href={entityPath(entity)}>
              <span className="search-result-title">{entity.name}</span>
              <span className="search-result-detail">{entity.tagline}</span>
            </Link>
          ))}
        </section>
      ) : null}

      {charts.length > 0 ? (
        <section className="search-results" aria-labelledby="search-charts">
          <h2 id="search-charts" className="section-title">
            Classements <span>{charts.length}</span>
          </h2>
          {charts.map((chart) => (
            <Link key={chart.slug} className="search-result" href={`/charts/${chart.slug}`}>
              <span className="search-result-title">{chart.title}</span>
              <span className="search-result-detail">{chart.tagline}</span>
            </Link>
          ))}
        </section>
      ) : null}

      {topics.length > 0 ? (
        <section className="search-results" aria-labelledby="search-topics">
          <h2 id="search-topics" className="section-title">
            Thèmes <span>{topics.length}</span>
          </h2>
          {topics.map((topic) => (
            <Link key={topic.slug} className="search-result" href={`/topics/${topic.slug}`}>
              <span className="search-result-title">{topic.label}</span>
              <span className="search-result-detail">{topic.description}</span>
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
