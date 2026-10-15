'use client';

import { Text, LocalizedElement, useLocalization } from '@/components/localization';
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
  chartFilterLabel,
  chartRows,
  latestEditionWeek,
  matchesChartFilter,
  type ChartId,
  type ChartPeriod,
  type ChartsData,
  type ChartsRow,
} from '@/domain/sandbox-charts';
import { compareWeeks, editionStart, isCalendarEdition } from '@/domain/weeks';
import { intlLocale } from '@/i18n/translation';
import { ChartsWatchlist } from './charts-features';
import { ChartsRanking } from './charts-ranking';
import styles from './charts-compact.module.css';

const ChartsShare = dynamic(() => import('./charts-share').then((module) => module.ChartsShare));
const periodLabels: Record<ChartPeriod, string> = {
  week: 'Cette édition',
  month: 'Ce mois',
  quarter: '3 mois',
  all: "Tout l'historique",
};

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
  const { locale, t } = useLocalization();
  const initialId = initialSelection?.chart ?? initialChart;
  const [id, setId] = useState<ChartId>(initialId);
  const [week, setWeek] = useState(
    initialSelection?.week && data.weeks.includes(initialSelection.week)
      ? initialSelection.week
      : latestEditionWeek(data, initialId),
  );
  const [period, setPeriod] = useState<ChartPeriod>(initialSelection?.period ?? initialPeriod);
  const [filter, setFilter] = useState(initialSelection?.filter ?? 'All');
  const [view, setView] = useState(
    initialSelection?.view ?? initialView ?? (initialId === 'models' ? 'quality' : 'momentum'),
  );
  const [shareRow, setShareRow] = useState<ChartsRow | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const search = chartSelectionQuery(url.search, {
      chart: id === initialChart ? undefined : id,
      week: week === latestEditionWeek(data, id) ? undefined : week,
      filter,
      period,
      view: id === 'models' ? view : undefined,
    });
    if (url.search.slice(1) === search) return;
    url.search = search;
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }, [id, week, filter, period, view, initialChart, data]);

  const series = data.series.find((item) => item.id === id);
  const chartWeeks = useMemo(
    () =>
      [...new Set(series?.snapshots.map((snapshot) => snapshot.week) ?? [])].toSorted(
        (left, right) => compareWeeks(right, left),
      ),
    [series],
  );
  const meta = CHART_LABELS[id];
  const rows = useMemo(
    () => chartRows(data, id, week, period, id === 'models' ? view : undefined),
    [data, id, week, period, view],
  );
  const visible = rows.filter((row) => matchesChartFilter(row.entity, filter));
  const edition = series?.editions.find((item) => item.week === week);
  const hasWatchlist = edition?.watchlist.some((item) =>
    data.entities.some((entity) => entity.slug === item.entity),
  );
  const filters = id === 'skills' ? SKILL_FILTERS : PROJECT_FILTERS;
  const episodes = data.episodes.filter(
    (episode) => episode.chart === series?.slug && episode.week === week,
  );
  const isUnavailable = data.mode === 'unavailable';
  const latestPublished = series?.snapshots.toSorted((a, b) => compareWeeks(b.week, a.week))[0];
  const publicationLate =
    data.mode === 'live' && latestPublished && data.checkedAt
      ? Date.parse(data.checkedAt) - editionStart(latestPublished.week).getTime() >
        18 * 60 * 60 * 1000
      : false;

  function chooseChart(next: ChartId): void {
    const nextSeries = data.series.find((item) => item.id === next);
    if (!nextSeries?.snapshots.some((snapshot) => snapshot.week === week))
      setWeek(latestEditionWeek(data, next));
    setId(next);
    setFilter('All');
    setView(next === 'models' ? 'quality' : 'momentum');
    setShareRow(null);
  }

  const currentShare = shareRow
    ? {
        week,
        title: `${meta.title}${id === 'models' ? ` / ${t(MODEL_VIEWS.find((item) => item.id === view)?.label ?? 'Général')}` : ''}${period !== 'week' ? ` / ${t(periodLabels[period])}` : ''}`,
        name: shareRow.entity.name,
        rank: shareRow.rank,
        movement: shareRow.baseline
          ? '-'
          : shareRow.movement.kind === 'new'
            ? t('NOUVEAU')
            : shareRow.movement.delta > 0
              ? `+${shareRow.movement.delta}`
              : shareRow.movement.delta < 0
                ? String(shareRow.movement.delta)
                : '=',
        stat:
          shareRow.periodStars === null
            ? `${shareRow.score.toFixed(1)} / 100`
            : `${shareRow.periodStars > 0 ? '+' : ''}${formatCompact(shareRow.periodStars)} ${t('ÉTOILES')}`,
        growth: '',
        fixture: data.mode === 'fixtures',
      }
    : null;

  return (
    <div className={`wrap sc-page ${styles['page']}`}>
      <header className={styles['header']}>
        <h1>Sandbox Charts</h1>
        <p className={styles['update']}>
          <Text>{'Deux mises à jour prévues par jour'}</Text>
        </p>
      </header>
      {publicationLate ? (
        <p className={styles['preview']} role="status">
          <Text>{'Mise à jour en retard. La dernière édition publiée reste consultable.'}</Text>
        </p>
      ) : null}
      {data.mode === 'fixtures' ? (
        <p className={styles['preview']} role="note">
          <Text>{'Aperçu local. Données de démonstration.'}</Text>
        </p>
      ) : null}
      <LocalizedElement as="nav" className="sc-chart-tabs" aria-label="Choisir un classement">
        {(['github', 'skills', 'models', 'rising'] as const).map((chart) => (
          <button
            key={chart}
            type="button"
            aria-pressed={id === chart}
            onClick={() => {
              chooseChart(chart);
            }}
          >
            <span>
              {chart === 'github'
                ? 'GitHub'
                : chart === 'skills'
                  ? 'Skills'
                  : chart === 'models'
                    ? 'Models'
                    : 'Rising'}
            </span>
          </button>
        ))}
      </LocalizedElement>
      <section className="sc-chart" aria-labelledby="sc-chart-title">
        <div className="sc-chart-heading">
          <div>
            <h2 id="sc-chart-title">
              <Text>{meta.title}</Text>
            </h2>
            <p>
              <Text>{meta.subtitle}</Text>
            </p>
          </div>
        </div>
        <div className={styles['toolbar']}>
          <label className={styles['field']}>
            <span>
              <Text>{'Période'}</Text>
            </span>
            <select
              value={period}
              onChange={(event) => {
                setPeriod(event.target.value as ChartPeriod);
                setShareRow(null);
              }}
            >
              {CHART_PERIODS.map((item) => (
                <option key={item.id} value={item.id}>
                  <Text>{periodLabels[item.id]}</Text>
                </option>
              ))}
            </select>
          </label>
          {id === 'models' ? (
            <label className={styles['field']}>
              <span>
                <Text>{'Capacité'}</Text>
              </span>
              <select
                value={view}
                onChange={(event) => {
                  setView(event.target.value);
                  setShareRow(null);
                }}
              >
                {MODEL_VIEWS.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                    disabled={
                      item.id !== 'open' &&
                      !series?.dimensions.some((dimension) => dimension.id === item.id)
                    }
                  >
                    <Text>{item.label}</Text>
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className={styles['field']}>
              <span>
                <Text>{'Catégorie'}</Text>
              </span>
              <select
                value={filter}
                onChange={(event) => {
                  setFilter(event.target.value);
                  setShareRow(null);
                }}
              >
                {filters.map((item) => (
                  <option key={item} value={item}>
                    <Text>{chartFilterLabel(item)}</Text>
                  </option>
                ))}
              </select>
            </label>
          )}
          {chartWeeks.length ? (
            <label className={`${styles['field']} ${styles['edition']}`}>
              <span>
                <Text>{'Édition'}</Text>
              </span>
              <select
                value={week}
                onChange={(event) => {
                  setWeek(event.target.value);
                  setShareRow(null);
                }}
              >
                {chartWeeks.map((item) => (
                  <option key={item} value={item}>
                    {isCalendarEdition(item)
                      ? new Intl.DateTimeFormat(intlLocale(locale), {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          timeZone: 'UTC',
                          ...(item.length > 10
                            ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
                            : {}),
                        }).format(editionStart(item)) + (item.length > 10 ? ' UTC' : '')
                      : `${t('Semaine')} ${item.slice(-2)} / ${item.slice(0, 4)}`}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        {period !== 'week' ? (
          <p className="sc-view-note" role="status">
            <Text>
              {
                'Indice de présence aux meilleures places. Les métriques proviennent des derniers relevés disponibles.'
              }
            </Text>
          </p>
        ) : id === 'models' && view !== 'quality' ? (
          <p className="sc-view-note" role="status">
            <Text>{'Positions recalculées selon la capacité choisie.'}</Text>
          </p>
        ) : null}
        <p className="sr-only" role="status" aria-live="polite">
          <Text>{visible.length}</Text>
          <Text>{' entrées affichées dans '}</Text>
          <Text>{meta.title}</Text>
          <Text>{'.'}</Text>
        </p>
        {rows.length && visible.length === 0 ? (
          <div className="empty-state">
            <h3>
              <Text>{'Aucun projet dans cette catégorie pour cette édition.'}</Text>
            </h3>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setFilter('All');
              }}
            >
              <Text>{'Toutes les catégories'}</Text>
            </button>
          </div>
        ) : rows.length ? (
          <>
            <div className={styles['columns']} aria-hidden="true">
              <span>
                <Text>{'Rang'}</Text>
              </span>
              <span>
                <Text>{'Évolution'}</Text>
              </span>
              <span>
                <Text>{id === 'models' ? 'Modèle' : id === 'skills' ? 'Skill' : 'Projet'}</Text>
              </span>
              <span>
                <Text>{visible.some((row) => row.periodStars !== null) ? 'Étoiles' : 'Score'}</Text>
              </span>
              <span className={styles['trendLabel']}>
                <Text>{'Tendance'}</Text>
              </span>
            </div>
            <ChartsRanking rows={visible} series={series} period={period} onShare={setShareRow} />
          </>
        ) : (
          <div className={styles['empty']} role="status">
            <h3>
              <Text>
                {isUnavailable
                  ? 'Données temporairement indisponibles.'
                  : 'Aucune édition publiée pour ce classement.'}
              </Text>
            </h3>
            {isUnavailable ? (
              <p>
                <Text>{'Réessayez dans quelques instants.'}</Text>
              </p>
            ) : null}
            {data.progress && !isUnavailable && (id === 'github' || id === 'rising') ? (
              <p>
                <Text>{data.progress.trackedRepositories}</Text>
                <Text>{' dépôts suivis'}</Text>
                {'. '}
                <Text>{'Historique : '}</Text>
                <Text>{data.progress.distinctSnapshotDays}</Text>
                {' / '}
                <Text>{data.progress.requiredHistoryDays}</Text>
                <Text>{' jours'}</Text>
                {'.'}
              </p>
            ) : null}
          </div>
        )}
        <div className="sc-chart-footer">
          <span>
            <Text>{visible.length}</Text>
            <Text>{' entrées'}</Text>
          </span>
          <nav className={styles['footerLinks']}>
            <Link href={`/charts/${meta.slug}/methodology`}>
              <Text>{'Méthodologie et sources'}</Text>
            </Link>
            <Link href="/charts/history">
              <Text>{'Archives'}</Text>
            </Link>
          </nav>
        </div>
      </section>
      <div className="sc-secondary">
        {hasWatchlist ? <ChartsWatchlist data={data} id={id} week={week} /> : null}
        {episodes.length ? (
          <section className="sc-podcast">
            <span className="sc-label">
              <Text>{'DANS LE PODCAST'}</Text>
            </span>
            {episodes.map((episode) => (
              <Link key={episode.number} href={episode.href}>
                <span>
                  <Text>{episode.title}</Text>
                </span>
              </Link>
            ))}
          </section>
        ) : null}
        {data.newsletterUrl ? (
          <div className={styles['newsletter']}>
            <a href={data.newsletterUrl} target="_blank" rel="noreferrer">
              <Text>{'Recevoir les classements par e-mail'}</Text>
            </a>
          </div>
        ) : null}
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
