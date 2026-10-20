import { notFound } from 'next/navigation';
import { ChartsExperience } from '@/components/charts-experience';
import { sandboxChartsData } from '@/lib/sandbox-charts';
import { chartSelectionSchema, hasChartSelectionQuery } from '@/domain/chart-selection';
import { hasChartEdition } from '@/domain/sandbox-charts';
import { hasIndexableChartContent } from '@/domain/chart-seo';
import { editionFromRoute } from '@/domain/edition-route';
import { pageMetadata } from '@/lib/seo';
import { chartMetadataCopy } from '@/domain/chart-seo-copy';
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
    ...chartMetadataCopy('rising', locale, week),
    path: `/charts/rising/${week}`,
    noindex:
      !hasIndexableChartContent(data, 'rising', week) || hasChartSelectionQuery(await searchParams),
    ownImage: true,
  });
}
export default async function RisingWeekPage({
  params,
  searchParams,
}: {
  params: Promise<{
    week: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const week = editionFromRoute((await params).week);
  const selection = chartSelectionSchema.parse(await searchParams);
  if (!week) notFound();
  const data = await sandboxChartsData(week);
  if (data.mode !== 'unavailable' && !hasChartEdition(data, 'rising', week)) notFound();
  return (
    <ChartsExperience
      data={data}
      initialWeek={week}
      initialChart="rising"
      initialPeriod={selection.period}
      initialSelection={selection}
    />
  );
}
