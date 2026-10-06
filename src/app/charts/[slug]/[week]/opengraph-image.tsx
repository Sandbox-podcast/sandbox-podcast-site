import { OG_SIZE, OG_TYPE, chartCard } from '@/lib/og';
import { allCharts, chartView, weeksOf } from '@/lib/repository';

export const alt = 'Classement hebdomadaire (archive)';
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export function generateStaticParams() {
  return allCharts().flatMap((c) => weeksOf(c.slug).map((week) => ({ slug: c.slug, week })));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string; week: string }>;
}) {
  const { slug, week } = await params;
  return chartCard(chartView(slug, week));
}
