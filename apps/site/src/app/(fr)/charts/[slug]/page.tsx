import { notFound } from 'next/navigation';
import { ChartScreen } from '@/components/chart-screen';
import { ChartsExperience } from '@/components/charts-experience';
import { sandboxChartsData } from '@/lib/sandbox-charts';
import { allCharts, findChart } from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';
import { CHART_LABELS } from '@/domain/sandbox-charts';
import { chartSelectionSchema, hasChartSelectionQuery } from '@/domain/chart-selection';
import { chartIdForSlug, hasIndexableChartContent } from '@/domain/chart-seo';
export const dynamicParams = true;
export function generateStaticParams() {
  return allCharts().map((c) => ({ slug: c.slug }));
}
export async function generateMetadata({
  params,
  searchParams = Promise.resolve({}),
}: {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const chart = findChart(slug);
  if (!chart) return {};
  const chartId = chartIdForSlug(slug);
  const data = chartId ? await sandboxChartsData() : undefined;
  return pageMetadata({
    title: `${Object.values(CHART_LABELS).find((item) => item.slug === slug)?.title ?? 'MODELS TOP 20'} · SANDBOX CHARTS`,
    description:
      Object.values(CHART_LABELS).find((item) => item.slug === slug)?.subtitle ??
      chart.seo.description,
    path: `/charts/${chart.slug}`,
    keywords: chart.seo.keywords,
    ...(chartId && data
      ? {
          noindex:
            !hasIndexableChartContent(data, chartId) || hasChartSelectionQuery(await searchParams),
        }
      : {}),
    ownImage: true,
  });
}
export default async function ChartPage({
  params,
  searchParams,
}: {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const selection = chartSelectionSchema.parse(await searchParams);
  if (!findChart(slug)) notFound();
  if (slug === 'github' || slug === 'skills' || slug === 'ai-models' || slug === 'open-source-ai')
    return (
      <ChartsExperience
        data={await sandboxChartsData()}
        initialChart={slug === 'ai-models' || slug === 'open-source-ai' ? 'models' : slug}
        initialView={
          slug === 'open-source-ai' ? 'open' : slug === 'ai-models' ? selection.view : undefined
        }
        initialPeriod={selection.period}
        initialSelection={selection}
      />
    );
  return <ChartScreen slug={slug} />;
}
