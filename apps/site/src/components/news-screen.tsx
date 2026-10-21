'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  newsFeedSchema,
  newsSentence,
  newsSynopsis,
  selectNews,
  NEWS_PAGE_SIZE,
  uniqueNews,
  type NewsFeed,
} from '@/domain/news-preview';
import { newsCollectionLd } from '@/domain/news-seo';
import { JsonLd } from './json-ld';
import styles from './news-screen.module.css';
import { NEWS_MEDIA } from '@/domain/news-media';

const COPY = {
  'fr-FR': {
    title: "L'actualité IA pour les équipes tech.",
    subtitle:
      'Les annonces en IA et en développement, avec un résumé et un lien vers chaque source pour préparer tes prochains essais.',
    section: 'SANDBOX / ACTUALITÉ',
    readArticle: "Lire l'article",
    all: 'Tout le fil',
    development: 'Développement',
    agents: 'Agents IA',
    models: 'Modèles',
    'open-source': 'Open source',
    search: 'Rechercher une actualité',
    sort: 'Trier',
    categories: 'Catégories',
    filters: 'Filtres',
    balanced: 'Fil diversifié',
    source: 'Média',
    allSources: 'Tous les médias',
    bySource: 'Par média',
    unknownTime: 'heure non publiée',
    sourceStatus: 'État des sources',
    available: 'Accessible',
    uses: 'Usages et outils',
    business: 'Entreprises',
    research: 'Recherche',
    society: 'Société',
    placeholder: 'Un sujet, un outil, un média...',
    refresh: 'Actualiser',
    loading: 'Collecte en cours',
    recent: 'Les plus récentes',
    stable: 'Versions stables en premier',
    time: 'Publication (Paris)',
    news: 'Information / source',
    empty: 'Aucune actualité ne correspond à cette recherche.',
    waiting: 'Aucune actualité récente disponible. Le fil attend la prochaine collecte.',
    clear: 'Effacer les filtres',
    more: 'Afficher la suite',
    preview: 'Aperçu local',
    automatic: 'Mise à jour automatique',
    note: 'Les titres et synthèses sont générés à partir des extraits publics des médias cités, puis traduits. Ouvre la source pour vérifier les faits.',
    home: 'Accueil',
    updated: 'Dernière mise à jour',
    published: 'Dernière publication sur le site',
    collected: 'Dernière collecte des sources',
    collectionNote:
      'Collecte prévue chaque heure. Seuls les articles qui passent les contrôles sont publiés.',
    unpublished: 'Date non disponible',
    uncollected: 'Aucune collecte enregistrée',
    results: 'résultats',
    result: 'résultat',
    failed: 'Collecte partielle. Les publications déjà reçues restent disponibles.',
    unavailable: 'Collecte indisponible. Réessayez dans un instant.',
  },
  en: {
    title: 'AI news for tech teams.',
    section: 'SANDBOX / NEWS',
    readArticle: 'Read the article',
    subtitle:
      'AI and development announcements, with a summary and a link to each source to help you plan your next experiments.',
    all: 'All topics',
    development: 'Development',
    agents: 'AI agents',
    models: 'Models',
    'open-source': 'Open source',
    search: 'Search AI news',
    sort: 'Sort',
    categories: 'Categories',
    filters: 'Filters',
    balanced: 'Mixed by publisher',
    source: 'Publisher',
    allSources: 'All publishers',
    bySource: 'By publisher',
    unknownTime: 'time not published',
    sourceStatus: 'Source status',
    available: 'Available',
    uses: 'Uses and tools',
    business: 'Business',
    research: 'Research',
    society: 'Society',
    placeholder: 'A topic, a tool, a publisher...',
    refresh: 'Refresh',
    loading: 'Collecting',
    recent: 'Most recent',
    stable: 'Stable versions first',
    time: 'Published (Paris)',
    news: 'News item / source',
    empty: 'No news matches your search.',
    waiting: 'No recent news is available. The feed is waiting for the next collection.',
    clear: 'Clear filters',
    more: 'Show more',
    preview: 'Local preview',
    automatic: 'Automatic updates',
    note: 'Headlines and summaries are generated from public excerpts published by the cited outlets, then translated. Follow the source link to check the facts.',
    home: 'Home',
    updated: 'Last update',
    published: 'Last publication on the site',
    collected: 'Last source collection',
    collectionNote:
      'Collection is scheduled hourly. Only articles that pass the checks are published.',
    unpublished: 'Date unavailable',
    uncollected: 'No collection recorded',
    results: 'results',
    result: 'result',
    failed: 'Partial collection. Previously received publications remain available.',
    unavailable: 'Collection unavailable. Try again shortly.',
  },
  'es-ES': {
    title: 'Actualidad de IA para equipos de tecnología.',
    section: 'SANDBOX / NOTICIAS',
    readArticle: 'Leer el artículo',
    subtitle:
      'Anuncios de IA y desarrollo, con un resumen y un enlace a cada fuente para preparar tus próximas pruebas.',
    all: 'Todos los temas',
    development: 'Desarrollo',
    agents: 'Agentes IA',
    models: 'Modelos',
    'open-source': 'Código abierto',
    search: 'Buscar noticias de IA',
    sort: 'Ordenar',
    categories: 'Categorías',
    filters: 'Filtros',
    balanced: 'Mezcla de medios',
    source: 'Medio',
    allSources: 'Todos los medios',
    bySource: 'Por medio',
    unknownTime: 'hora no publicada',
    sourceStatus: 'Estado de las fuentes',
    available: 'Disponible',
    uses: 'Usos y herramientas',
    business: 'Empresas',
    research: 'Investigación',
    society: 'Sociedad',
    placeholder: 'Un tema, una herramienta, un medio...',
    refresh: 'Actualizar',
    loading: 'Recopilando',
    recent: 'Más recientes',
    stable: 'Versiones estables primero',
    time: 'Publicación (París)',
    news: 'Noticia / fuente',
    empty: 'No hay noticias para esta búsqueda.',
    waiting: 'No hay noticias recientes disponibles. El flujo espera la próxima recopilación.',
    clear: 'Borrar filtros',
    more: 'Mostrar más',
    preview: 'Vista previa local',
    automatic: 'Actualización automática',
    note: 'Los titulares y resúmenes se generan a partir de extractos públicos de los medios citados y después se traducen. Abre la fuente para comprobar los datos.',
    home: 'Inicio',
    updated: 'Última actualización',
    published: 'Última publicación en el sitio',
    collected: 'Última recopilación de fuentes',
    collectionNote:
      'Recopilación prevista cada hora. Solo se publican los artículos que superan los controles.',
    unpublished: 'Fecha no disponible',
    uncollected: 'No hay recopilaciones registradas',
    results: 'resultados',
    result: 'resultado',
    failed: 'Recopilación parcial. Las publicaciones anteriores siguen disponibles.',
    unavailable: 'Recopilación no disponible. Inténtalo de nuevo.',
  },
  'de-DE': {
    title: 'KI-Nachrichten für Tech-Teams.',
    section: 'SANDBOX / NACHRICHTEN',
    readArticle: 'Artikel lesen',
    subtitle:
      'Ankündigungen zu KI und Softwareentwicklung mit einer Zusammenfassung und einem Link zu jeder Quelle für deine nächsten Tests.',
    all: 'Alle Themen',
    development: 'Entwicklung',
    agents: 'KI-Agenten',
    models: 'Modelle',
    'open-source': 'Open Source',
    search: 'KI-Nachrichten durchsuchen',
    sort: 'Sortieren',
    categories: 'Kategorien',
    filters: 'Filter',
    balanced: 'Nach Medien gemischt',
    source: 'Medium',
    allSources: 'Alle Medien',
    bySource: 'Nach Medium',
    unknownTime: 'Uhrzeit nicht angegeben',
    sourceStatus: 'Quellenstatus',
    available: 'Verfügbar',
    uses: 'Anwendungen und Tools',
    business: 'Unternehmen',
    research: 'Forschung',
    society: 'Gesellschaft',
    placeholder: 'Ein Thema, ein Tool, ein Medium...',
    refresh: 'Aktualisieren',
    loading: 'Wird abgerufen',
    recent: 'Neueste zuerst',
    stable: 'Stabile Versionen zuerst',
    time: 'Veröffentlicht (Paris)',
    news: 'Meldung / Quelle',
    empty: 'Keine Nachrichten für diese Suche.',
    waiting:
      'Derzeit sind keine aktuellen Nachrichten verfügbar. Der nächste Abruf steht noch aus.',
    clear: 'Filter zurücksetzen',
    more: 'Mehr anzeigen',
    preview: 'Lokale Vorschau',
    automatic: 'Automatische Aktualisierung',
    note: 'Titel und Zusammenfassungen entstehen aus öffentlichen Auszügen der genannten Medien und werden anschließend übersetzt. Über den Quellenlink kannst du die Angaben prüfen.',
    home: 'Startseite',
    updated: 'Letzte Aktualisierung',
    published: 'Letzte Veröffentlichung auf der Website',
    collected: 'Letzter Quellenabruf',
    collectionNote:
      'Der Abruf ist stündlich geplant. Nur Artikel, die die Prüfungen bestehen, werden veröffentlicht.',
    unpublished: 'Datum nicht verfügbar',
    uncollected: 'Kein Abruf erfasst',
    results: 'Ergebnisse',
    result: 'Ergebnis',
    failed: 'Teilweiser Abruf. Frühere Veröffentlichungen bleiben verfügbar.',
    unavailable: 'Abruf nicht verfügbar. Bitte erneut versuchen.',
  },
} as const;

