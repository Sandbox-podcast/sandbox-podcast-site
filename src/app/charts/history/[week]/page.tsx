import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MiniChart } from '@/components/cards';
import { SectionHead } from '@/components/ui';
import { formatDayMonth } from '@/domain/format';
import { nextWeek, previousWeek, shortWeek, weekEnd, weekStart } from '@/domain/weeks';
import { highlightDetail, highlightTicker, movePath } from '@/lib/moves';
import { allCharts, publishedWeeks, weeklyHighlights } from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return publishedWeeks().map((week) => ({ week }));
}

interface Props {
  params: Promise<{ week: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { week } = await params;
  if (!publishedWeeks().includes(week)) return {};
  return pageMetadata({
    title: `Classements de la semaine ${shortWeek(week).slice(1)} (${formatDayMonth(weekStart(week))} – ${formatDayMonth(weekEnd(week))})`,
    description: `Les quatre classements tech et IA tels qu’ils étaient en semaine ${shortWeek(week).slice(1)}, avec tous les mouvements.`,
    path: `/charts/history/${week}`,
  });
}

const CLASS = { up: 'move-up', down: 'move-down', hot: 'move-new', neutral: 'move-re' } as const;

export default async function HistoryWeekPage({ params }: Props) {
  const { week } = await params;
  const weeks = publishedWeeks();
  if (!weeks.includes(week)) notFound();
  const prev = previousWeek(week);
  const next = nextWeek(week);
  const highlights = weeklyHighlights(week);
  return (
    <div className="wrap pt-6">
      <nav aria-label="Fil d’Ariane" className="label mb-5 text-ink-2">
        <Link href="/charts/history" className="underline decoration-2 underline-offset-4">
          Historique
        </Link>{' '}
        / Week {shortWeek(week).slice(1)}
      </nav>
      <header className="mb-8">
        <p className="label mb-3 text-ink-2">
          {formatDayMonth(weekStart(week))} – {formatDayMonth(weekEnd(week))}
        </p>
        <h1 className="display" style={{ fontSize: 'clamp(3rem, 10vw, 7.5rem)' }}>
          Week {shortWeek(week).slice(1)}
        </h1>
        <div className="mt-5 flex items-center gap-2">
          {weeks.includes(prev) ? (
            <Link className="btn px-3" href={`/charts/history/${prev}`} rel="prev">
              ← {shortWeek(prev)}
            </Link>
          ) : null}
          {weeks.includes(next) ? (
            <Link className="btn px-3" href={`/charts/history/${next}`} rel="next">
              {shortWeek(next)} →
            </Link>
          ) : null}
        </div>
      </header>

      {highlights.length > 0 ? (
        <section aria-labelledby="moves" className="mb-14">
          <SectionHead kicker="Ce qui a bougé" title="Mouvements" id="moves" />
          <ul className="m-0 grid list-none gap-x-8 p-0 md:grid-cols-2">
            {highlights.map((h) => {
              const t = highlightTicker(h);
              return (
                <li key={`${h.kind}${h.chart.slug}${h.entity.slug}`}>
                  <Link
                    href={movePath(h)}
                    className="grid grid-cols-[4.75rem_1fr] items-center gap-3 border-t border-hair py-2.5 hover:bg-paper-2"
                  >
                    <span className={`move ${CLASS[t.tone]} justify-center`}>{t.badge}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-display text-lg font-extrabold leading-tight">
                        {h.entity.name}
                      </span>
                      <span className="label block truncate text-ink-2">{highlightDetail(h)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-x-8 gap-y-12 md:grid-cols-2">
        {allCharts().map((c) => (
          <MiniChart key={c.slug} chart={c.slug} week={week} top={10} />
        ))}
      </div>
    </div>
  );
}
