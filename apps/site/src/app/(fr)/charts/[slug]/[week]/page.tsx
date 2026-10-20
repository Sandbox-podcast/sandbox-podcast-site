import { notFound } from 'next/navigation';
import { ChartScreen } from '@/components/chart-screen';
import { ChartsExperience } from '@/components/charts-experience';
import { sandboxChartsData } from '@/lib/sandbox-charts';
import { findChart, weeksOf } from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';
import { hasChartEdition } from '@/domain/sandbox-charts';
import { chartMetadataCopy } from '@/domain/chart-seo-copy';
import { chartSelectionSchema, hasChartSelectionQuery } from '@/domain/chart-selection';
import { chartIdForSlug, hasIndexableChartContent } from '@/domain/chart-seo';
import { editionFromRoute } from '@/domain/edition-route';
export const dynamicParams = true;
export const dynamic = 'force-dynamic';
interface Props {
  params: Promise<{
    slug: string;
    week: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  locale?: string;
}
export async function generateMetadata({ params, searchParams, locale = 'fr-FR' }: Props) {
  const { slug, week: rawWeek } = await params;
  const week = editionFromRoute(rawWeek);
  const chart = findChart(slug);
  if (!chart || !week) return {};
  const chartId = chartIdForSlug(slug);
  const data = chartId ? await sandboxChartsData(week) : undefined;
  return pageMetadata({
    ...chartMetadataCopy(chartId ?? 'models', locale, week),
    path: `/charts/${chart.slug}/${week}`,
    ...(chartId && data
      ? {
          noindex:
            !hasIndexableChartContent(data, chartId, week) ||
            hasChartSelectionQuery(await searchParams),
        }
      : {}),
    ownImage: true,
  });
}
export default async function ChartWeekPage({ params, searchParams }: Props) {
  const { slug, week: rawWeek } = await params;
  const week = editionFromRoute(rawWeek);
  const selection = chartSelectionSchema.parse(await searchParams);
  if (!findChart(slug) || !week) notFound();
  if (slug === 'github' || slug === 'skills' || slug === 'ai-models' || slug === 'open-source-ai') {
    const chartId = slug === 'ai-models' || slug === 'open-source-ai' ? 'models' : slug;
    const data = await sandboxChartsData(week);
    if (data.mode !== 'unavailable' && !hasChartEdition(data, chartId, week)) notFound();
    return (
      <ChartsExperience
        data={data}
        initialWeek={week}
        initialChart={chartId}
        initialView={
          slug === 'open-source-ai' ? 'open' : slug === 'ai-models' ? selection.view : undefined
        }
        initialPeriod={selection.period}
        initialSelection={selection}
      />
    );
  }
  if (!weeksOf(slug).includes(week)) notFound();
  return <ChartScreen slug={slug} week={week} />;
}