function availableSourcesLabel(locale: string, available: number, total: number): string {
  if (locale === 'en') return `${available} of ${total} sources available`;
  if (locale === 'es-ES') return `${available} de ${total} fuentes disponibles`;
  if (locale === 'de-DE') return `${available} von ${total} Quellen erreichbar`;
  return `${available}/${total} sources accessibles`;
}

export function NewsScreen({
  initialFeed,
  locale = 'fr-FR',
  canonicalUrl,
  isPreview = false,
  isUnavailable = false,
}: {
  initialFeed: NewsFeed;
  locale?: string;
  canonicalUrl?: string;
  isPreview?: boolean;
  isUnavailable?: boolean;
}) {
  const copy = Object.hasOwn(COPY, locale) ? COPY[locale as keyof typeof COPY] : COPY['fr-FR'];
  const [feed, setFeed] = useState(initialFeed);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [source, setSource] = useState('all');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [order, setOrder] = useState('balanced');
  const [limit, setLimit] = useState(NEWS_PAGE_SIZE);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(
    isUnavailable
      ? copy.unavailable
      : initialFeed.sources.some((source) => !source.ok)
        ? copy.failed
        : '',
  );
  const selected = selectNews(feed.items, { query, category, source, order, limit, locale });
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const date = (value: string) =>
    value.length === 10
      ? `${new Intl.DateTimeFormat(locale, { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))} (${copy.unknownTime})`
      : formatter.format(new Date(value));
  async function refresh() {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/news/preview', {
        method: 'POST',
        signal: AbortSignal.timeout(90_000),
      });
      if (!response.ok) throw new Error('Collecte indisponible');
      const next = newsFeedSchema.parse(await response.json());
      setFeed(next);
      if (next.sources.some((source) => !source.ok)) setError(copy.failed);
    } catch {
      setError(copy.unavailable);
    } finally {
      setPending(false);
    }
  }
  async function loadMore() {
    if (pending) return;
    if (selected.total > limit) {
      setLimit((value) => value + NEWS_PAGE_SIZE);
      return;
    }
    if (!feed.nextCursor) return;
    setPending(true);
    setError('');
    try {
      const params = new URLSearchParams({ cursor: JSON.stringify(feed.nextCursor) });
      const response = await fetch(`/api/news?${params.toString()}`, {
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error('Fil indisponible');
      const next = newsFeedSchema.parse(await response.json());
      setFeed((current) => ({ ...next, items: uniqueNews([...current.items, ...next.items]) }));
      setLimit((value) => value + NEWS_PAGE_SIZE);
      if (next.sources.some((entry) => !entry.ok)) setError(copy.failed);
    } catch {
      setError(copy.unavailable);
    } finally {
      setPending(false);
    }
  }
  function reset() {
    setQuery('');
    setCategory('all');
    setSource('all');
    setOrder('balanced');
    setLimit(NEWS_PAGE_SIZE);
  }
  return (
    <div className={styles['page']} data-news-hydrated={hydrated}>
      {canonicalUrl && feed.items.length > 0 ? (
        <JsonLd data={newsCollectionLd(selected.items, canonicalUrl, copy.title, locale)} />
      ) : null}
      <div className={styles['topline']}>
        <Link href={locale === 'fr-FR' ? '/' : `/${locale.toLowerCase()}`}>{copy.home}</Link>
        <span>{copy.section}</span>
        <span>{isPreview ? copy.preview : copy.automatic}</span>
      </div>
      <header className={styles['heading']}>
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>
      </header>
      <section className={styles['terminal']} aria-label={copy.title} aria-busy={pending}>
        <div className={styles['status']}>
          <div className={styles['collectionStatus']}>
            <p className={styles['statusText']}>{copy.updated}</p>
            <dl className={styles['updateDates']}>
              <div>
                <dt>{copy.published}</dt>
                <dd>
                  {feed.lastPublishedAt ? (
                    <time dateTime={feed.lastPublishedAt}>
                      {date(feed.lastPublishedAt)} (Europe/Paris)
                    </time>
                  ) : (
                    copy.unpublished
                  )}
                </dd>
              </div>
              <div>
                <dt>{copy.collected}</dt>
                <dd>
                  {feed.checkedAt ? (
                    <time dateTime={feed.checkedAt}>{date(feed.checkedAt)} (Europe/Paris)</time>
                  ) : (
                    copy.uncollected
                  )}
                </dd>
              </div>
            </dl>
            <p className={styles['collectionNote']}>{copy.collectionNote}</p>
          </div>
          {isPreview ? (
            <button type="button" onClick={() => void refresh()} disabled={pending}>
              {pending ? copy.loading : copy.refresh}
              <span aria-hidden="true"> ↻</span>
            </button>
          ) : null}
        </div>
        <div className={styles['controls']}>
          <label className={styles['search']}>
            <span className={styles['fieldLabel']}>{copy.search}</span>
            <input
              type="search"
              value={query}
              placeholder={copy.placeholder}
              onChange={(event) => {
                setQuery(event.target.value);
                setLimit(NEWS_PAGE_SIZE);
              }}
            />
          </label>
          <button
            className={styles['filtersToggle']}
            type="button"
            aria-expanded={filtersExpanded}
            aria-controls="news-filters"
            onClick={() => {
              setFiltersExpanded((value) => !value);
            }}
          >
            {copy.filters}
            {source !== 'all' || category !== 'all' || order !== 'balanced' ? ' *' : ''}
          </button>
        </div>
        <div id="news-filters" className={styles['filterPanel']} hidden={!filtersExpanded}>
          <div className={styles['filterFields']}>
            <label className={styles['sort']}>
              <span className={styles['fieldLabel']}>{copy.source}</span>
              <select
                value={source}
                onChange={(event) => {
                  setSource(event.target.value);
                  setLimit(NEWS_PAGE_SIZE);
                }}
              >
                <option value="all">{copy.allSources}</option>
                {NEWS_MEDIA.map((media) => (
                  <option key={media.id} value={media.name}>
                    {media.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles['sort']}>
              <span className={styles['fieldLabel']}>{copy.sort}</span>
              <select
                value={order}
                onChange={(event) => {
                  setOrder(event.target.value);
                }}
              >
                <option value="balanced">{copy.balanced}</option>
                <option value="recent">{copy.recent}</option>
                <option value="source">{copy.bySource}</option>
              </select>
            </label>
          </div>
          <nav className={styles['filters']} aria-label={copy.categories}>
            {(
              [
                'all',
                'agents',
                'models',
                'open-source',
                'uses',
                'business',
                'research',
                'development',
                'society',
              ] as const
            ).map((key) => (
              <button
                type="button"
                key={key}
                aria-pressed={category === key}
                onClick={() => {
                  setCategory(key);
                  setLimit(NEWS_PAGE_SIZE);
                }}
              >
                {key === 'all' ? copy.all : copy[key]}
              </button>
            ))}
          </nav>
        </div>
        <div className={styles['columnHead']}>
          <span>{copy.time}</span>
          <span>{order === 'balanced' ? copy.balanced : copy.news}</span>
        </div>
        {error && error !== copy.failed ? (
          <p className={styles['error']} role="status">
            {error}
          </p>
        ) : null}
        <ol className={styles['feed']} aria-label={copy.title}>
          {selected.items.map((item) => (
            <li key={item.id}>
              <details className={styles['entry']}>
                <summary className={styles['entryHeading']}>
                  <time dateTime={item.publishedAt}>{date(item.publishedAt)}</time>
                  <span
                    className={styles['entryTitle']}
                    lang={
                      item.kind === 'article' && locale !== 'fr-FR' && !item.titles?.[locale]
                        ? 'fr'
                        : undefined
                    }
                  >
                    {newsSentence(item, locale)}
                  </span>
                  <svg
                    className={styles['chevron']}
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <div className={styles['synopsis']}>
                  {newsSynopsis(item, locale).length > 0 ? (
                    <p lang={locale !== 'fr-FR' && !item.synopses?.[locale] ? 'fr' : undefined}>
                      {newsSynopsis(item, locale).join(' ')}
                    </p>
                  ) : null}
                  <a href={item.url} target="_blank" rel="noopener noreferrer" title={item.project}>
                    {copy.readArticle}
                    <span className={styles['publisher']}> ({item.project})</span>
                  </a>
                </div>
              </details>
            </li>
          ))}
        </ol>
        {selected.total === 0 && !isUnavailable ? (
          <div className={styles['empty']}>
            <p>{feed.items.length ? copy.empty : copy.waiting}</p>
            {feed.items.length ? (
              <button type="button" onClick={reset}>
                {copy.clear}
              </button>
            ) : null}
          </div>
        ) : null}
        <div className={styles['bottomline']}>
          <span>
            {selected.total} {selected.total === 1 ? copy.result : copy.results} ·{' '}
            {availableSourcesLabel(
              locale,
              feed.sources.filter((source) => source.ok).length,
              feed.sources.length,
            )}
          </span>
          {selected.total > limit || feed.nextCursor ? (
            <button type="button" onClick={() => void loadMore()} disabled={pending}>
              {copy.more} +
            </button>
          ) : null}
        </div>
        {error === copy.failed ? (
          <p className={styles['error']} role="status">
            {error}
          </p>
        ) : null}
      </section>
      <details className={styles['sourceStatus']}>
        <summary>{copy.sourceStatus}</summary>
        <ul>
          {feed.sources.map((entry) => (
            <li key={entry.name}>
              <span>{entry.name}</span>
              <span>{entry.ok ? copy.available : copy.unavailable}</span>
            </li>
          ))}
        </ul>
      </details>
      <p className={styles['note']}>{copy.note}</p>
    </div>
  );
}
