import { notFound } from 'next/navigation';
import { ChartScreen } from '@/components/chart-screen';
import { ChartsExperience } from '@/components/charts-experience';
import { sandboxChartsData } from '@/lib/sandbox-charts';
import { findChart, weeksOf } from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';
import { CHART_LABELS, hasChartEdition } from '@/domain/sandbox-charts';
import { chartSelectionSchema, hasChartSelectionQuery } from '@/domain/chart-selection';
import { chartIdForSlug, hasIndexableChartContent } from '@/domain/chart-seo';
export const dynamicParams = true;
export const dynamic = 'force-dynamic';
interface Props {
  params: Promise<{
    slug: string;
    week: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}
export async function generateMetadata({ params, searchParams }: Props) {
  const { slug, week } = await params;
  const chart = findChart(slug);
  if (!chart || !/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(week)) return {};
  const title =
    Object.values(CHART_LABELS).find((item) => item.slug === slug)?.title ?? 'MODELS TOP 20';
  const chartId = chartIdForSlug(slug);
  const data = chartId ? await sandboxChartsData(week) : undefined;
  return pageMetadata({
    title: `${title} · ${week} · SANDBOX CHARTS`,
    description: `L’édition ${week} de ${title}, avec ses positions et mouvements figés.`,
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
  const { slug, week } = await params;
  const selection = chartSelectionSchema.parse(await searchParams);
  if (!findChart(slug) || !/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(week)) notFound();
  if (slug === 'github' || slug === 'skills' || slug === 'ai-models' || slug === 'open-source-ai') {
    const chartId = slug === 'ai-models' || slug === 'open-source-ai' ? 'models' : slug;
    const data = await sandboxChartsData(week);
    if (data.mode !== 'unavailable' && !hasChartEdition(data, chartId, week)) notFound();
    return (
      <ChartsExperience
        data={data}
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
