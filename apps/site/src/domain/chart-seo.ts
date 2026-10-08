import { slugSchema } from './schema.ts';
import type { ChartId, ChartsData } from './sandbox-charts.ts';

export interface PublishedChartEditionForSitemap {
  chart: 'github' | 'rising';
  week: string;
  entries: number;
}

const WEEK_ID = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/;

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
  const weeks = { github: new Set<string>(), rising: new Set<string>() };
  for (const edition of editions) {
    if (edition.entries > 0 && WEEK_ID.test(edition.week)) weeks[edition.chart].add(edition.week);
  }

  const githubWeeks = [...weeks.github].sort().reverse();
  const risingWeeks = [...weeks.rising].sort().reverse();
  const allWeeks = [...new Set([...githubWeeks, ...risingWeeks])].sort().reverse();
  const paths = ['/charts/github/methodology', '/charts/rising/methodology'];

  if (allWeeks.length > 0) {
    paths.push('/charts', '/charts/history');
    paths.push(...allWeeks.map((week) => `/charts/history/${week}`));
  }

  if (githubWeeks.length > 0) {
    paths.push('/charts/github');
    paths.push(...githubWeeks.map((week) => `/charts/github/${week}`));
    paths.push(
      ...[...new Set(projectSlugs)]
        .filter((slug) => slugSchema.safeParse(slug).success)
        .sort()
        .map((slug) => `/charts/project/${slug}`),
    );
  }

  if (risingWeeks.length > 0) {
    paths.push('/charts/rising');
    paths.push(...risingWeeks.map((week) => `/charts/rising/${week}`));
  }

  return [...new Set(paths)];
}
