import { Text, LocalizedElement } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
import { chartRows, CHART_LABELS, type ChartId, type ChartsData } from '@/domain/sandbox-charts';
import { formatCompact, formatNumber } from '@/domain/format';
import { ChartMovement } from './charts-ranking';
export function ChartsMini({ data, id }: { data: ChartsData; id: ChartId }) {
  const meta = CHART_LABELS[id];
  const rows = chartRows(data, id, data.week).slice(0, 3);
  return (
    <LocalizedElement
      as="section"
      className="flex h-full flex-col border-t-4 border-ink pt-2"
      aria-label={`${meta.title}, aperçu`}
    >
      <header className="mini-chart-heading mb-1">
        <p className="label text-ink-2">
          <Text>{'SANDBOX CHARTS \u00B7 W'}</Text>
          <Text>{data.week.slice(-2)}</Text>
        </p>
        <h3 className="display mini-chart-title text-3xl">
          <Link href={`/charts/${meta.slug}`}>
            <Text>{meta.title}</Text>
          </Link>
        </h3>
      </header>
      <ol className="m-0 flex-1 list-none p-0">
        <Text>
          {rows.map((row) => (
            <li key={row.entity.slug} className="flex items-center gap-3 border-t border-hair py-3">
              <strong className="font-display text-3xl">
                <Text>{String(row.rank).padStart(2, '0')}</Text>
              </strong>
              <div>
                <Link className="font-display text-lg font-extrabold" href={row.entity.href}>
                  <Text>{row.entity.name}</Text>
                </Link>
                <p className="flex items-center gap-3 text-xs">
                  <ChartMovement row={row} />
                  <span>
                    <Text>
                      {row.periodStars === null
                        ? `${formatNumber(row.score, 1)} / 100`
                        : `${row.periodStars > 0 ? '+' : ''}${formatCompact(row.periodStars)} étoiles`}
                    </Text>
                  </span>
                </p>
              </div>
            </li>
          ))}
        </Text>
      </ol>
      <Text>
        {!rows.length ? (
          <p className="py-4 text-sm text-ink-2">
            <Text>
              {data.mode === 'unavailable'
                ? 'Données temporairement indisponibles.'
                : data.progress?.databaseReady
                  ? `${String(data.progress.trackedRepositories)} dépôts suivis · historique ${String(data.progress.distinctSnapshotDays)}/${String(data.progress.requiredHistoryDays)} jours`
                  : 'Collecte en préparation.'}
            </Text>
          </p>
        ) : null}
      </Text>
      <Link className="label border-t border-hair py-3" href={`/charts/${meta.slug}`}>
        <Text>{'Ouvrir le classement \u2197'}</Text>
      </Link>
    </LocalizedElement>
  );
}
