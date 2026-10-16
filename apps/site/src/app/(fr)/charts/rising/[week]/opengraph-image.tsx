import { OG_SIZE, OG_TYPE, sandboxChartCard } from '@/lib/og';
import { sandboxChartsData } from '@/lib/sandbox-charts';
import { editionFromRoute } from '@/domain/edition-route';
import { notFound } from 'next/navigation';
export const alt = 'SANDBOX CHARTS · RISING 20 · archive';
export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const dynamic = 'force-dynamic';
export default async function Image({ params }: { params: Promise<{ week: string }> }) {
  const week = editionFromRoute((await params).week);
  if (!week) notFound();
  return sandboxChartCard(await sandboxChartsData(week), 'rising');
}
