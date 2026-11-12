import { DiscoveryHome } from '@/components/discovery-home';
import { siteConfig } from '@/config/site';
import { indexableEpisode } from '@/domain/episode-seo';
import { allEpisodes, publicHosts } from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';
import { preparePublicEditorialContent } from '@/lib/admin-persistence';
import { personalProjects } from '@/lib/personal-projects';
import { interpolateText } from '@/i18n/translation';

// Page mise en cache (ISR) ; l'admin la revalide à chaque publication.
export const revalidate = 3600;

export async function generateMetadata() {
  await preparePublicEditorialContent();
  const hasPublishedEpisode = allEpisodes().some(indexableEpisode);
  return pageMetadata({
    title: interpolateText("{name} : ce que l'IA change pour les produits et les équipes tech", {
      name: siteConfig.name,
    }),
    description: siteConfig.description,
    path: '/',
    noindex: !hasPublishedEpisode && personalProjects.length === 0,
    ownImage: true,
  });
}
export default async function HomePage() {
  await preparePublicEditorialContent();
  return (
    <DiscoveryHome
      episodes={allEpisodes()}
      hosts={publicHosts()}
      projects={personalProjects}
      videoClubEnabled
    />
  );
}
