'use client';

import Link from 'next/link';
import { useDeferredValue, useState, type ReactNode } from 'react';
import { discoverEpisodes, type DiscoverableEpisode, type EpisodeSort } from '@/domain/discovery';

export function EpisodeLibrary({
  entries,
  topics,
}: {
  entries: (DiscoverableEpisode & { node: ReactNode })[];
  topics: { slug: string; label: string }[];
}) {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('all');
  const [sort, setSort] = useState<EpisodeSort>('newest');
  const deferredQuery = useDeferredValue(query);
  const visible = discoverEpisodes(entries, { query: deferredQuery, topic, sort });
  const filtered = query.trim().length > 0 || topic !== 'all';
  function reset(): void {
    setQuery('');
    setTopic('all');
  }
  return (
    <section className="episode-browser" aria-label="Bibliothèque des épisodes">
      <div className="library-toolbar">
        <label className="library-search">
          <span className="field-label">Trouver un épisode</span>
          <input
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
          <span className="field-label">Trier par</span>
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as EpisodeSort);
            }}
            aria-controls="episode-results"
          >
            <option value="newest">Les plus récents</option>
            <option value="oldest">Les plus anciens</option>
            <option value="shortest">Les plus courts</option>
          </select>
        </label>
      </div>
      <div className="library-filters" role="group" aria-label="Filtrer les épisodes par thème">
        <button
          type="button"
          className="filter-pill"
          aria-pressed={topic === 'all'}
          onClick={() => {
            setTopic('all');
          }}
        >
          Tous les thèmes
        </button>
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
            {item.label}
          </button>
        ))}
      </div>
      <div className="library-results-heading">
        <p role="status" aria-live="polite">
          {visible.length} épisode{visible.length === 1 ? '' : 's'}
          {filtered ? ' trouvé' + (visible.length === 1 ? '' : 's') : ''}
        </p>
        {filtered ? (
          <button type="button" className="text-action" onClick={reset}>
            Effacer les filtres
          </button>
        ) : (
          <Link href="/topics" className="text-action">
            Explorer les thèmes
          </Link>
        )}
      </div>
      <div id="episode-results" aria-busy={query !== deferredQuery}>
        {visible.length > 0 ? (
          <div className="episode-grid">
            {visible.map((entry) => (
              <div key={entry.number}>{entry.node}</div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>
              {entries.length === 0
                ? 'Les prochains épisodes arrivent ici.'
                : 'Aucun épisode trouvé'}
            </h2>
            <p>
              {entries.length === 0
                ? 'Retrouvez bientôt les vidéos, leurs chapitres et leurs ressources.'
                : 'Essayez un autre mot ou un autre thème.'}
            </p>
            {filtered ? (
              <button type="button" className="btn" onClick={reset}>
                Voir tous les épisodes
              </button>
            ) : null}
            <Link href="/search" className="text-action">
              Rechercher dans tout le site
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
