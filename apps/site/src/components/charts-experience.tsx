'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
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
}: {
  data: ChartsData;
  initialChart?: ChartId;
  initialView?: string | undefined;
  initialPeriod?: ChartPeriod;
}) {
  const [id, setId] = useState<ChartId>(initialChart);
  const [week, setWeek] = useState(data.week);
  const [period, setPeriod] = useState<ChartPeriod>(initialPeriod);
  const [filter, setFilter] = useState('All');
  const [view, setView] = useState(
    initialView ?? (initialChart === 'models' ? 'quality' : 'momentum'),
  );
  const [studio, setStudio] = useState(false);
  const [shareRow, setShareRow] = useState<ChartsRow | null>(null);
  const [archiveMonth, setArchiveMonth] = useState('all');
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
          <span>THE AI CHARTS</span>
          <span>UPDATED EVERY MONDAY</span>
          <span>
            {data.weeks.includes(week) && week !== data.weeks[0] ? 'ARCHIVE EDITION' : 'THIS WEEK'}
          </span>
        </div>
        <div className="sc-hero-main">
          <div className="sc-hero-title">
            <h1>
              <span>SANDBOX</span>CHARTS<span className="sc-title-dot">.</span>
            </h1>
            <p>The weekly charts of what matters in AI.</p>
          </div>
          <div className="sc-week-stamp">
            <span className="sc-label">WEEK</span>
            <strong>{week.slice(-2)}</strong>
            <span className="sc-label">{month}</span>
          </div>
        </div>
        <div className="sc-hero-bottom">
          <p>{edition?.headline ?? "Qu'est-ce qui monte dans l'IA cette semaine ?"}</p>
          <div className="sc-hero-moves" aria-label="Mouvements dans le classement">
            {weeklyRows.slice(0, 3).map((row) => (
              <span key={row.entity.slug}>
                <b>{String(row.rank).padStart(2, '0')}</b>
                <ChartMovement row={row} />
              </span>
            ))}
          </div>
        </div>
      </header>
      {data.mode === 'fixtures' ? (
        <p className="sc-data-state">
          APERÇU LOCAL · Les chiffres de cet aperçu sont des fixtures de développement. Les éditions
          de production utilisent les collectes GitHub.
        </p>
      ) : null}
      <nav className="sc-chart-tabs" aria-label="Choisir un chart">
        {(['github', 'skills', 'models', 'rising'] as const).map((chart, index) => (
          <button
            key={chart}
            type="button"
            aria-pressed={id === chart}
            onClick={() => {
              chooseChart(chart);
            }}
          >
            <small>0{index + 1}</small>
            <span>
              {chart === 'github'
                ? 'GitHub'
                : chart === 'skills'
                  ? 'Skills'
                  : chart === 'models'
                    ? 'Models'
                    : 'Rising'}
            </span>
            <b>{chart === 'rising' ? '20' : 'TOP 20'}</b>
          </button>
        ))}
      </nav>
      <nav className="sc-content-nav" aria-label="Dans cette édition">
        <a href="#sc-chart-title">Classement</a>
        <a href="#sc-watchlist-title">Watchlist</a>
        <a href="#sc-market-title">Signaux</a>
        <a href="#sc-archive-title">Archives</a>
        <Link href="/search">Rechercher</Link>
      </nav>
      <section className="sc-chart" aria-labelledby="sc-chart-title">
        <div className="sc-chart-heading">
          <div>
            <p className="sc-label">
              {id === 'rising' ? 'THE DISCOVERY CHART' : 'THE WEEKLY RANKING'}
            </p>
            <h2 id="sc-chart-title">{meta.title}</h2>
            <p>{meta.subtitle}</p>
          </div>
          <div className="sc-chart-tools">
            <label>
              <span className="sr-only">Semaine du classement</span>
              <select
                value={week}
                onChange={(event) => {
                  setWeek(event.target.value);
                  setShareRow(null);
                }}
              >
                {(data.weeks.length ? data.weeks : [data.week]).map((item) => (
                  <option key={item} value={item}>
                    W{item.slice(-2)} / {item.slice(0, 4)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              aria-pressed={studio}
              onClick={() => {
                setStudio(!studio);
              }}
            >
              {studio ? 'Quitter le mode 16:9' : 'MODE 16:9'}
            </button>
            <button
              type="button"
              disabled={!visible[0]}
              onClick={() => {
                setShareRow(visible[0] ?? null);
              }}
            >
              SHARE CHART ↗
            </button>
          </div>
        </div>
        <div className="sc-controls">
          <div className="sc-periods" role="group" aria-label="Période du classement">
            {CHART_PERIODS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={period === item.id}
                onClick={() => {
                  setPeriod(item.id);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div
            className="sc-filters"
            role="group"
            aria-label={id === 'models' ? 'Capacité du modèle' : 'Catégorie de projet'}
          >
            {id === 'models'
              ? MODEL_VIEWS.map((item) => {
                  const supported =
                    item.id === 'open' ||
                    series?.dimensions.some((dimension) => dimension.id === item.id);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      aria-pressed={view === item.id}
                      disabled={!supported}
                      title={supported ? undefined : 'Aucune mesure disponible pour cette capacité'}
                      onClick={() => {
                        setView(item.id);
                      }}
                    >
                      {item.label}
                    </button>
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
                    {item}
                  </button>
                ))}
          </div>
        </div>
        {period !== 'week' ? (
          <p className="sc-view-note" role="status">
            Indice de présence aux meilleures places sur les semaines disponibles de la période. Les
            valeurs brutes affichées sont les derniers relevés disponibles.
            {period === 'month' ? ' Les semaines sont rattachées au mois de leur lundi.' : ''}
          </p>
        ) : id === 'models' && view !== 'quality' ? (
          <p className="sc-view-note" role="status">
            Vue par {MODEL_VIEWS.find((item) => item.id === view)?.label}. Les positions et
            mouvements sont recalculés sur ce critère.
          </p>
        ) : null}
        <p className="sr-only" role="status" aria-live="polite">
          {visible.length} entrées affichées dans {meta.title}.
        </p>
        {rows.length && visible.length === 0 ? (
          <div className="empty-state">
            <h3>Aucun projet dans cette catégorie pour cette édition.</h3>
            <p>Les rangs des autres projets restent disponibles.</p>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setFilter('All');
              }}
            >
              Toutes les catégories
            </button>
          </div>
        ) : rows.length ? (
          <>
            <ChartsPodium rows={visible} period={period} />
            <div className="sc-list-heading">
              <span className="sc-label">RANK / MOVEMENT / PROJECT</span>
              <span className="sc-label">MOMENTUM</span>
            </div>
            <ChartsRanking rows={visible} series={series} period={period} onShare={setShareRow} />
            <div className="sc-chart-footer">
              <span>
                {visible.length} entrées{filter !== 'All' ? ` · filtre ${filter}` : ''} · les rangs
                officiels sont conservés.
              </span>
              <Link href={`/charts/${meta.slug}/methodology`}>Méthodologie et sources ↗</Link>
            </div>
          </>
        ) : (
          <div className="sc-empty">
            <span className="sc-empty-number">20</span>
            <div>
              <p className="sc-label">
                {isUnavailable
                  ? 'DATA TEMPORARILY UNAVAILABLE'
                  : id === 'skills' || id === 'models'
                    ? 'COMING NEXT'
                    : 'BUILDING THE HISTORY'}
              </p>
              <h3>
                {isUnavailable
                  ? 'Les données sont momentanément indisponibles.'
                  : id === 'skills' || id === 'models'
                    ? 'La collecte de ce chart se prépare.'
                    : 'Le premier classement se construit.'}
              </h3>
              <p>
                {isUnavailable
                  ? 'Réessayez dans quelques instants.'
                  : id === 'rising'
                    ? "Rising attend une accélération mesurée sur deux périodes de sept jours. L'historique ne sera pas extrapolé."
                    : 'La première édition sera publiée lorsque les dépôts suivis auront assez de relevés. Chaque position reposera sur des mesures enregistrées.'}
              </p>
              <Link href={`/charts/${meta.slug}/methodology`}>Lire la méthode ↗</Link>
            </div>
          </div>
        )}
      </section>
      <div className="sc-secondary">
        <ChartsMovers rows={weeklyRows} />
        <ChartsWatchlist data={data} id={id} week={week} />
        <ChartsMarket data={data} week={week} />
        <ChartsMonthly data={data} week={week} />
        <ChartsRecords data={data} id={id} week={week} />
        {episodes.length ? (
          <section className="sc-podcast">
            <span className="sc-label">ON THE PODCAST</span>
            {episodes.map((episode) => (
              <Link key={episode.number} href={episode.href}>
                <b>DISCUSSED IN SANDBOX #{episode.number}</b>
                <span>{episode.title} ↗</span>
              </Link>
            ))}
          </section>
        ) : null}
        <section className="sc-archives" aria-labelledby="sc-archive-title">
          <div className="sc-section-heading">
            <div>
              <p className="sc-label">EVERY WEEK LEAVES A TRACE</p>
              <h2 id="sc-archive-title">THE ARCHIVES</h2>
            </div>
            <label>
              <span className="sr-only">Mois des archives</span>
              <select
                value={archiveMonth}
                onChange={(event) => {
                  setArchiveMonth(event.target.value);
                }}
              >
                <option value="all">Tous les mois</option>
                {months.map((item) => (
                  <option key={item} value={item}>
                    {new Intl.DateTimeFormat('fr-FR', {
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'UTC',
                    }).format(new Date(`${item}-01T00:00:00Z`))}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="sc-archive-weeks">
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
                  <small>{item.slice(0, 4)}</small>
                  <b>W{item.slice(-2)}</b>
                </button>
              ))}
          </div>
          {!data.weeks.length ? (
            <p className="sc-section-empty">
              Les éditions figées apparaîtront ici après publication.
            </p>
          ) : (
            <Link className="sc-archive-link" href={`/charts/${meta.slug}/${week}`}>
              Ouvrir l'édition W{week.slice(-2)} ↗
            </Link>
          )}
        </section>
        <section className="sc-newsletter" aria-labelledby="sc-newsletter-title">
          <div>
            <p className="sc-label">SANDBOX CHARTS / EVERY MONDAY</p>
            <h2 id="sc-newsletter-title">
              KNOW WHAT'S
              <br />
              MOVING<span>.</span>
            </h2>
            <p>Get SANDBOX CHARTS in your inbox every week.</p>
          </div>
          <div>
            {data.newsletterUrl ? (
              <a
                className="btn btn-solid"
                href={data.newsletterUrl}
                target="_blank"
                rel="noreferrer"
              >
                GET THE CHARTS ↗
              </a>
            ) : (
              <>
                <label>
                  <span className="sr-only">Adresse email</span>
                  <input type="email" placeholder="Votre adresse email" disabled />
                </label>
                <button className="btn btn-solid" type="button" disabled>
                  GET THE CHARTS
                </button>
                <p>Les inscriptions ne sont pas encore ouvertes.</p>
              </>
            )}
          </div>
        </section>
      </div>
      {shareRow && currentShare ? (
        <ChartsShare
          content={currentShare}
          url={`/charts/${meta.slug}/${week}?period=${period}${id === 'models' ? `&view=${encodeURIComponent(view)}` : ''}`}
          onClose={() => {
            setShareRow(null);
          }}
        />
      ) : null}
    </div>
  );
}
