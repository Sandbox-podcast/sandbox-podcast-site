'use client';
import { Text, LocalizedElement, useLocalization } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
import { useDeferredValue, useEffect, useState, type ReactNode } from 'react';
import { discoverEpisodes, type DiscoverableEpisode, type EpisodeSort } from '@/domain/discovery';
import { episodeSelectionQuery, type EpisodeSelection } from '@/domain/episode-selection';
export function EpisodeLibrary({
  entries,
  topics,
  initialSelection,
}: {
  entries: (DiscoverableEpisode & {
    node: ReactNode;
  })[];
  topics: {
    slug: string;
    label: string;
  }[];
  initialSelection?: EpisodeSelection;
}) {
  const [query, setQuery] = useState(initialSelection?.q ?? '');
  const [topic, setTopic] = useState(
    topics.some((item) => item.slug === initialSelection?.topic)
      ? (initialSelection?.topic ?? 'all')
      : 'all',
  );
  const [sort, setSort] = useState<EpisodeSort>(initialSelection?.sort ?? 'newest');
  const deferredQuery = useDeferredValue(query);
  const { t } = useLocalization();
  useEffect(() => {
    const url = new URL(window.location.href);
    const search = episodeSelectionQuery(url.search, { q: query, topic, sort });
    if (url.search.slice(1) === search) return;
    url.search = search;
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }, [query, topic, sort]);
  const searchableEntries = entries.map((entry) => ({
    ...entry,
    searchable: entry.searchable.flatMap((text) => [text, t(text)]),
  }));
  const visible = discoverEpisodes(searchableEntries, { query: deferredQuery, topic, sort });
  const filtered = query.trim().length > 0 || topic !== 'all';
  function reset(): void {
    setQuery('');
    setTopic('all');
  }
  return (
    <LocalizedElement
      as="section"
      className="episode-browser"
      aria-label="Bibliothèque des épisodes"
    >
      <div className="library-toolbar">
        <label className="library-search">
          <span className="field-label">
            <Text>{'Trouver un \u00E9pisode'}</Text>
          </span>
          <LocalizedElement
            as="input"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="Titre, sujet ou ressource"
            aria-controls="episode-results"
          />
        </label>
        <label className="library-sort">
          <span className="field-label">
            <Text>{'Trier par'}</Text>
          </span>
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as EpisodeSort);
            }}
            aria-controls="episode-results"
          >
            <option value="newest">
              <Text>{'Les plus r\u00E9cents'}</Text>
            </option>
            <option value="oldest">
              <Text>{'Les plus anciens'}</Text>
            </option>
            <option value="shortest">
              <Text>{'Les plus courts'}</Text>
            </option>
          </select>
        </label>
      </div>
      <LocalizedElement
        as="div"
        className="library-filters"
        role="group"
        aria-label="Filtrer les épisodes par thème"
      >
        <button
          type="button"
          className="filter-pill"
          aria-pressed={topic === 'all'}
          onClick={() => {
            setTopic('all');
          }}
        >
          <Text>{'Tous les th\u00E8mes'}</Text>
        </button>
        <Text>
          {topics.map((item) => (
            <button
              key={item.slug}
              type="button"
              className="filter-pill"
              aria-pressed={topic === item.slug}
              onClick={() => {
                setTopic(item.slug);
              }}
            >
              <Text>{item.label}</Text>
            </button>
          ))}
        </Text>
      </LocalizedElement>
      <div className="library-results-heading">
        <p role="status" aria-live="polite">
          <Text values={{ count: visible.length }}>
            {filtered
              ? visible.length === 1
                ? '{count} épisode trouvé'
                : '{count} épisodes trouvés'
              : visible.length === 1
                ? '{count} épisode'
                : '{count} épisodes'}
          </Text>
        </p>
        <Text>
          {filtered ? (
            <button type="button" className="text-action" onClick={reset}>
              <Text>{'Effacer les filtres'}</Text>
            </button>
          ) : (
            <Link href="/topics" className="text-action">
              <Text>{'Explorer les th\u00E8mes'}</Text>
            </Link>
          )}
        </Text>
      </div>
      <div id="episode-results" aria-busy={query !== deferredQuery}>
        <Text>
          {visible.length > 0 ? (
            <div className="episode-grid">
              <Text>
                {visible.map((entry) => (
                  <div key={entry.number}>
                    <Text>{entry.node}</Text>
                  </div>
                ))}
              </Text>
            </div>
          ) : (
            <div className="empty-state">
              <h2>
                <Text>
                  {entries.length === 0
                    ? 'Les prochains épisodes arrivent ici.'
                    : 'Aucun épisode trouvé'}
                </Text>
              </h2>
              <p>
                <Text>
                  {entries.length === 0
                    ? 'Retrouvez bientôt les vidéos, leurs chapitres et leurs ressources.'
                    : 'Essayez un autre mot ou un autre thème.'}
                </Text>
              </p>
              <Text>
                {filtered ? (
                  <button type="button" className="btn" onClick={reset}>
                    <Text>{'Voir tous les \u00E9pisodes'}</Text>
                  </button>
                ) : null}
              </Text>
              <Link href="/search" className="text-action">
                <Text>{'Rechercher dans tout le site'}</Text>
              </Link>
            </div>
          )}
        </Text>
      </div>
    </LocalizedElement>
  );
}
