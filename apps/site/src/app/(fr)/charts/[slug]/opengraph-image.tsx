import { OG_SIZE, OG_TYPE, sandboxChartCard } from '@/lib/og';
import { sandboxChartsData } from '@/lib/sandbox-charts';

export const alt = 'Classement hebdomadaire';
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export const dynamic = 'force-dynamic';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return sandboxChartCard(
    await sandboxChartsData(),
    slug === 'skills'
      ? 'skills'
      : slug === 'ai-models' || slug === 'open-source-ai'
        ? 'models'
        : slug === 'rising'
          ? 'rising'
          : 'github',
  );
}
