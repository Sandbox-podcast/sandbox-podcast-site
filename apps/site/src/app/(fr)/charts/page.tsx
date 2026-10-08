import { ChartsExperience } from '@/components/charts-experience';
import { JsonLd } from '@/components/json-ld';
import { sandboxChartsData } from '@/lib/sandbox-charts';
import { absoluteUrl, breadcrumbLd, pageMetadata } from '@/lib/seo';
import { hasIndexableChartCollection } from '@/domain/chart-seo';

export async function generateMetadata() {
  const data = await sandboxChartsData();
  return pageMetadata({
    title: 'SANDBOX CHARTS | Les classements hebdomadaires de l’IA',
    description:
      'GitHub Top 20, Skills, Models et Rising. Les positions, les mouvements et les projets IA à surveiller, chaque semaine.',
    path: '/charts',
    noindex: !hasIndexableChartCollection(data),
  });
}
export default async function ChartsPage() {
  const data = await sandboxChartsData();
  return (
    <>
      <ChartsExperience data={data} />
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'SANDBOX CHARTS',
            url: absoluteUrl('/charts'),
            description: 'Les classements hebdomadaires de ce qui compte dans l’IA.',
          },
          breadcrumbLd([
            { name: 'Accueil', path: '/' },
            { name: 'SANDBOX CHARTS', path: '/charts' },
          ]),
        ]}
      />
    </>
  );
}
