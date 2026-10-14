import type { MetadataRoute } from 'next';
import { isMock } from '@/config/site';
import { absoluteUrl } from '@/lib/seo';
import { preparePublishedEditorialContent } from '@/lib/admin-persistence';
import {
  publishedChartSitemapPaths,
  type PublishedChartEditionForSitemap,
} from '@/domain/chart-seo';
import { publicChartHistory, publicGithubRankedProjectSlugs } from '@/lib/charts-public';
import { publicLocalizedSitePages, publicRankingCollectionPages } from '@/lib/localized-content';
import { isLocaleUiReviewed } from '@/i18n/messages';
import { localeRouteSegment } from '@/i18n/locales';
import { allEntities, allEpisodes, allTopics, entityPath } from '@/lib/repository';
import { indexableEpisode } from '@/domain/episode-seo';
import { uniqueSitemapEntries } from '@/domain/site-sitemap';
import { personalProjects } from '@/lib/personal-projects';
import { personalProjectPath } from '@/domain/personal-projects';

export const dynamic = 'force-dynamic';

/** Chaque URL annoncée correspond à un contenu réellement publié et indexable. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await preparePublishedEditorialContent();
  const entry = (
    path: string,
    lastModified?: string,
    priority = 0.5,
  ): MetadataRoute.Sitemap[number] => ({
    url: absoluteUrl(path),
    ...(lastModified ? { lastModified } : {}),
    priority,
  });
  const chartReads = await Promise.allSettled([
    publicChartHistory('github'),
    publicChartHistory('rising'),
    publicChartHistory('skills'),
    publicChartHistory('models'),
    publicGithubRankedProjectSlugs(),
    publicRankingCollectionPages(),
    publicLocalizedSitePages(),
  ]);
  for (const result of chartReads) {
    if (result.status === 'rejected') {
      console.error(
        'SANDBOX CHARTS sitemap data unavailable:',
        result.reason instanceof Error ? result.reason.name : 'unknown',
      );
    }
  }
  const [
    githubResult,
    risingResult,
    skillsResult,
    modelsResult,
    projectResult,
    localizedRankingResult,
    localizedSiteResult,
  ] = chartReads;
  const github = githubResult.status === 'fulfilled' ? githubResult.value : [];
  const rising = risingResult.status === 'fulfilled' ? risingResult.value : [];
  const skills = skillsResult.status === 'fulfilled' ? skillsResult.value : [];
  const models = modelsResult.status === 'fulfilled' ? modelsResult.value : [];
  const projects = projectResult.status === 'fulfilled' ? projectResult.value : [];
  const localizedRankings =
    localizedRankingResult.status === 'fulfilled' ? localizedRankingResult.value : [];
  const localizedSitePages =
    localizedSiteResult.status === 'fulfilled' ? localizedSiteResult.value : [];
  const editions: PublishedChartEditionForSitemap[] = [
    ...github,
    ...rising,
    ...skills,
    ...models,
  ].map((edition) => ({
    chart: edition.chart,
    week: edition.week,
    entries: edition.entries,
  }));
  const chartEntries = publishedChartSitemapPaths(editions, projects)
    .filter((path) => !isMock || !path.endsWith('/methodology'))
    .map((path) => {
      const priority =
        path === '/charts'
          ? 0.9
          : path.endsWith('/methodology')
            ? 0.6
            : path === '/charts/history'
              ? 0.6
              : path.startsWith('/charts/project/')
                ? 0.5
                : 0.3;
      return entry(path, undefined, priority);
    });
  const localizedEntries = [
    ...localizedRankings
      .filter((page) => isLocaleUiReviewed(page.localization.locale))
      .map((page) => entry(page.localization.path, page.publishedAt, 0.8)),
    ...localizedSitePages
      .filter((page) => isLocaleUiReviewed(page.locale))
      .map((page) =>
        entry(page.path, page.publishedAt, page.contentKind === 'episode' ? 0.8 : 0.6),
      ),
  ];
  const localizedRankingHubs = [
    ...new Set(
      localizedRankings.flatMap((page) => {
        if (!isLocaleUiReviewed(page.localization.locale)) return [];
        const prefix = localeRouteSegment(page.localization.locale);
        return prefix ? [`/${prefix}/charts`] : [];
      }),
    ),
  ].map((path) => entry(path, undefined, 0.8));
  const episodes = allEpisodes().filter(indexableEpisode);
  const topics = allTopics().filter((topic) =>
    episodes.some((episode) => episode.topics.includes(topic.slug)),
  );
  return uniqueSitemapEntries([
    ...(episodes.length || chartEntries.length ? [entry('/', undefined, 1)] : []),
    ...chartEntries,
    ...localizedEntries,
    ...localizedRankingHubs,
    ...(episodes.length ? [entry('/episodes', undefined, 0.8)] : []),
    ...episodes.map((e) => entry(`/episodes/${String(e.number)}`, e.publishedAt, 0.8)),
    ...(topics.length ? [entry('/topics', undefined, 0.5)] : []),
    ...topics.map((t) => entry(`/topics/${t.slug}`, undefined, 0.4)),
    ...(!isMock ? allEntities().map((e) => entry(entityPath(e), undefined, 0.6)) : []),
    entry('/about', undefined, 0.4),
    entry('/nos-projets', undefined, 0.7),
    ...personalProjects.map((project) =>
      entry(personalProjectPath(project.slug), project.verifiedAt, 0.6),
    ),
  ]);
}
