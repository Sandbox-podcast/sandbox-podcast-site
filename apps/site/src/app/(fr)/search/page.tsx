import { Text, LocalizedElement } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
import { z } from 'zod';
import { Breadcrumbs } from '@/components/ui';
import { episodeResourcePath, matchesSearch, normalizeSearch } from '@/domain/discovery';
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
import { translateText, type TranslationDictionary } from '@/i18n/translation';
export const dynamic = 'force-dynamic';
export const metadata = pageMetadata({
  title: 'Rechercher dans les podcasts et classements',
  description: 'Recherchez un épisode, une ressource, un sujet ou un classement Sandbox.',
  path: '/search',
  noindex: true,
});
interface Props {
  dictionary?: TranslationDictionary;
  searchParams: Promise<{
    q?: string | string[];
    type?: string | string[];
  }>;
}
const searchTypeSchema = z
  .enum(['all', 'episodes', 'resources', 'entities', 'charts', 'topics'])
  .catch('all');
export default async function SearchPage({ searchParams, dictionary = {} }: Props) {
  const params = await searchParams;
  const query = (Array.isArray(params.q) ? (params.q[0] ?? '') : (params.q ?? '')).slice(0, 200);
  const type = searchTypeSchema.parse(Array.isArray(params.type) ? params.type[0] : params.type);
  const needle = normalizeSearch(query);
  const includes = (...values: (string | undefined)[]): boolean =>
    needle.length > 0 &&
    matchesSearch(
      query,
      values.flatMap((value) => (value ? [value, translateText(value, dictionary)] : [])),
    );
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
        href: episodeResourcePath(episode.number, index),
        searchable: [mention.label, mention.note, mention.kind],
      })),
      ...episode.sources.map((source, index) => ({
        title: source.label,
        detail: `${episode.title} · ${source.publisher ?? source.kind}`,
        href: episodeResourcePath(episode.number, episode.mentions.length + index),
        searchable: [source.label, source.publisher, source.kind],
      })),
    ])
    .filter((resource) => includes(...resource.searchable));
  const count =
    episodes.length + entities.length + charts.length + topics.length + resources.length;
  const facets = [
    { id: 'all', label: 'Tout', count },
    { id: 'episodes', label: 'Podcasts', count: episodes.length },
    { id: 'resources', label: 'Ressources', count: resources.length },
    { id: 'charts', label: 'Classements', count: charts.length },
    { id: 'entities', label: 'Projets et modèles', count: entities.length },
    { id: 'topics', label: 'Thèmes', count: topics.length },
  ];
  const shownCount = facets.find((facet) => facet.id === type)?.count ?? count;
  return (
    <div className="wrap search-page">
      <Breadcrumbs items={[{ label: 'Recherche' }]} />
      <header className="library-heading">
        <div>
          <p className="label text-ink-3">
            <Text>{'Podcasts \u00B7 ressources \u00B7 classements'}</Text>
          </p>
          <h1 className="display">
            <Text>{'Recherche'}</Text>
          </h1>
          <p className="library-description">
            <Text>
              {'Un \u00E9pisode \u00E0 retrouver, un outil cit\u00E9, un sujet \u00E0 explorer.'}
            </Text>
          </p>
        </div>
        <LocalizedElement as="form" action="/search" role="search" className="search-page-form">
          <label className="sr-only" htmlFor="search-query">
            <Text>{'Rechercher'}</Text>
          </label>
          <LocalizedElement
            as="input"
            id="search-query"
            type="search"
            name="q"
            key={query}
            defaultValue={query}
            placeholder="Un sujet, un épisode, une source"
            maxLength={200}
          />
          <Text>{type !== 'all' ? <input type="hidden" name="type" value={type} /> : null}</Text>
          <button className="btn btn-solid" type="submit">
            <Text>{'Rechercher'}</Text>
          </button>
        </LocalizedElement>
      </header>

      <Text>
        {needle ? (
          <LocalizedElement
            as="nav"
            className="search-filters"
            aria-label="Filtrer les résultats de recherche"
          >
            <Text>
              {facets.map((facet) => (
                <Link
                  key={facet.id}
                  className="filter-pill"
                  aria-current={type === facet.id ? 'page' : undefined}
                  href={`/search?${new URLSearchParams({ q: query, ...(facet.id !== 'all' ? { type: facet.id } : {}) }).toString()}`}
                >
                  <Text>{facet.label}</Text>
                  <span>
                    <Text>{facet.count}</Text>
                  </span>
                </Link>
              ))}
            </Text>
          </LocalizedElement>
        ) : null}
      </Text>

      <Text>
        {!needle ? (
          <p className="empty-note">
            <Text>
              {
                'Saisissez au moins un mot pour rechercher dans les \u00E9pisodes, les sources cit\u00E9es et les classements.'
              }
            </Text>
          </p>
        ) : shownCount === 0 ? (
          <div className="empty-state">
            <h2>
              <Text>{'Aucun r\u00E9sultat pour "'}</Text>
              <Text>{query}</Text>
              <Text>{'".'}</Text>
            </h2>
            <p>
              <Text>{'Essayez un mot plus court ou parcourez la biblioth\u00E8que.'}</Text>
            </p>
            <div className="page-actions">
              <Link href="/episodes" className="btn">
                <Text>{'Tous les podcasts'}</Text>
              </Link>
              <Text>
                {type !== 'all' ? (
                  <Link
                    className="btn"
                    href={`/search?${new URLSearchParams({ q: query }).toString()}`}
                  >
                    <Text>{'Toutes les cat\u00E9gories'}</Text>
                  </Link>
                ) : (
                  <Link href="/search" className="btn">
                    <Text>{'Nouvelle recherche'}</Text>
                  </Link>
                )}
              </Text>
            </div>
          </div>
        ) : (
          <p className="label mb-5 text-ink-3">
            <Text>{shownCount}</Text>
            <Text>{' r\u00E9sultat'}</Text>
            <Text>{shownCount === 1 ? '' : 's'}</Text>
            <Text>{' pour "'}</Text>
            <Text>{query}</Text>
            <Text>{'"'}</Text>
          </p>
        )}
      </Text>

      <Text>
        {!needle ? (
          <section className="search-suggestions" aria-labelledby="search-suggestions">
            <h2 id="search-suggestions">
              <Text>{'Explorer par th\u00E8me'}</Text>
            </h2>
            <div className="library-filters">
              <Text>
                {allTopics().map((topic) => (
                  <Link className="filter-pill" href={`/topics/${topic.slug}`} key={topic.slug}>
                    <Text>{topic.label}</Text>
                  </Link>
                ))}
              </Text>
            </div>
          </section>
        ) : null}
      </Text>

      <Text>
        {episodes.length > 0 && (type === 'all' || type === 'episodes') ? (
          <section className="search-results" aria-labelledby="search-episodes">
            <h2 id="search-episodes" className="section-title">
              <Text>{'Podcasts '}</Text>
              <span>
                <Text>{episodes.length}</Text>
              </span>
            </h2>
            <Text>
              {episodes.map((episode) => (
                <Link
                  key={episode.number}
                  className="search-result"
                  href={`/episodes/${String(episode.number)}`}
                >
                  <span className="search-result-kicker">
                    <Text>{'\u00C9pisode '}</Text>
                    <Text>{episode.number}</Text>
                  </span>
                  <span className="search-result-title">
                    <Text>{episode.title}</Text>
                  </span>
                  <span className="search-result-detail">
                    <Text>{episode.dek}</Text>
                  </span>
                </Link>
              ))}
            </Text>
          </section>
        ) : null}
      </Text>

      <Text>
        {resources.length > 0 && (type === 'all' || type === 'resources') ? (
          <section className="search-results" aria-labelledby="search-resources">
            <h2 id="search-resources" className="section-title">
              <Text>{'Sources et ressources '}</Text>
              <span>
                <Text>{resources.length}</Text>
              </span>
            </h2>
            <Text>
              {resources.map((resource, index) => (
                <Link
                  key={`${resource.href}-${resource.title}-${String(index)}`}
                  className="search-result"
                  href={resource.href}
                >
                  <span className="search-result-title">
                    <Text>{resource.title}</Text>
                  </span>
                  <span className="search-result-detail">
                    <Text>{resource.detail}</Text>
                  </span>
                </Link>
              ))}
            </Text>
          </section>
        ) : null}
      </Text>

      <Text>
        {entities.length > 0 && (type === 'all' || type === 'entities') ? (
          <section className="search-results" aria-labelledby="search-entities">
            <h2 id="search-entities" className="section-title">
              <Text>{'Projets, mod\u00E8les et outils '}</Text>
              <span>
                <Text>{entities.length}</Text>
              </span>
            </h2>
            <Text>
              {entities.map((entity) => (
                <Link key={entity.slug} className="search-result" href={entityPath(entity)}>
                  <span className="search-result-title">
                    <Text>{entity.name}</Text>
                  </span>
                  <span className="search-result-detail">
                    <Text>{entity.tagline}</Text>
                  </span>
                </Link>
              ))}
            </Text>
          </section>
        ) : null}
      </Text>

      <Text>
        {charts.length > 0 && (type === 'all' || type === 'charts') ? (
          <section className="search-results" aria-labelledby="search-charts">
            <h2 id="search-charts" className="section-title">
              <Text>{'Classements '}</Text>
              <span>
                <Text>{charts.length}</Text>
              </span>
            </h2>
            <Text>
              {charts.map((chart) => (
                <Link key={chart.slug} className="search-result" href={`/charts/${chart.slug}`}>
                  <span className="search-result-title">
                    <Text>{chart.title}</Text>
                  </span>
                  <span className="search-result-detail">
                    <Text>{chart.tagline}</Text>
                  </span>
                </Link>
              ))}
            </Text>
          </section>
        ) : null}
      </Text>

      <Text>
        {topics.length > 0 && (type === 'all' || type === 'topics') ? (
          <section className="search-results" aria-labelledby="search-topics">
            <h2 id="search-topics" className="section-title">
              <Text>{'Th\u00E8mes '}</Text>
              <span>
                <Text>{topics.length}</Text>
              </span>
            </h2>
            <Text>
              {topics.map((topic) => (
                <Link key={topic.slug} className="search-result" href={`/topics/${topic.slug}`}>
                  <span className="search-result-title">
                    <Text>{topic.label}</Text>
                  </span>
                  <span className="search-result-detail">
                    <Text>{topic.description}</Text>
                  </span>
                </Link>
              ))}
            </Text>
          </section>
        ) : null}
      </Text>
    </div>
  );
}
