import { notFound } from 'next/navigation';
import { ChartScreen } from '@/components/chart-screen';
import { formatDayMonth } from '@/domain/format';
import { shortWeek, weekEnd, weekStart } from '@/domain/weeks';
import { allCharts, findChart, weeksOf } from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return allCharts().flatMap((c) => weeksOf(c.slug).map((week) => ({ slug: c.slug, week })));
}

interface Props {
  params: Promise<{ slug: string; week: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug, week } = await params;
  const chart = findChart(slug);
  if (!chart || !weeksOf(slug).includes(week)) return {};
  const latest = weeksOf(slug).at(-1) === week;
  return pageMetadata({
    title: `${chart.title} · semaine ${shortWeek(week).slice(1)} (${formatDayMonth(weekStart(week))} – ${formatDayMonth(weekEnd(week))})`,
    description: `Le classement ${chart.title} tel qu’il était en semaine ${shortWeek(week).slice(1)}. ${chart.seo.description}`,
    // La dernière semaine a la même page que le classement courant : on la désigne comme canonique.
    path: latest ? `/charts/${chart.slug}` : `/charts/${chart.slug}/${week}`,
    ownImage: true,
  });
}

export default async function ChartWeekPage({ params }: Props) {
  const { slug, week } = await params;
  if (!findChart(slug) || !weeksOf(slug).includes(week)) notFound();
  return <ChartScreen slug={slug} week={week} />;
}
