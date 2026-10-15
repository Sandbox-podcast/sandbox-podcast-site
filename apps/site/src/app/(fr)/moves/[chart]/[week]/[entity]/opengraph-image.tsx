import { OG_SIZE, OG_TYPE, demoCard, moveCard } from '@/lib/og';
import { chartView, getChart, getEntity, snapshotsOf, weeklyHighlights } from '@/lib/repository';
import { moveTriples } from '@/lib/move-params';
import { hasDemoSnapshots } from '@/domain/demo-content';
import { compareWeeks } from '@/domain/weeks';

export const alt = 'Mouvement de classement';
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export function generateStaticParams() {
  return moveTriples();
}

interface Props {
  params: Promise<{ chart: string; week: string; entity: string }>;
}

export default async function Image({ params }: Props) {
  const { chart, week, entity } = await params;
  if (
    hasDemoSnapshots(
      snapshotsOf(chart).filter((snapshot) => compareWeeks(snapshot.week, week) <= 0),
    )
  )
    return demoCard(getEntity(entity).name);
  const highlight = weeklyHighlights(week).find(
    (h) => h.chart.slug === chart && h.entity.slug === entity,
  );
  if (!highlight) throw new Error(`Aucun mouvement : ${chart} ${week} ${entity}`);
  const row = chartView(chart, week).rows.find((r) => r.entity.slug === entity);
  return moveCard(getChart(chart), week, getEntity(entity), row?.rank ?? highlight.rank, highlight);
}
