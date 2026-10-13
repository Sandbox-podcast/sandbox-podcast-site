import { ChartsExperience } from '@/components/charts-experience';
import { sandboxChartsData } from '@/lib/sandbox-charts';
import { pageMetadata } from '@/lib/seo';
import { hasIndexableChartContent } from '@/domain/chart-seo';
import { chartSelectionSchema, hasChartSelectionQuery } from '@/domain/chart-selection';
import { GithubBurstPanel } from '@/components/github-burst-panel';
export async function generateMetadata({
  searchParams = Promise.resolve({}),
}: { searchParams?: Promise<Record<string, string | string[] | undefined>> } = {}) {
  const data = await sandboxChartsData();
  return pageMetadata({
    title: 'SANDBOX CHARTS | Rising 20',
    description: "Les projets open source dont l'accélération mesurée mérite votre attention.",
    path: '/charts/rising',
    ownImage: true,
    noindex:
      !hasIndexableChartContent(data, 'rising') || hasChartSelectionQuery(await searchParams),
  });
}
export default async function RisingPage({
  searchParams = Promise.resolve({}),
}: { searchParams?: Promise<Record<string, string | string[] | undefined>> } = {}) {
  const selection = chartSelectionSchema.parse(await searchParams);
  return (
    <>
      <ChartsExperience
        data={await sandboxChartsData()}
        initialChart="rising"
        initialSelection={selection}
      />
      <GithubBurstPanel />
    </>
  );
}
