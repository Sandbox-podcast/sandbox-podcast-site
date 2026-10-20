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
      'Compare les projets GitHub, les skills et les modèles IA à partir des mesures disponibles. Des classements datés, avec leurs critères et leurs sources pour choisir quoi tester.',
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
      <ChartsExperience data={data} initialSelection={selection} pageKind="collection" />
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Classements de projets open source, de skills et de modèles IA',
            url: absoluteUrl('/charts'),
            description:
              'Projets open source, skills et modèles IA, avec éditions datées et méthodes publiques.',
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
