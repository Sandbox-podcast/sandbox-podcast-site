import { notFound } from 'next/navigation';
import { ChartsExperience } from '@/components/charts-experience';
import { editionFromRoute } from '@/domain/edition-route';
import { sandboxChartsData } from '@/lib/sandbox-charts';
import { pageMetadata } from '@/lib/seo';
import { hasIndexableChartArchive } from '@/domain/chart-seo';
import { chartSelectionSchema, hasChartSelectionQuery } from '@/domain/chart-selection';
export const dynamicParams = true;
export async function generateMetadata({
  params,
  searchParams = Promise.resolve({}),
}: {
  params: Promise<{
    week: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const week = editionFromRoute((await params).week);
  if (!week) return {};
  const data = await sandboxChartsData(week);
  return pageMetadata({
    title: `Archives des classements · ${week} · SANDBOX CHARTS`,
    description: `Les positions et les mouvements de l'édition ${week}.`,
    path: `/charts/history/${week}`,
    noindex: !hasIndexableChartArchive(data, week) || hasChartSelectionQuery(await searchParams),
  });
}
export default async function Page({
  params,
  searchParams = Promise.resolve({}),
}: {
  params: Promise<{
    week: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const week = editionFromRoute((await params).week);
  if (!week) notFound();
  const data = await sandboxChartsData(week);
  if (data.mode !== 'unavailable' && !data.weeks.includes(week)) notFound();
  const selection = chartSelectionSchema.parse(await searchParams);
  return <ChartsExperience data={data} initialWeek={week} initialSelection={selection} />;
}
