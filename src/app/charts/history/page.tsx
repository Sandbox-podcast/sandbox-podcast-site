import Link from 'next/link';
import { ReignStrip } from '@/components/chart-screen';
import { Mark, SectionHead } from '@/components/ui';
import { formatDayMonth } from '@/domain/format';
import { reigns } from '@/domain/history';
import { shortWeek, weekEnd, weekStart } from '@/domain/weeks';
import { entityPath, getEntity, allCharts, publishedWeeks, snapshotsOf } from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Historique des classements, semaine par semaine',
  description:
    'Qui était #1 la semaine dernière ? Tous les classements, toutes les semaines : sélectionnez une semaine, comparez les premières places et retrouvez les mouvements.',
  path: '/charts/history',
});

export default function HistoryPage() {
  const weeks = publishedWeeks();
  const charts = allCharts();
  return (
    <div className="wrap pt-6">
      <header className="mb-10">
        <p className="label mb-3 text-ink-2">Archive · {weeks.length} semaines</p>
        <h1 className="display" style={{ fontSize: 'clamp(3rem, 10vw, 7.5rem)' }}>
          Historique
        </h1>
        <p className="mt-4 max-w-3xl font-serif text-xl leading-snug md:text-2xl">
          Un classement n’a de valeur que s’il garde sa mémoire. Chaque semaine est figée et
          consultable : qui était #1, qui a chuté, qui est apparu.
        </p>
      </header>

      <section aria-labelledby="pick">
        <SectionHead kicker="Choisir une semaine" title="Semaines" id="pick" />
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {weeks.map((w) => (
            <li key={w}>
              <Link
                href={`/charts/history/${w}`}
                className="btn flex-col items-start gap-0.5 normal-case"
              >
                <span>Week {shortWeek(w).slice(1)}</span>
                <span className="font-normal opacity-70">
                  {formatDayMonth(weekStart(w))} – {formatDayMonth(weekEnd(w))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16" aria-labelledby="grid">
        <SectionHead kicker="Qui était en tête, semaine après semaine" title="Les #1" id="grid" />
        <div className="scroll-x">
          <table className="dtable min-w-[44rem]">
            <thead>
              <tr>
                <th>Semaine</th>
                {charts.map((c) => (
                  <th key={c.slug}>
                    <Link
                      href={`/charts/${c.slug}`}
                      className="underline decoration-2 underline-offset-4"
                    >
                      {c.short}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w}>
                  <td className="pr-4 font-semibold">
                    <Link
                      href={`/charts/history/${w}`}
                      className="underline decoration-2 underline-offset-4 hover:bg-hl hover:text-on-hl"
                    >
                      {shortWeek(w)}
                    </Link>
                  </td>
                  {charts.map((c) => {
                    const top = snapshotsOf(c.slug).find((s) => s.week === w)?.entries[0];
                    const entity = top ? getEntity(top.entity) : null;
                    return (
                      <td key={c.slug} className="pr-3">
                        {entity ? (
                          <Link
                            href={entityPath(entity)}
                            className="flex items-center gap-2 hover:underline"
                          >
                            <Mark entity={entity} size={22} />
                            <span className="truncate font-sans text-sm font-semibold">
                              {entity.name}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6" aria-labelledby="halls">
        <SectionHead kicker="Combien de temps ont-ils tenu ?" title="Hall of #1" id="halls" />
        <div className="grid gap-10 md:grid-cols-2">
          {charts.map((c) => (
            <div key={c.slug}>
              <h3 className="font-display text-xl font-extrabold">{c.title}</h3>
              <ReignStrip reigns={reigns(snapshotsOf(c.slug))} chartSlug={c.slug} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
