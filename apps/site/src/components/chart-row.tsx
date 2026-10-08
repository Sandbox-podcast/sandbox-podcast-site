import { Text, LocalizedElement } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
import { formatByUnit, formatCompact, formatDelta, formatNumber, ordinal } from '@/domain/format';
import type { ChartDef, ScoringProfile } from '@/domain/schema';
import { shortWeek } from '@/domain/weeks';
import {
  entityPath,
  metricInfos,
  type BubblingRow,
  type ChartView,
  type OutRow,
  type RowModel,
} from '@/lib/repository';
import { RankSpark, ScoreBar } from './charts-svg';
import { MoveBadge, Mark, RankNum, ExtLink } from './ui';
import { TakeCard } from './take-card';
const dimLabel = (profile: ScoringProfile, id: string): string =>
  profile.dimensions.find((d) => d.id === id)?.label ?? id;
/** Pastilles de lecture rapide : sous-scores clés, puis un chiffre brut parlant. */
function RowChips({
  chart,
  profile,
  row,
}: {
  chart: ChartDef;
  profile: ScoringProfile;
  row: RowModel;
}) {
  const infos = metricInfos(chart);
  const raw: {
    label: string;
    value: string;
  }[] = [];
  if (chart.entityKind === 'project') {
    const s7 = row.metrics['stars7d'];
    const stars = row.metrics['stars'];
    if (s7 !== undefined) raw.push({ label: '7 j', value: `+${formatCompact(s7)} ★` });
    if (stars !== undefined) raw.push({ label: 'total', value: `${formatCompact(stars)} ★` });
  } else {
    const price = row.metrics['blendedPrice'];
    const ctx = row.metrics['contextK'];
    const priceInfo = infos.get('blendedPrice');
    const ctxInfo = infos.get('contextK');
    if (price !== undefined && priceInfo)
      raw.push({ label: '/M tok', value: formatByUnit(price, priceInfo.unit, 2) });
    if (ctx !== undefined && ctxInfo)
      raw.push({ label: 'ctx', value: formatByUnit(ctx, ctxInfo.unit) });
  }
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      <Text>
        {chart.highlights.map((id) => {
          const v = row.dimensions[id];
          return (
            <li key={id} className="chip">
              <Text>{dimLabel(profile, id)}</Text>{' '}
              <b className="tnum">
                <Text>{v === undefined ? '—' : Math.round(v)}</Text>
              </b>
            </li>
          );
        })}
      </Text>
      <Text>
        {raw.map((r) => (
          <li key={r.label} className="chip border-dashed">
            <b className="tnum">
              <Text>{r.value}</Text>
            </b>{' '}
            <span className="text-ink-3">
              <Text>{r.label}</Text>
            </span>
          </li>
        ))}
      </Text>
    </ul>
  );
}
/** Détail déroulant : tout le DATA d'une entrée, avec ses sources. Jamais d'avis ici. */
function RowDetails({
  chart,
  profile,
  row,
  week,
}: {
  chart: ChartDef;
  profile: ScoringProfile;
  row: RowModel;
  week: string;
}) {
  const infos = metricInfos(chart);
  const dims = profile.dimensions.filter((d) => d.id !== profile.primary);
  return (
    <details className="disclosure mt-3">
      <summary className="label">
        <Text>{'D\u00E9tails et sources'}</Text>
      </summary>
      <div className="mt-3 grid gap-6 md:grid-cols-2">
        <div>
          <p className="label mb-2 text-ink-3">
            <Text>{'Sous-scores'}</Text>
          </p>
          <ul className="grid gap-2">
            <Text>
              {dims.map((d) => {
                const v = row.dimensions[d.id];
                const prev = row.previous?.dimensions[d.id];
                return (
                  <li
                    key={d.id}
                    className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-3 font-mono text-xs"
                  >
                    <span>
                      <Text>{d.label}</Text>
                    </span>
                    <Text>
                      {v === undefined ? (
                        <span className="text-ink-3">
                          <Text>{'non \u00E9valu\u00E9'}</Text>
                        </span>
                      ) : (
                        <ScoreBar value={v} />
                      )}
                    </Text>
                    <span className="text-right tnum">
                      <Text>{v === undefined ? '—' : v.toFixed(0)}</Text>
                      <Text>
                        {v !== undefined && prev !== undefined && Math.round(v - prev) !== 0 ? (
                          <span className={v > prev ? 'text-up' : 'text-down'}>
                            <Text> </Text>
                            <Text>{formatDelta(Math.round(v - prev))}</Text>
                          </span>
                        ) : null}
                      </Text>
                    </span>
                  </li>
                );
              })}
            </Text>
          </ul>
        </div>
        <div>
          <p className="label mb-2 text-ink-3">
            <Text>{'Mesures \u00B7 '}</Text>
            <Text>{shortWeek(week)}</Text>
          </p>
          <table className="dtable">
            <tbody>
              <Text>
                {chart.detailMetrics.map((key) => {
                  const info = infos.get(key);
                  const v = row.metrics[key];
                  const prev = row.previous?.metrics[key];
                  if (!info) return null;
                  return (
                    <tr key={key}>
                      <td>
                        <Text>{info.label}</Text>
                      </td>
                      <td className="num">
                        <Text>
                          {v === undefined ? '—' : formatByUnit(v, info.unit, info.decimals)}
                        </Text>
                      </td>
                      <td className="num text-ink-3">
                        <Text>
                          {v !== undefined && prev !== undefined && prev !== v
                            ? formatDelta(v - prev, info.decimals)
                            : ''}
                        </Text>
                      </td>
                      <td className="text-ink-3">
                        <Text>
                          {info.source ? (
                            <ExtLink href={info.source.url}>
                              <Text>{info.source.label}</Text>
                            </ExtLink>
                          ) : (
                            'calculé'
                          )}
                        </Text>
                      </td>
                    </tr>
                  );
                })}
              </Text>
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 font-mono text-xs">
        <Link
          href={entityPath(row.entity)}
          className="underline decoration-2 underline-offset-4 hover:bg-ink hover:text-paper"
        >
          <Text>{'Ouvrir la fiche de '}</Text>
          <Text>{row.entity.name}</Text>
          <Text>{' \u2192'}</Text>
        </Link>
      </p>
    </details>
  );
}
export function ChartRow({ view, row }: { view: ChartView; row: RowModel }) {
  const { chart, profile, week, baseline } = view;
  const { entity, movement } = row;
  const lead = row.rank === 1;
  const prevLabel =
    row.previous && !baseline
      ? `${shortWeek(view.previousWeek ?? '')} · ${row.previous.rank <= chart.size ? `n°${String(row.previous.rank)}` : `hors Top ${String(chart.size)} (n°${String(row.previous.rank)})`}`
      : baseline
        ? 'Base de départ'
        : 'Jamais classé';
  return (
    <li className="chart-row" data-lead={lead} data-movement={movement.kind}>
      <div className="cr-rank">
        <RankNum rank={row.rank} size={row.rank <= 3 ? 'xl' : 'lg'} />
      </div>
      <div className="cr-move">
        <MoveBadge kind={movement.kind} delta={movement.delta} baseline={baseline} />
        <span className="label text-ink-3">
          <Text>{prevLabel}</Text>
        </span>
      </div>
      <div className="cr-id">
        <div className="hidden sm:block">
          <Mark entity={entity} size={52} />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-2xl font-extrabold leading-none md:text-[1.75rem]">
            <Link
              href={entityPath(entity)}
              className="after:absolute after:inset-0 hover:underline hover:decoration-4 hover:underline-offset-4"
            >
              <Text>{entity.name}</Text>
            </Link>
          </h3>
          <p className="label mt-1.5 text-ink-2">
            <Text>{entity.org ? `${entity.org} · ` : ''}</Text>
            <Text>{entity.category}</Text>
          </p>
          <p className="mt-1.5 max-w-prose text-sm text-ink-2">
            <Text>{entity.tagline}</Text>
          </p>
          <RowChips chart={chart} profile={profile} row={row} />
        </div>
      </div>
      <div className="cr-score">
        <p className="label text-ink-3">
          <Text>{dimLabel(profile, profile.primary)}</Text>
        </p>
        <p
          className="font-display text-4xl font-extrabold leading-none tnum md:text-5xl"
          style={{ fontStretch: '80%' }}
        >
          <Text>{formatNumber(row.score, 1)}</Text>
        </p>
        <div className="mt-2 flex justify-end">
          <RankSpark values={row.rankSeries} size={chart.size} />
        </div>
        <p className="label mt-1 text-ink-3">
          <Text>{row.stats.weeksInTop}</Text>
          <Text>{' sem. au Top \u00B7 pic n\u00B0'}</Text>
          <Text>{row.stats.peak ?? '—'}</Text>
        </p>
      </div>
      <div className="cr-extra relative z-10 grid gap-3">
        <Text>
          {row.explanation ? (
            <div className="data-block">
              <p className="data-title">
                <span className="label bg-ink px-1.5 py-0.5 text-paper">
                  <Text>{'DATA'}</Text>
                </span>
                <span className="label">
                  <Text>{'Pourquoi \u00E7a bouge'}</Text>
                </span>
              </p>
              <p>
                <Text>{row.explanation.headline}</Text>
              </p>
              <Text>
                {row.explanation.facts.length > 0 ? (
                  <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                    <Text>
                      {row.explanation.facts.map((f) => (
                        <li key={f.label}>
                          <Text>{f.label}</Text>
                          <Text>{' : '}</Text>
                          <b className="text-ink tnum">
                            <Text>{f.value}</Text>
                          </b>
                          <Text>
                            {f.change ? (
                              <span
                                className={
                                  f.direction === 'up'
                                    ? 'text-up'
                                    : f.direction === 'down'
                                      ? 'text-down'
                                      : 'text-ink-3'
                                }
                              >
                                <Text> </Text>
                                <Text>{'('}</Text>
                                <Text>{f.change}</Text>
                                <Text>{')'}</Text>
                              </span>
                            ) : null}
                          </Text>
                        </li>
                      ))}
                    </Text>
                  </ul>
                ) : null}
              </Text>
            </div>
          ) : null}
        </Text>
        <Text>{row.take ? <TakeCard take={row.take} /> : null}</Text>
        <RowDetails chart={chart} profile={profile} row={row} week={week} />
      </div>
    </li>
  );
}
export function ChartList({ view }: { view: ChartView }) {
  return (
    <LocalizedElement
      as="ol"
      className="m-0 list-none p-0"
      aria-label={`${view.chart.title}, semaine ${shortWeek(view.week)}`}
    >
      <Text>
        {view.rows.map((row) => (
          <ChartRow key={row.entity.slug} view={view} row={row} />
        ))}
      </Text>
    </LocalizedElement>
  );
}
/** « Bubbling under » : les candidats juste derrière le Top, comme dans les charts musicaux. */
export function BubblingList({ rows, size }: { rows: BubblingRow[]; size: number }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-10">
      <h3 className="label mb-3 border-t-2 border-ink pt-2">
        <Text>{'Bubbling under \u00B7 juste derri\u00E8re le Top '}</Text>
        <Text>{size}</Text>
      </h3>
      <ul className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
        <Text>
          {rows.slice(0, 8).map((r) => (
            <li key={r.entity.slug} className="flex items-center gap-3 border-b border-hair py-2">
              <span
                className="w-8 font-display text-xl font-extrabold tnum text-ink-3"
                style={{ fontStretch: '70%' }}
              >
                <Text>{r.rank}</Text>
              </span>
              <Mark entity={r.entity} size={28} />
              <Link
                href={entityPath(r.entity)}
                className="min-w-0 flex-1 truncate font-semibold hover:underline"
              >
                <Text>{r.entity.name}</Text>
              </Link>
              <span className="label tnum text-ink-3">
                <Text>{formatNumber(r.score, 1)}</Text>
              </span>
              <span className="label w-14 text-right text-ink-3">
                <Text>
                  {r.previousRank === null
                    ? 'nouveau'
                    : r.previousRank === r.rank
                      ? '='
                      : `${r.previousRank > r.rank ? '▲' : '▼'} ${String(Math.abs(r.previousRank - r.rank))}`}
                </Text>
              </span>
            </li>
          ))}
        </Text>
      </ul>
    </div>
  );
}
export function OutList({ rows, size }: { rows: OutRow[]; size: number }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-10">
      <h3 className="label mb-3 border-t-2 border-ink pt-2">
        <Text>{'Out \u00B7 sortis du Top '}</Text>
        <Text>{size}</Text>
        <Text>{' cette semaine'}</Text>
      </h3>
      <ul className="grid gap-x-8 sm:grid-cols-2">
        <Text>
          {rows.map((r) => (
            <li key={r.entity.slug} className="flex items-center gap-3 border-b border-hair py-2">
              <MoveBadge kind="out" />
              <Mark entity={r.entity} size={28} />
              <Link
                href={entityPath(r.entity)}
                className="min-w-0 flex-1 truncate font-semibold hover:underline"
              >
                <Text>{r.entity.name}</Text>
              </Link>
              <span className="label text-ink-3">
                <Text>{'\u00E9tait '}</Text>
                <Text>{ordinal(r.previousRank)}</Text>
                <Text>{r.currentRank ? `, maintenant ${ordinal(r.currentRank)}` : ''}</Text>
              </span>
            </li>
          ))}
        </Text>
      </ul>
    </div>
  );
}
