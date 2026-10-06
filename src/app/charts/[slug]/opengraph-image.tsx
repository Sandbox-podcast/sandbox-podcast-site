import { OG_SIZE, OG_TYPE, chartCard } from '@/lib/og';
import { allCharts, chartView } from '@/lib/repository';

export const alt = 'Classement hebdomadaire';
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export function generateStaticParams() {
  return allCharts().map((c) => ({ slug: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return chartCard(chartView(slug));
}
