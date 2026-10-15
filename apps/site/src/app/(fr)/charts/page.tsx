import { ChartsExperience } from '@/components/charts-experience';
import { JsonLd } from '@/components/json-ld';
import { sandboxChartsData } from '@/lib/sandbox-charts';
import { absoluteUrl, breadcrumbLd, pageMetadata } from '@/lib/seo';
import { hasIndexableChartCollection } from '@/domain/chart-seo';
import { chartSelectionSchema, hasChartSelectionQuery } from '@/domain/chart-selection';
export async function generateMetadata({
  searchParams = Promise.resolve({}),
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await sandboxChartsData();
  return pageMetadata({
    title: 'SANDBOX CHARTS | Classements open source, skills et IA',
    description:
      'Classements GitHub de projets open source, skills et modèles IA. Popularité, progression, qualité et méthodes publiques.',
    path: '/charts',
    ownImage: true,
    noindex: !hasIndexableChartCollection(data) || hasChartSelectionQuery(await searchParams),
  });
}
export default async function ChartsPage({
  searchParams = Promise.resolve({}),
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await sandboxChartsData();
  const selection = chartSelectionSchema.parse(await searchParams);
  return (
    <>
      <ChartsExperience data={data} initialSelection={selection} />
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'SANDBOX CHARTS',
            url: absoluteUrl('/charts'),
            description: 'Projets open source, skills et modèles IA à suivre chaque semaine.',
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
