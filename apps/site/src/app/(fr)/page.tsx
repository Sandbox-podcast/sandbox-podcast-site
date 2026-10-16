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
import { preparePublishedEditorialContent } from '@/lib/admin-persistence';
import { timeMachineData } from '@/lib/time-machine';
import { personalProjects } from '@/lib/personal-projects';
import { localizedHref } from '@/i18n/routing';

// Le build ne lit pas Postgres : l'accueil doit charger la publication à chaque requête.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams = Promise.resolve({}),
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await preparePublishedEditorialContent();
  const hasPublishedEpisode = allEpisodes().some(indexableEpisode);
  return pageMetadata({
    title: `${siteConfig.name} : comprendre l'IA en la pratiquant`,
    description:
      "Le Talk Show IA et tech de Lou, Loïc et Nico. Chaque semaine, leurs essais d'outils IA et les projets qu'ils construisent avec.",
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
  await preparePublishedEditorialContent();
  return (
    <DiscoveryHome
      episodes={allEpisodes()}
      hosts={publicHosts()}
      projects={personalProjects}
      videoClubEnabled={process.env.NODE_ENV === 'development'}
    />
  );
}
