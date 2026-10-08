import { ChartsExperience } from '@/components/charts-experience';
import { sandboxChartsData } from '@/lib/sandbox-charts';
import { pageMetadata } from '@/lib/seo';
import { hasIndexableChartContent } from '@/domain/chart-seo';

export async function generateMetadata() {
  const data = await sandboxChartsData();
  return pageMetadata({
    title: 'SANDBOX CHARTS | Rising 20',
    description: "Les projets IA dont l'accélération mesurée mérite votre attention.",
    path: '/charts/rising',
    noindex: !hasIndexableChartContent(data, 'rising'),
  });
}
export default async function RisingPage() {
  return <ChartsExperience data={await sandboxChartsData()} initialChart="rising" />;
}
