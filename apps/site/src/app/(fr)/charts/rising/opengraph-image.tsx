import { OG_SIZE, OG_TYPE, sandboxChartCard } from '@/lib/og';
import { sandboxChartsData } from '@/lib/sandbox-charts';
export const alt = 'SANDBOX CHARTS · RISING 20';
export const size = OG_SIZE;
export const contentType = OG_TYPE;
export const dynamic = 'force-dynamic';
export default async function Image() {
  return sandboxChartCard(await sandboxChartsData(), 'rising');
}
