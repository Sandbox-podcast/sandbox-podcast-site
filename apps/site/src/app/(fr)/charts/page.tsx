import { ChartsExperience } from '@/components/charts-experience';
import { JsonLd } from '@/components/json-ld';
import { sandboxChartsData } from '@/lib/sandbox-charts';
import { absoluteUrl, breadcrumbLd, pageMetadata } from '@/lib/seo';
import { hasIndexableChartCollection } from '@/domain/chart-seo';
import { chartSelectionSchema, hasChartSelectionQuery } from '@/domain/chart-selection';
export async function generateMetadata({
  searchParams = Promise.resolve({}),
}: { searchParams?: Promise<Record<string, string | string[] | undefined>> } = {}) {
  const data = await sandboxChartsData();
  return pageMetadata({
    title: 'SANDBOX CHARTS | The weekly charts of what matters in AI.',
    description:
      'GitHub Top 20, Skills, Models et Rising. Les positions, les mouvements et les projets IA à surveiller, chaque semaine.',
    path: '/charts',
    noindex: !hasIndexableChartCollection(data) || hasChartSelectionQuery(await searchParams),
  });
}
export default async function ChartsPage({
  searchParams = Promise.resolve({}),
}: { searchParams?: Promise<Record<string, string | string[] | undefined>> } = {}) {
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
            description: 'The weekly charts of what matters in AI.',
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
