import { OG_SIZE, OG_TYPE, sandboxChartCard } from '@/lib/og';
import { sandboxChartsData } from '@/lib/sandbox-charts';

export const alt = 'Classement hebdomadaire (archive)';
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export const dynamic = 'force-dynamic';

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string; week: string }>;
}) {
  const { slug, week } = await params;
  return sandboxChartCard(
    await sandboxChartsData(week),
    slug === 'skills'
      ? 'skills'
      : slug === 'ai-models' || slug === 'open-source-ai'
        ? 'models'
        : slug === 'rising'
          ? 'rising'
          : 'github',
  );
}
