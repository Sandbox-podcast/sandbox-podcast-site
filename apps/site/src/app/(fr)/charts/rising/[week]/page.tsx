import { notFound } from 'next/navigation';
import { ChartsExperience } from '@/components/charts-experience';
import { sandboxChartsData } from '@/lib/sandbox-charts';
import { chartSelectionSchema, hasChartSelectionQuery } from '@/domain/chart-selection';
import { hasChartEdition } from '@/domain/sandbox-charts';
import { hasIndexableChartContent } from '@/domain/chart-seo';
import { editionIdSchema } from '@/domain/schema';
import { pageMetadata } from '@/lib/seo';
export async function generateMetadata({
  params,
  searchParams = Promise.resolve({}),
}: {
  params: Promise<{
    week: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { week } = await params;
  if (!editionIdSchema.safeParse(week).success) return {};
  const data = await sandboxChartsData(week);
  return pageMetadata({
    title: `RISING 20 · ${week} · SANDBOX CHARTS`,
    description: `L’édition ${week} des projets IA en accélération sur GitHub.`,
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
  const { week } = await params;
  const selection = chartSelectionSchema.parse(await searchParams);
  if (!editionIdSchema.safeParse(week).success) notFound();
  const data = await sandboxChartsData(week);
  if (data.mode !== 'unavailable' && !hasChartEdition(data, 'rising', week)) notFound();
  return (
    <ChartsExperience
      data={data}
      initialChart="rising"
      initialPeriod={selection.period}
      initialSelection={selection}
    />
  );
}
