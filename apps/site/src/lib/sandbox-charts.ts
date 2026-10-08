import { cache } from 'react';
import {
  CHART_LABELS,
  risingSnapshots,
  type ChartId,
  type ChartsData,
  type ChartsSeries,
} from '../domain/sandbox-charts.ts';
import { isoWeekOf } from '../domain/weeks.ts';
import { hasDatabaseConfiguration } from '../db/client.ts';
import { liveChartEntities, readLiveWeeklySnapshots } from './charts-store.ts';
import { readChartsEditorial } from './charts-editorial.ts';
import {
  allCharts,
  allEntities,
  allEpisodes,
  content,
  entityPath,
  getHost,
  getProfile,
  getSource,
  latestWeek,
  publishedWeeks,
  snapshotsOf,
} from './repository.ts';

export const sandboxChartsData = cache(async function sandboxChartsData(
  requestedWeek?: string,
): Promise<ChartsData> {
  const fixtures = process.env.NODE_ENV === 'development' && !hasDatabaseConfiguration();
  let week = requestedWeek ?? (fixtures ? latestWeek() : isoWeekOf(new Date()));
  const ids: { id: ChartId; slug: string }[] = [
    { id: 'github', slug: 'github' },
    { id: 'skills', slug: 'skills' },
    { id: 'models', slug: 'ai-models' },
  ];
  const series: ChartsSeries[] = ids.flatMap(({ id, slug }) => {
    const chart = allCharts().find((item) => item.slug === slug);
    if (!chart) return [];
    const profile = getProfile(chart);
    return [
      {
        id,
        slug,
        primary: profile.primary,
        dimensions: profile.dimensions.map(({ id: dimensionId, label }) => ({
          id: dimensionId,
          label,
        })),
        metrics: profile.metrics.map((metric) => ({
          key: metric.key,
          label: metric.label,
          unit: metric.unit,
          source: getSource(metric.source).label,
          url: getSource(metric.source).url,
        })),
        snapshots: snapshotsOf(slug),
        editions: chart.editions,
      },
    ];
  });
  const rising = fixtures ? risingSnapshots(series) : [];
  series.push({
    id: 'rising',
    slug: CHART_LABELS.rising.slug,
    primary: 'discovery',
    dimensions: [{ id: 'discovery', label: 'Discovery' }],
    metrics: [],
    snapshots: rising,
    editions: series.flatMap((item) => item.editions),
  });
  const data: ChartsData = {
    mode: fixtures ? 'fixtures' : 'pending',
    week,
    weeks: fixtures ? publishedWeeks() : [],
    entities: allEntities().map(
      ({
        slug,
        kind,
        name,
        org,
        tagline,
        description,
        category,
        topics,
        links,
        openWeights,
        github,
      }) => ({
        slug,
        kind,
        name,
        tagline,
        description,
        category,
        topics,
        links,
        href: entityPath({ kind, slug }),
        ...(org ? { org } : {}),
        ...(openWeights !== undefined ? { openWeights } : {}),
        ...(github ? { github } : {}),
      }),
    ),
    series,
    takes: content().takes.flatMap((take) =>
      take.chart && take.week
        ? [
            {
              chart: take.chart,
              week: take.week,
              entity: take.entity,
              text: take.text,
              author: getHost(take.host).name,
            },
          ]
        : [],
    ),
    episodes: allEpisodes().flatMap((episode) =>
      episode.charts.map((chart) => ({
        ...chart,
        number: episode.number,
        title: episode.title,
        href: `/episodes/${episode.number}`,
      })),
    ),
    newsletterUrl: process.env['CHARTS_NEWSLETTER_URL']?.startsWith('https://')
      ? process.env['CHARTS_NEWSLETTER_URL']
      : null,
  };
  if (fixtures) return data;
  data.series = data.series.map((item) => ({ ...item, snapshots: [], editions: item.editions }));
  data.entities = [];
  data.takes = [];
  data.series = data.series.map((item) => ({ ...item, editions: [] }));
  data.episodes = [];
  if (!hasDatabaseConfiguration()) return data;
  try {
    const [snapshots, editorial] = await Promise.all([
      readLiveWeeklySnapshots(),
      readChartsEditorial(),
    ]);
    const slugs = [
      ...new Set([
        ...snapshots.flatMap((snapshot) => snapshot.entries.map((entry) => entry.entity)),
        ...editorial.flatMap((note) =>
          [...note.payload.insights, ...note.payload.watchlist].map((item) => item.entity),
        ),
      ]),
    ];
    const entities = await liveChartEntities(slugs);
    week =
      requestedWeek ??
      snapshots
        .map((snapshot) => snapshot.week)
        .sort()
        .at(-1) ??
      week;
    data.week = week;
    data.mode = snapshots.length ? 'live' : 'pending';
    data.weeks = [...new Set(snapshots.map((snapshot) => snapshot.week))].sort().reverse();
    data.series = data.series.map((item) => ({
      ...item,
      snapshots: snapshots.filter((snapshot) => snapshot.chart === item.slug),
      ...(item.id === 'github'
        ? {
            dimensions: [
              { id: 'momentum', label: 'Momentum' },
              { id: 'starVelocity', label: 'Star velocity' },
              { id: 'relativeGrowth', label: 'Relative growth' },
              { id: 'forkVelocity', label: 'Fork velocity' },
              { id: 'contributorActivity', label: 'Contributor activity' },
              { id: 'repositoryActivity', label: 'Repository activity' },
            ],
          }
        : {}),
    }));
    data.entities = entities.map(({ entity, repo }) => ({
      slug: entity.slug,
      name: entity.name,
      kind: 'project',
      org: repo.owner,
      tagline: (entity.description ?? repo.description ?? repo.fullName).slice(0, 110),
      description: entity.description ?? repo.description ?? '',
      category: entity.category,
      topics: [],
      links: [{ kind: 'github', label: repo.fullName, url: entity.sourceUrl }],
      href: `/charts/project/${entity.slug}`,
      github: { repo: repo.fullName },
    }));
    data.series = data.series.map((item) => ({
      ...item,
      editions: editorial.filter((note) => note.chart === item.slug).map((note) => note.payload),
    }));
    data.series = data.series.map((item) =>
      item.id === 'github' || item.id === 'rising'
        ? {
            ...item,
            metrics: [
              ...[
                { key: 'stars', label: 'Stars' },
                { key: 'forks', label: 'Forks' },
                { key: 'contributors', label: 'Contributeurs' },
              ].map((metric) => ({
                ...metric,
                unit: 'count',
                source: 'GitHub API',
                url: 'https://docs.github.com/en/graphql/reference/repos',
              })),
              ...[
                { key: 'stars7d', label: 'Stars gagnées (7 jours)' },
                { key: 'growth', label: 'Croissance (%)' },
                { key: 'forks7d', label: 'Forks gagnés (7 jours)' },
                { key: 'contributorsDelta', label: 'Évolution des contributeurs' },
                { key: 'activityScore', label: 'Activité du dépôt' },
                { key: 'acceleration', label: 'Accélération (%)' },
              ].map((metric) => ({
                ...metric,
                unit: 'count',
                source: 'Calcul SANDBOX sur les relevés GitHub',
                url: `/charts/${item.slug}/methodology`,
              })),
            ],
          }
        : item,
    );
    data.takes = editorial.flatMap((note) =>
      note.payload.insights
        .filter((insight) => insight.sandboxTake)
        .map((insight) => ({
          chart: note.chart,
          week: note.payload.week,
          entity: insight.entity,
          text: insight.sandboxTake,
          author: insight.author || 'SANDBOX',
        })),
    );
    data.episodes = allEpisodes()
      .filter((episode) => episode.hosts.every((host) => !getHost(host).placeholder))
      .flatMap((episode) =>
        episode.charts.map((chart) => ({
          ...chart,
          number: episode.number,
          title: episode.title,
          href: `/episodes/${episode.number}`,
        })),
      );
  } catch (error) {
    data.mode = 'unavailable';
    console.error('SANDBOX CHARTS unavailable:', error instanceof Error ? error.name : 'database');
  }
  return data;
});
