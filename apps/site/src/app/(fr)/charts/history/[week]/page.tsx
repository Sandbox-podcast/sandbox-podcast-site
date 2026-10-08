import { notFound } from 'next/navigation';
import { ChartsExperience } from '@/components/charts-experience';
import { weekIdSchema } from '@/domain/schema';
import { sandboxChartsData } from '@/lib/sandbox-charts';
import { pageMetadata } from '@/lib/seo';
import { hasIndexableChartArchive } from '@/domain/chart-seo';

export const dynamicParams = true;
export async function generateMetadata({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  if (!weekIdSchema.safeParse(week).success) return {};
  const data = await sandboxChartsData(week);
  return pageMetadata({
    title: `Archives des classements · ${week} · SANDBOX CHARTS`,
    description: `Les éditions publiées de la semaine ${week}, leurs positions et leurs mouvements.`,
    path: `/charts/history/${week}`,
    noindex: !hasIndexableChartArchive(data, week),
  });
}

export default async function Page({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  if (!weekIdSchema.safeParse(week).success) notFound();
  const data = await sandboxChartsData(week);
  if (data.mode !== 'unavailable' && !data.weeks.includes(week)) notFound();
  return <ChartsExperience data={data} />;
}
