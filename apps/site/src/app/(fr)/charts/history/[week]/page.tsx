import { notFound } from 'next/navigation';
import { ChartsExperience } from '@/components/charts-experience';
import { editionFromRoute } from '@/domain/edition-route';
import { sandboxChartsData } from '@/lib/sandbox-charts';
import { pageMetadata } from '@/lib/seo';
import { hasIndexableChartArchive } from '@/domain/chart-seo';
import { chartSelectionSchema, hasChartSelectionQuery } from '@/domain/chart-selection';
import { chartArchiveMetadataCopy } from '@/domain/chart-seo-copy';
export const dynamicParams = true;
export async function generateMetadata({
  params,
  searchParams = Promise.resolve({}),
  locale = 'fr-FR',
}: {
  params: Promise<{
    week: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  locale?: string;
}) {
  const week = editionFromRoute((await params).week);
  if (!week) return {};
  const data = await sandboxChartsData(week);
  return pageMetadata({
    ...chartArchiveMetadataCopy(week, locale),
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
  return (
    <ChartsExperience
      data={data}
      initialWeek={week}
      initialSelection={selection}
      pageKind="archive"
    />
  );
}
