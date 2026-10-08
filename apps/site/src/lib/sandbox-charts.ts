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
import { readPublishedEntitySources } from './external-charts-store.ts';
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
    data.series = data.series.map((item) => {
      const itemSnapshots = snapshots.filter(
        (snapshot) => snapshot.chart === item.id || snapshot.chart === item.slug,
      );
      const dimensions = new Map(
        itemSnapshots.flatMap((snapshot) =>
          snapshot.entries.flatMap((entry) =>
            Object.keys(entry.dimensions).map((id) => [id, id] as const),
          ),
        ),
      );
      const modelLabels: Record<string, string> = {
        quality: 'Overall quality',
        coding: 'Coding',
        reasoning: 'Reasoning',
        maths: 'Maths',
        agents: 'Agentic',
        multimodal: 'Vision',
        research: 'Search and research',
        longContext: 'Context length',
        speed: 'Throughput',
        price: 'Price',
        reach: 'Reach',
        value: 'Value',
      };
      const skillLabels: Record<string, string> = {
        growth: 'Install growth',
        githubGrowth: 'GitHub star growth',
        reach: 'Skills.sh install reach',
        freshness: 'Repository freshness',
        momentum: 'Cross-source momentum',
      };
      return {
        ...item,
        snapshots: itemSnapshots,
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
          : item.id === 'models'
            ? {
                dimensions: [...dimensions.keys()]
                  .sort((a, b) => a.localeCompare(b))
                  .map((id) => ({ id, label: modelLabels[id] ?? id })),
              }
            : item.id === 'skills'
              ? {
                  dimensions: [...dimensions.keys()]
                    .sort((a, b) => a.localeCompare(b))
                    .map((id) => ({ id, label: skillLabels[id] ?? id })),
                }
              : {}),
        ...(item.id === 'skills'
          ? {
              metrics: [
                {
                  key: 'installs',
                  label: 'Installations cumulées',
                  unit: 'count',
                  source: 'Skills.sh',
                  url: 'https://www.skills.sh/docs/api',
                },
                {
                  key: 'installs7d',
                  label: 'Installations gagnées (7 jours)',
                  unit: 'count',
                  source: 'Calcul SANDBOX depuis Skills.sh',
                  url: 'https://www.skills.sh/docs/api',
                },
                {
                  key: 'stars',
                  label: 'Stars GitHub',
                  unit: 'count',
                  source: 'GitHub REST API',
                  url: 'https://docs.github.com/en/rest/repos/repos#get-a-repository',
                },
                {
                  key: 'stars7d',
                  label: 'Stars gagnées (7 jours)',
                  unit: 'count',
                  source: 'Calcul SANDBOX depuis GitHub',
                  url: 'https://docs.github.com/en/rest/repos/repos#get-a-repository',
                },
                {
                  key: 'forks',
                  label: 'Forks GitHub',
                  unit: 'count',
                  source: 'GitHub REST API',
                  url: 'https://docs.github.com/en/rest/repos/repos#get-a-repository',
                },
                {
                  key: 'freshness',
                  label: 'Fraîcheur du dépôt',
                  unit: 'score',
                  source: 'Calcul SANDBOX depuis GitHub',
                  url: 'https://docs.github.com/en/rest/repos/repos#get-a-repository',
                },
              ],
            }
          : item.id === 'models'
            ? {
                metrics: [
                  {
                    key: 'arenaQuality',
                    label: 'Elo Arena (texte)',
                    unit: 'score',
                    source: 'Arena',
                    url: 'https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset',
                  },
                  {
                    key: 'artificialAnalysisIntelligence',
                    label: 'Artificial Analysis Intelligence Index',
                    unit: 'score',
                    source: 'Artificial Analysis via OpenRouter',
                    url: 'https://openrouter.ai/docs/api/api-reference/benchmarks/get-benchmarks',
                  },
                  {
                    key: 'arenaCoding',
                    label: 'Elo Arena (WebDev)',
                    unit: 'score',
                    source: 'Arena WebDev',
                    url: 'https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset',
                  },
                  {
                    key: 'arenaAgent',
                    label: 'Elo Arena (agents)',
                    unit: 'score',
                    source: 'Arena Agent',
                    url: 'https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset',
                  },
                  {
                    key: 'arenaVision',
                    label: 'Elo Arena (vision)',
                    unit: 'score',
                    source: 'Arena Vision',
                    url: 'https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset',
                  },
                  {
                    key: 'arenaSearch',
                    label: 'Elo Arena (search)',
                    unit: 'score',
                    source: 'Arena Search',
                    url: 'https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset',
                  },
                  {
                    key: 'downloads30d',
                    label: 'Téléchargements Hugging Face (30 jours)',
                    unit: 'count',
                    source: 'Hugging Face Hub',
                    url: 'https://huggingface.co/docs/hub/api',
                  },
                  {
                    key: 'contextLength',
                    label: 'Fenêtre de contexte (tokens)',
                    unit: 'tokens',
                    source: 'OpenRouter',
                    url: 'https://openrouter.ai/docs/api/api-reference/models/get-models',
                  },
                  {
                    key: 'promptPricePerMillion',
                    label: 'Prix entrée / million de tokens',
                    unit: 'usd',
                    source: 'OpenRouter',
                    url: 'https://openrouter.ai/docs/api/api-reference/models/get-models',
                  },
                  {
                    key: 'completionPricePerMillion',
                    label: 'Prix sortie / million de tokens',
                    unit: 'usd',
                    source: 'OpenRouter',
                    url: 'https://openrouter.ai/docs/api/api-reference/models/get-models',
                  },
                  {
                    key: 'openRouterWeeklyRank',
                    label: 'Rang d’usage hebdomadaire OpenRouter',
                    unit: 'count',
                    source: 'OpenRouter',
                    url: 'https://openrouter.ai/docs/api/api-reference/models/get-models',
                  },
                  {
                    key: 'openRouterThroughputRank',
                    label: 'Rang de débit OpenRouter',
                    unit: 'count',
                    source: 'OpenRouter',
                    url: 'https://openrouter.ai/docs/api/api-reference/models/get-models',
                  },
                ],
              }
            : {}),
      };
    });
    const sourceRows = await readPublishedEntitySources(slugs);
    const sourceLinks = new Map<
      string,
      { kind: 'github' | 'huggingface' | 'other'; label: string; url: string }[]
    >();
    for (const row of sourceRows) {
      if (!row.source) continue;
      const links = sourceLinks.get(row.entity.slug) ?? [];
      const link = {
        kind:
          row.source.provider === 'github'
            ? ('github' as const)
            : row.source.provider === 'huggingface'
              ? ('huggingface' as const)
              : ('other' as const),
        label: row.source.label,
        url: row.source.url,
      };
      if (!links.some((existing) => existing.url === link.url)) links.push(link);
      sourceLinks.set(row.entity.slug, links);
    }
    data.entities = entities.map(({ entity, repo }) => {
      const kind =
        entity.type === 'model'
          ? 'model'
          : entity.type === 'skill' || entity.type === 'mcp' || entity.type === 'agent'
            ? 'tool'
            : 'project';
      const links = sourceLinks.get(entity.slug);
      return {
        slug: entity.slug,
        name: entity.name,
        kind,
        org: entity.organization ?? repo?.owner,
        tagline: (entity.description ?? repo?.description ?? entity.name).slice(0, 110),
        description: entity.description ?? repo?.description ?? entity.name,
        category: entity.category,
        topics: [],
        links: links?.length
          ? links
          : repo
            ? [{ kind: 'github' as const, label: repo.fullName, url: entity.sourceUrl }]
            : [{ kind: 'other' as const, label: entity.name, url: entity.sourceUrl }],
        href: repo ? `/charts/project/${entity.slug}` : entity.sourceUrl,
        ...(entity.openWeights !== null ? { openWeights: entity.openWeights } : {}),
        ...(repo ? { github: { repo: repo.fullName } } : {}),
      };
    });
    data.series = data.series.map((item) => ({
      ...item,
      editions: editorial
        .filter((note) => note.chart === item.slug || note.chart === item.id)
        .map((note) => note.payload),
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
