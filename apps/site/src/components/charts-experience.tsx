'use client';
import { Text, LocalizedElement } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { chartSelectionQuery, type ChartSelection } from '@/domain/chart-selection';
import { formatCompact } from '@/domain/format';
import {
  CHART_LABELS,
  CHART_PERIODS,
  MODEL_VIEWS,
  PROJECT_FILTERS,
  SKILL_FILTERS,
  chartRows,
  editionMonth,
  matchesChartFilter,
  type ChartId,
  type ChartPeriod,
  type ChartsData,
  type ChartsRow,
} from '@/domain/sandbox-charts';
import { weekStart } from '@/domain/weeks';
import {
  ChartsMarket,
  ChartsMonthly,
  ChartsMovers,
  ChartsRecords,
  ChartsWatchlist,
} from './charts-features';
import { ChartMovement, ChartsPodium, ChartsRanking } from './charts-ranking';
const ChartsShare = dynamic(() => import('./charts-share').then((module) => module.ChartsShare));
export function ChartsExperience({
  data,
  initialChart = 'github',
  initialView,
  initialPeriod = 'week',
  initialSelection,
}: {
  data: ChartsData;
  initialChart?: ChartId;
  initialView?: string | undefined;
  initialPeriod?: ChartPeriod;
  initialSelection?: ChartSelection;
}) {
  const [id, setId] = useState<ChartId>(initialSelection?.chart ?? initialChart);
  const [week, setWeek] = useState(
    initialSelection?.week && data.weeks.includes(initialSelection.week)
      ? initialSelection.week
      : data.week,
  );
  const [period, setPeriod] = useState<ChartPeriod>(initialSelection?.period ?? initialPeriod);
  const [filter, setFilter] = useState(initialSelection?.filter ?? 'All');
  const [view, setView] = useState(
    initialSelection?.view ??
      initialView ??
      ((initialSelection?.chart ?? initialChart) === 'models' ? 'quality' : 'momentum'),
  );
  const [studio, setStudio] = useState(false);
  const [shareRow, setShareRow] = useState<ChartsRow | null>(null);
  const [archiveMonth, setArchiveMonth] = useState('all');
  useEffect(() => {
    const url = new URL(window.location.href);
    const search = chartSelectionQuery(url.search, {
      chart: id === initialChart ? undefined : id,
      week: week === data.week ? undefined : week,
      filter,
      period,
      view: id === 'models' ? view : undefined,
    });
    if (url.search.slice(1) === search) return;
    url.search = search;
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }, [id, week, filter, period, view, initialChart, data.week]);
  const series = data.series.find((item) => item.id === id);
  const meta = CHART_LABELS[id];
  const rows = useMemo(
    () => chartRows(data, id, week, period, id === 'models' ? view : undefined),
    [data, id, week, period, view],
  );
  const visible = rows.filter((row) => matchesChartFilter(row.entity, filter));
  const weeklyRows = useMemo(() => chartRows(data, id, week), [data, id, week]);
  const edition = series?.editions.find((item) => item.week === week);
  const month = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(weekStart(week));
  const filters = id === 'skills' ? SKILL_FILTERS : PROJECT_FILTERS;
  const months = [...new Set(data.weeks.map(editionMonth))];
  const episodes = data.episodes.filter(
    (episode) => episode.chart === series?.slug && episode.week === week,
  );
  const isUnavailable = data.mode === 'unavailable';
  function chooseChart(next: ChartId): void {
    setId(next);
    setFilter('All');
    setView(next === 'models' ? 'quality' : 'momentum');
    setShareRow(null);
  }
  const currentShare = shareRow
    ? {
        week,
        title: `${meta.title}${id === 'models' ? ` / ${MODEL_VIEWS.find((item) => item.id === view)?.label ?? 'Overall'}` : ''}${period !== 'week' ? ` / ${CHART_PERIODS.find((item) => item.id === period)?.label}` : ''}`,
        name: shareRow.entity.name,
        rank: shareRow.rank,
        movement: shareRow.baseline
          ? '-'
          : shareRow.movement.kind === 'new'
            ? 'NEW'
            : shareRow.movement.delta > 0
              ? `↑${shareRow.movement.delta}`
              : shareRow.movement.delta < 0
                ? `↓${Math.abs(shareRow.movement.delta)}`
                : '=',
        stat:
          shareRow.periodStars === null
            ? `${shareRow.score.toFixed(1)} / 100`
            : `${shareRow.periodStars > 0 ? '+' : ''}${formatCompact(shareRow.periodStars)} STARS`,
        growth: '',
        fixture: data.mode === 'fixtures',
      }
    : null;
  return (
    <div className={`wrap sc-page${studio ? ' sc-studio' : ''}`}>
      <header className="sc-hero">
        <div className="sc-edition-meta">
          <span>
            <Text>{'THE AI CHARTS'}</Text>
          </span>
          <span>
            <Text>{'UPDATED EVERY MONDAY'}</Text>
          </span>
          <span>
            <Text>
              {data.weeks.includes(week) && week !== data.weeks[0]
                ? 'ARCHIVE EDITION'
                : 'THIS WEEK'}
            </Text>
          </span>
        </div>
        <div className="sc-hero-main">
          <div className="sc-hero-title">
            <h1>
              <span>
                <Text>{'SANDBOX'}</Text>
              </span>
              <Text>{'CHARTS'}</Text>
              <span className="sc-title-dot">
                <Text>{'.'}</Text>
              </span>
            </h1>
            <p>
              <Text>{'The weekly charts of what matters in AI.'}</Text>
            </p>
          </div>
          <div className="sc-week-stamp">
            <span className="sc-label">
              <Text>{'WEEK'}</Text>
            </span>
            <strong>
              <Text>{week.slice(-2)}</Text>
            </strong>
            <span className="sc-label">
              <Text>{month}</Text>
            </span>
          </div>
        </div>
        <div className="sc-hero-bottom">
          <p>
            <Text>{edition?.headline ?? "Qu'est-ce qui monte dans l'IA cette semaine ?"}</Text>
          </p>
          <LocalizedElement
            as="div"
            className="sc-hero-moves"
            aria-label="Mouvements dans le classement"
          >
            <Text>
              {weeklyRows.slice(0, 3).map((row) => (
                <span key={row.entity.slug}>
                  <b>
                    <Text>{String(row.rank).padStart(2, '0')}</Text>
                  </b>
                  <ChartMovement row={row} />
                </span>
              ))}
            </Text>
          </LocalizedElement>
        </div>
      </header>
      <Text>
        {data.mode === 'fixtures' ? (
          <p className="sc-data-state">
            <Text>
              {
                'APER\u00C7U LOCAL \u00B7 Les chiffres de cet aper\u00E7u sont des fixtures de d\u00E9veloppement. En production, les classements sont calcul\u00E9s depuis les relev\u00E9s PostgreSQL de leurs sources.'
              }
            </Text>
          </p>
        ) : null}
      </Text>
      <LocalizedElement as="nav" className="sc-chart-tabs" aria-label="Choisir un chart">
        <Text>
          {(['github', 'skills', 'models', 'rising'] as const).map((chart, index) => (
            <button
              key={chart}
              type="button"
              aria-pressed={id === chart}
              onClick={() => {
                chooseChart(chart);
              }}
            >
              <small>
                <Text>{'0'}</Text>
                <Text>{index + 1}</Text>
              </small>
              <span>
                <Text>
                  {chart === 'github'
                    ? 'GitHub'
                    : chart === 'skills'
                      ? 'Skills'
                      : chart === 'models'
                        ? 'Models'
                        : 'Rising'}
                </Text>
              </span>
              <b>
                <Text>{chart === 'rising' ? '20' : 'TOP 20'}</Text>
              </b>
            </button>
          ))}
        </Text>
      </LocalizedElement>
      <LocalizedElement as="nav" className="sc-content-nav" aria-label="Dans cette édition">
        <a href="#sc-chart-title">
          <Text>{'Classement'}</Text>
        </a>
        <a href="#sc-watchlist-title">
          <Text>{'Watchlist'}</Text>
        </a>
        <a href="#sc-market-title">
          <Text>{'Signaux'}</Text>
        </a>
        <a href="#sc-archive-title">
          <Text>{'Archives'}</Text>
        </a>
        <Link href="/search">
          <Text>{'Rechercher'}</Text>
        </Link>
      </LocalizedElement>
      <section className="sc-chart" aria-labelledby="sc-chart-title">
        <div className="sc-chart-heading">
          <div>
            <p className="sc-label">
              <Text>{id === 'rising' ? 'THE DISCOVERY CHART' : 'THE WEEKLY RANKING'}</Text>
            </p>
            <h2 id="sc-chart-title">
              <Text>{meta.title}</Text>
            </h2>
            <p>
              <Text>{meta.subtitle}</Text>
            </p>
          </div>
          <div className="sc-chart-tools">
            <label>
              <span className="sr-only">
                <Text>{'Semaine du classement'}</Text>
              </span>
              <select
                value={week}
                onChange={(event) => {
                  setWeek(event.target.value);
                  setShareRow(null);
                }}
              >
                <Text>
                  {(data.weeks.length ? data.weeks : [data.week]).map((item) => (
                    <option key={item} value={item}>
                      <Text>{'W'}</Text>
                      <Text>{item.slice(-2)}</Text>
                      <Text>{' / '}</Text>
                      <Text>{item.slice(0, 4)}</Text>
                    </option>
                  ))}
                </Text>
              </select>
            </label>
            <button
              type="button"
              aria-pressed={studio}
              onClick={() => {
                setStudio(!studio);
              }}
            >
              <Text>{studio ? 'Quitter le mode 16:9' : 'MODE 16:9'}</Text>
            </button>
            <button
              type="button"
              disabled={!visible[0]}
              onClick={() => {
                setShareRow(visible[0] ?? null);
              }}
            >
              <Text>{'SHARE CHART \u2197'}</Text>
            </button>
          </div>
        </div>
        <div className="sc-controls">
          <LocalizedElement
            as="div"
            className="sc-periods"
            role="group"
            aria-label="Période du classement"
          >
            <Text>
              {CHART_PERIODS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={period === item.id}
                  onClick={() => {
                    setPeriod(item.id);
                  }}
                >
                  <Text>{item.label}</Text>
                </button>
              ))}
            </Text>
          </LocalizedElement>
          <LocalizedElement
            as="div"
            className="sc-filters"
            role="group"
            aria-label={id === 'models' ? 'Capacité du modèle' : 'Catégorie de projet'}
          >
            <Text>
              {id === 'models'
                ? MODEL_VIEWS.map((item) => {
                    const supported =
                      item.id === 'open' ||
                      series?.dimensions.some((dimension) => dimension.id === item.id);
                    return (
                      <LocalizedElement
                        as="button"
                        type="button"
                        key={item.id}
                        aria-pressed={view === item.id}
                        disabled={!supported}
                        title={
                          supported ? undefined : 'Aucune mesure disponible pour cette capacité'
                        }
                        onClick={() => {
                          setView(item.id);
                        }}
                      >
                        <Text>{item.label}</Text>
                      </LocalizedElement>
                    );
                  })
                : filters.map((item) => (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={filter === item}
                      onClick={() => {
                        setFilter(item);
                      }}
                    >
                      <Text>{item}</Text>
                    </button>
                  ))}
            </Text>
          </LocalizedElement>
        </div>
        <Text>
          {period !== 'week' ? (
            <p className="sc-view-note" role="status">
              <Text>
                {
                  'Indice de pr\u00E9sence aux meilleures places sur les semaines disponibles de la p\u00E9riode. Les valeurs brutes affich\u00E9es sont les derniers relev\u00E9s disponibles.'
                }
              </Text>
              <Text>
                {period === 'month' ? ' Les semaines sont rattachées au mois de leur lundi.' : ''}
              </Text>
            </p>
          ) : id === 'models' && view !== 'quality' ? (
            <p className="sc-view-note" role="status">
              <Text>{'Vue par '}</Text>
              <Text>{MODEL_VIEWS.find((item) => item.id === view)?.label}</Text>
              <Text>
                {'. Les positions et mouvements sont recalcul\u00E9s sur ce crit\u00E8re.'}
              </Text>
            </p>
          ) : null}
        </Text>
        <p className="sr-only" role="status" aria-live="polite">
          <Text>{visible.length}</Text>
          <Text>{' entr\u00E9es affich\u00E9es dans '}</Text>
          <Text>{meta.title}</Text>
          <Text>{'.'}</Text>
        </p>
        <Text>
          {rows.length && visible.length === 0 ? (
            <div className="empty-state">
              <h3>
                <Text>{'Aucun projet dans cette cat\u00E9gorie pour cette \u00E9dition.'}</Text>
              </h3>
              <p>
                <Text>{'Les rangs des autres projets restent disponibles.'}</Text>
              </p>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setFilter('All');
                }}
              >
                <Text>{'Toutes les cat\u00E9gories'}</Text>
              </button>
            </div>
          ) : rows.length ? (
            <>
              <ChartsPodium rows={visible} period={period} />
              <div className="sc-list-heading">
                <span className="sc-label">
                  <Text>{'RANK / MOVEMENT / PROJECT'}</Text>
                </span>
                <span className="sc-label">
                  <Text>{'MOMENTUM'}</Text>
                </span>
              </div>
              <ChartsRanking rows={visible} series={series} period={period} onShare={setShareRow} />
              <div className="sc-chart-footer">
                <span>
                  <Text>{visible.length}</Text>
                  <Text>{' entr\u00E9es'}</Text>
                  <Text>{filter !== 'All' ? ` · filtre ${filter}` : ''}</Text>
                  <Text>{' \u00B7 les rangs officiels sont conserv\u00E9s.'}</Text>
                </span>
                <Link href={`/charts/${meta.slug}/methodology`}>
                  <Text>{'M\u00E9thodologie et sources \u2197'}</Text>
                </Link>
              </div>
            </>
          ) : (
            <div className="sc-empty">
              <span className="sc-empty-number">
                <Text>{'20'}</Text>
              </span>
              <div>
                <p className="sc-label">
                  <Text>
                    {isUnavailable
                      ? 'DATA TEMPORARILY UNAVAILABLE'
                      : id === 'skills' || id === 'models'
                        ? 'COMING NEXT'
                        : 'BUILDING THE HISTORY'}
                  </Text>
                </p>
                <h3>
                  <Text>
                    {isUnavailable
                      ? 'Les données sont momentanément indisponibles.'
                      : id === 'skills' || id === 'models'
                        ? 'La collecte de ce chart se prépare.'
                        : 'Le premier classement se construit.'}
                  </Text>
                </h3>
                <p>
                  <Text>
                    {isUnavailable
                      ? 'Réessayez dans quelques instants.'
                      : id === 'rising'
                        ? "Rising attend une accélération mesurée sur deux périodes de sept jours. L'historique ne sera pas extrapolé."
                        : 'La première édition sera publiée lorsque les dépôts suivis auront assez de relevés. Chaque position reposera sur des mesures enregistrées.'}
                  </Text>
                </p>
                <Link href={`/charts/${meta.slug}/methodology`}>
                  <Text>{'Lire la m\u00E9thode \u2197'}</Text>
                </Link>
              </div>
            </div>
          )}
        </Text>
      </section>
      <div className="sc-secondary">
        <ChartsMovers rows={weeklyRows} />
        <ChartsWatchlist data={data} id={id} week={week} />
        <ChartsMarket data={data} week={week} />
        <ChartsMonthly data={data} week={week} />
        <ChartsRecords data={data} id={id} week={week} />
        <Text>
          {episodes.length ? (
            <section className="sc-podcast">
              <span className="sc-label">
                <Text>{'ON THE PODCAST'}</Text>
              </span>
              <Text>
                {episodes.map((episode) => (
                  <Link key={episode.number} href={episode.href}>
                    <b>
                      <Text>{'DISCUSSED IN SANDBOX #'}</Text>
                      <Text>{episode.number}</Text>
                    </b>
                    <span>
                      <Text>{episode.title}</Text>
                      <Text>{' \u2197'}</Text>
                    </span>
                  </Link>
                ))}
              </Text>
            </section>
          ) : null}
        </Text>
        <section className="sc-archives" aria-labelledby="sc-archive-title">
          <div className="sc-section-heading">
            <div>
              <p className="sc-label">
                <Text>{'EVERY WEEK LEAVES A TRACE'}</Text>
              </p>
              <h2 id="sc-archive-title">
                <Text>{'THE ARCHIVES'}</Text>
              </h2>
            </div>
            <label>
              <span className="sr-only">
                <Text>{'Mois des archives'}</Text>
              </span>
              <select
                value={archiveMonth}
                onChange={(event) => {
                  setArchiveMonth(event.target.value);
                }}
              >
                <option value="all">
                  <Text>{'Tous les mois'}</Text>
                </option>
                <Text>
                  {months.map((item) => (
                    <option key={item} value={item}>
                      <Text>
                        {new Intl.DateTimeFormat('fr-FR', {
                          month: 'long',
                          year: 'numeric',
                          timeZone: 'UTC',
                        }).format(new Date(`${item}-01T00:00:00Z`))}
                      </Text>
                    </option>
                  ))}
                </Text>
              </select>
            </label>
          </div>
          <div className="sc-archive-weeks">
            <Text>
              {data.weeks
                .filter((item) => archiveMonth === 'all' || editionMonth(item) === archiveMonth)
                .map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={week === item}
                    onClick={() => {
                      setWeek(item);
                      document.querySelector('.sc-hero')?.scrollIntoView({
                        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                          ? 'instant'
                          : 'smooth',
                      });
                    }}
                  >
                    <small>
                      <Text>{item.slice(0, 4)}</Text>
                    </small>
                    <b>
                      <Text>{'W'}</Text>
                      <Text>{item.slice(-2)}</Text>
                    </b>
                  </button>
                ))}
            </Text>
          </div>
          <Text>
            {!data.weeks.length ? (
              <p className="sc-section-empty">
                <Text>
                  {'Les \u00E9ditions fig\u00E9es appara\u00EEtront ici apr\u00E8s publication.'}
                </Text>
              </p>
            ) : (
              <Link className="sc-archive-link" href={`/charts/${meta.slug}/${week}`}>
                <Text>{"Ouvrir l'\u00E9dition W"}</Text>
                <Text>{week.slice(-2)}</Text>
                <Text>{' \u2197'}</Text>
              </Link>
            )}
          </Text>
        </section>
        <section className="sc-newsletter" aria-labelledby="sc-newsletter-title">
          <div>
            <p className="sc-label">
              <Text>{'SANDBOX CHARTS / EVERY MONDAY'}</Text>
            </p>
            <h2 id="sc-newsletter-title">
              <Text>{"KNOW WHAT'S"}</Text>
              <br />
              <Text>{'MOVING'}</Text>
              <span>
                <Text>{'.'}</Text>
              </span>
            </h2>
            <p>
              <Text>{'Get SANDBOX CHARTS in your inbox every week.'}</Text>
            </p>
          </div>
          <div>
            <Text>
              {data.newsletterUrl ? (
                <a
                  className="btn btn-solid"
                  href={data.newsletterUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Text>{'GET THE CHARTS \u2197'}</Text>
                </a>
              ) : (
                <>
                  <label>
                    <span className="sr-only">
                      <Text>{'Adresse email'}</Text>
                    </span>
                    <LocalizedElement
                      as="input"
                      type="email"
                      placeholder="Votre adresse email"
                      disabled
                    />
                  </label>
                  <button className="btn btn-solid" type="button" disabled>
                    <Text>{'GET THE CHARTS'}</Text>
                  </button>
                  <p>
                    <Text>{'Les inscriptions ne sont pas encore ouvertes.'}</Text>
                  </p>
                </>
              )}
            </Text>
          </div>
        </section>
      </div>
      <Text>
        {shareRow && currentShare ? (
          <ChartsShare
            content={currentShare}
            url={`/charts/${meta.slug}/${week}?period=${period}${id === 'models' ? `&view=${encodeURIComponent(view)}` : ''}`}
            onClose={() => {
              setShareRow(null);
            }}
          />
        ) : null}
      </Text>
    </div>
  );
}
