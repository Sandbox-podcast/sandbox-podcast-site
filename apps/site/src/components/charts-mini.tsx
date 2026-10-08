import Link from 'next/link';
import { chartRows, CHART_LABELS, type ChartId, type ChartsData } from '@/domain/sandbox-charts';
import { formatCompact, formatNumber } from '@/domain/format';
import { ChartMovement } from './charts-ranking';

export function ChartsMini({ data, id }: { data: ChartsData; id: ChartId }) {
  const meta = CHART_LABELS[id];
  const rows = chartRows(data, id, data.week).slice(0, 3);
  return (
    <section
      className="flex h-full flex-col border-t-4 border-ink pt-2"
      aria-label={`${meta.title}, aperçu`}
    >
      <header className="mini-chart-heading mb-1">
        <p className="label text-ink-2">SANDBOX CHARTS · W{data.week.slice(-2)}</p>
        <h3 className="display mini-chart-title text-3xl">
          <Link href={`/charts/${meta.slug}`}>{meta.title}</Link>
        </h3>
      </header>
      <ol className="m-0 flex-1 list-none p-0">
        {rows.map((row) => (
          <li key={row.entity.slug} className="flex items-center gap-3 border-t border-hair py-3">
            <strong className="font-display text-3xl">{String(row.rank).padStart(2, '0')}</strong>
            <div>
              <Link className="font-display text-lg font-extrabold" href={row.entity.href}>
                {row.entity.name}
              </Link>
              <p className="flex items-center gap-3 text-xs">
                <ChartMovement row={row} />
                <span>
                  {row.periodStars === null
                    ? `${formatNumber(row.score, 1)} / 100`
                    : `${row.periodStars > 0 ? '+' : ''}${formatCompact(row.periodStars)} stars`}
                </span>
              </p>
            </div>
          </li>
        ))}
      </ol>
      {!rows.length ? (
        <p className="py-4 text-sm text-ink-2">
          {data.mode === 'unavailable'
            ? 'Données temporairement indisponibles.'
            : 'Collecte en préparation.'}
        </p>
      ) : null}
      <Link className="label border-t border-hair py-3" href={`/charts/${meta.slug}`}>
        Ouvrir le chart ↗
      </Link>
    </section>
  );
}
