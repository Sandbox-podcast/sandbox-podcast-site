import { editionIdSchema, slugSchema } from './schema.ts';
import type { ChartId, ChartsData } from './sandbox-charts.ts';

export interface PublishedChartEditionForSitemap {
  chart: ChartId;
  week: string;
  entries: number;
  publishedAt?: string | null;
}

/** Date d’une publication réelle, limitée aux données effectivement rendues par cette URL. */
export function publishedChartSitemapLastModified(
  path: string,
  editions: readonly PublishedChartEditionForSitemap[],
): string | undefined {
  const eligible = editions.filter(
    (edition) =>
      edition.entries > 0 &&
      editionIdSchema.safeParse(edition.week).success &&
      edition.publishedAt &&
      Number.isFinite(Date.parse(edition.publishedAt)),
  );
  let matching: typeof eligible;
  if (path === '/charts' || path === '/charts/history') matching = eligible;
  else if (path.startsWith('/charts/history/'))
    matching = eligible.filter((edition) => edition.week === path.slice('/charts/history/'.length));
  else {
    const [, slug, week] = /^\/charts\/([^/]+)(?:\/([^/]+))?$/.exec(path) ?? [];
    const chart = slug ? chartIdForSlug(slug) : undefined;
    if (!chart || week === 'methodology') return undefined;
    matching = eligible.filter(
      (edition) => edition.chart === chart && (!week || edition.week === week),
    );
  }
  return matching
    .flatMap((edition) => (edition.publishedAt ? [edition.publishedAt] : []))
    .toSorted((left, right) => Date.parse(right) - Date.parse(left))[0];
}

export function chartIdForSlug(slug: string): ChartId | undefined {
  switch (slug) {
    case 'github':
      return 'github';
    case 'skills':
      return 'skills';
    case 'ai-models':
    case 'open-source-ai':
      return 'models';
    case 'rising':
      return 'rising';
    default:
      return undefined;
  }
}

/** Les pages de classement ne sont indexables que si une édition réelle et non vide est publiée. */
export function hasIndexableChartContent(data: ChartsData, chart: ChartId, week?: string): boolean {
  if (data.mode !== 'live') return false;
  return data.series.some(
    (series) =>
      series.id === chart &&
      series.snapshots.some(
        (snapshot) => snapshot.entries.length > 0 && (!week || snapshot.week === week),
      ),
  );
}

export function hasIndexableChartCollection(data: ChartsData): boolean {
  return data.mode === 'live' && data.weeks.length > 0;
}

export function hasIndexableChartArchive(data: ChartsData, week: string): boolean {
  return data.mode === 'live' && data.weeks.includes(week);
}

/** Construit les seules URL SANDBOX CHARTS qui correspondent à des éditions réellement publiées. */
export function publishedChartSitemapPaths(
  editions: readonly PublishedChartEditionForSitemap[],
  projectSlugs: readonly string[] = [],
): string[] {
  const weeks: Record<ChartId, Set<string>> = {
    github: new Set(),
    rising: new Set(),
    skills: new Set(),
    models: new Set(),
  };
  for (const edition of editions) {
    if (edition.entries > 0 && editionIdSchema.safeParse(edition.week).success)
      weeks[edition.chart].add(edition.week);
  }

  const chartSlugs: Record<ChartId, string> = {
    github: 'github',
    rising: 'rising',
    skills: 'skills',
    models: 'ai-models',
  };
  const allWeeks = [...new Set(Object.values(weeks).flatMap((items) => [...items]))]
    .sort()
    .reverse();
  const paths = ['/charts/github/methodology', '/charts/rising/methodology'];
  if (weeks.skills.size > 0) paths.push(`/charts/${chartSlugs.skills}/methodology`);
  if (weeks.models.size > 0) paths.push(`/charts/${chartSlugs.models}/methodology`);

  if (allWeeks.length > 0) {
    paths.push('/charts', '/charts/history');
    paths.push(...allWeeks.map((week) => `/charts/history/${week}`));
  }

  for (const chart of ['github', 'skills', 'models', 'rising'] as const) {
    const chartWeeks = [...weeks[chart]].sort().reverse();
    if (!chartWeeks.length) continue;
    const slug = chartSlugs[chart];
    paths.push(`/charts/${slug}`);
    paths.push(...chartWeeks.map((week) => `/charts/${slug}/${week}`));
    if (chart === 'github') {
      paths.push(
        ...[...new Set(projectSlugs)]
          .filter((slug) => slugSchema.safeParse(slug).success)
          .sort()
          .map((slug) => `/charts/project/${slug}`),
      );
    }
  }

  return [...new Set(paths)];
}
