import { notFound } from 'next/navigation';
import { ChartScreen } from '@/components/chart-screen';
import { allCharts, findChart } from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return allCharts().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chart = findChart(slug);
  if (!chart) return {};
  return pageMetadata({
    title: chart.seo.title,
    description: chart.seo.description,
    path: `/charts/${chart.slug}`,
    keywords: chart.seo.keywords,
    ownImage: true,
  });
}

export default async function ChartPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!findChart(slug)) notFound();
  return <ChartScreen slug={slug} />;
}
