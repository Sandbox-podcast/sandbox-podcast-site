import { redirect } from 'next/navigation';
import { DiscoveryHome } from '@/components/discovery-home';
import {
  chartSelectionQuery,
  chartSelectionSchema,
  hasChartSelectionQuery,
} from '@/domain/chart-selection';
import { siteConfig } from '@/config/site';
import { indexableEpisode } from '@/domain/episode-seo';
import { allEpisodes, publicHosts } from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';
import { preparePublicEditorialContent } from '@/lib/admin-persistence';
import { timeMachineData } from '@/lib/time-machine';
import { personalProjects } from '@/lib/personal-projects';
import { localizedHref } from '@/i18n/routing';
import { interpolateText } from '@/i18n/translation';
import { newsPageAvailable } from '@/lib/news-page-data';

// Le build ne lit pas Postgres : l'accueil doit charger la publication à chaque requête.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams = Promise.resolve({}),
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await preparePublicEditorialContent();
  const hasPublishedEpisode = allEpisodes().some(indexableEpisode);
  return pageMetadata({
    title: interpolateText("{name} : ce que l'IA change pour les produits et les équipes tech", {
      name: siteConfig.name,
    }),
    description: siteConfig.description,
    path: '/',
    noindex:
      (!hasPublishedEpisode &&
        timeMachineData().events.length === 0 &&
        personalProjects.length === 0) ||
      hasChartSelectionQuery(await searchParams),
    ownImage: true,
  });
}
export default async function HomePage({
  searchParams = Promise.resolve({}),
  locale = 'fr-FR',
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  locale?: string;
}) {
  const params = await searchParams;
  if (hasChartSelectionQuery(params)) {
    const query = chartSelectionQuery('', chartSelectionSchema.parse(params));
    redirect(localizedHref(`/charts${query ? `?${query}` : ''}`, locale));
  }
  await preparePublicEditorialContent();
  return (
    <DiscoveryHome
      episodes={allEpisodes()}
      hosts={publicHosts()}
      projects={personalProjects}
      videoClubEnabled
      newsAvailable={await newsPageAvailable()}
      historyData={timeMachineData()}
    />
  );
}
