import Link from 'next/link';
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
import { MoveBadge, Mark, ProvChip, RankNum, ExtLink } from './ui';
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
  const raw: { label: string; value: string }[] = [];
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
      {chart.highlights.map((id) => {
        const v = row.dimensions[id];
        return (
          <li key={id} className="chip">
            {dimLabel(profile, id)} <b className="tnum">{v === undefined ? '—' : Math.round(v)}</b>
          </li>
        );
      })}
      {raw.map((r) => (
        <li key={r.label} className="chip border-dashed">
          <b className="tnum">{r.value}</b> <span className="text-ink-3">{r.label}</span>
        </li>
      ))}
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
      <summary className="label">Détails et sources</summary>
      <div className="mt-3 grid gap-6 md:grid-cols-2">
        <div>
          <p className="label mb-2 text-ink-3">Sous-scores</p>
          <ul className="grid gap-2">
            {dims.map((d) => {
              const v = row.dimensions[d.id];
              const prev = row.previous?.dimensions[d.id];
              return (
                <li
                  key={d.id}
                  className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-3 font-mono text-xs"
                >
                  <span>{d.label}</span>
                  {v === undefined ? (
                    <span className="text-ink-3">non évalué</span>
                  ) : (
                    <ScoreBar value={v} />
                  )}
                  <span className="text-right tnum">
                    {v === undefined ? '—' : v.toFixed(0)}
                    {v !== undefined && prev !== undefined && Math.round(v - prev) !== 0 ? (
                      <span className={v > prev ? 'text-up' : 'text-down'}>
                        {' '}
                        {formatDelta(Math.round(v - prev))}
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <p className="label mb-2 text-ink-3">Mesures · {shortWeek(week)}</p>
          <table className="dtable">
            <tbody>
              {chart.detailMetrics.map((key) => {
                const info = infos.get(key);
                const v = row.metrics[key];
                const prev = row.previous?.metrics[key];
                if (!info) return null;
                return (
                  <tr key={key}>
                    <td>{info.label}</td>
                    <td className="num">
                      {v === undefined ? '—' : formatByUnit(v, info.unit, info.decimals)}
                    </td>
                    <td className="num text-ink-3">
                      {v !== undefined && prev !== undefined && prev !== v
                        ? formatDelta(v - prev, info.decimals)
                        : ''}
                    </td>
                    <td className="text-ink-3">
                      {info.source ? (
                        <ExtLink href={info.source.url}>{info.source.label}</ExtLink>
                      ) : (
                        'calculé'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 font-mono text-xs">
        <Link
          href={entityPath(row.entity)}
          className="underline decoration-2 underline-offset-4 hover:bg-ink hover:text-paper"
        >
          Ouvrir la fiche de {row.entity.name} →
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
        <span className="label text-ink-3">{prevLabel}</span>
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
              {entity.name}
            </Link>
          </h3>
          <p className="label mt-1.5 text-ink-2">
            {entity.org ? `${entity.org} · ` : ''}
            {entity.category}
          </p>
          <p className="mt-1.5 max-w-prose text-sm text-ink-2">{entity.tagline}</p>
          <RowChips chart={chart} profile={profile} row={row} />
        </div>
      </div>
      <div className="cr-score">
        <p className="label text-ink-3">{dimLabel(profile, profile.primary)}</p>
        <p
          className="font-display text-4xl font-extrabold leading-none tnum md:text-5xl"
          style={{ fontStretch: '80%' }}
        >
          {formatNumber(row.score, 1)}
        </p>
        <div className="mt-2 flex justify-end">
          <RankSpark values={row.rankSeries} size={chart.size} />
        </div>
        <p className="label mt-1 text-ink-3">
          {row.stats.weeksInTop} sem. au Top · pic n°{row.stats.peak ?? '—'}
        </p>
      </div>
      <div className="cr-extra relative z-10 grid gap-3">
        {row.explanation ? (
          <div className="data-block">
            <p className="data-title">
              <span className="label bg-ink px-1.5 py-0.5 text-paper">DATA</span>
              <ProvChip provenance={view.snapshot.provenance} />
              <span className="label">Pourquoi ça bouge</span>
            </p>
            <p>{row.explanation.headline}</p>
            {row.explanation.facts.length > 0 ? (
              <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                {row.explanation.facts.map((f) => (
                  <li key={f.label}>
                    {f.label} : <b className="text-ink tnum">{f.value}</b>
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
                        {' '}
                        ({f.change})
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {row.take ? <TakeCard take={row.take} /> : null}
        <RowDetails chart={chart} profile={profile} row={row} week={week} />
      </div>
    </li>
  );
}

export function ChartList({ view }: { view: ChartView }) {
  return (
    <ol
      className="m-0 list-none p-0"
      aria-label={`${view.chart.title}, semaine ${shortWeek(view.week)}`}
    >
      {view.rows.map((row) => (
        <ChartRow key={row.entity.slug} view={view} row={row} />
      ))}
    </ol>
  );
}

/** « Bubbling under » : les candidats juste derrière le Top, comme dans les charts musicaux. */
export function BubblingList({ rows, size }: { rows: BubblingRow[]; size: number }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-10">
      <h3 className="label mb-3 border-t-2 border-ink pt-2">
        Bubbling under · juste derrière le Top {size}
      </h3>
      <ul className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
        {rows.slice(0, 8).map((r) => (
          <li key={r.entity.slug} className="flex items-center gap-3 border-b border-hair py-2">
            <span
              className="w-8 font-display text-xl font-extrabold tnum text-ink-3"
              style={{ fontStretch: '70%' }}
            >
              {r.rank}
            </span>
            <Mark entity={r.entity} size={28} />
            <Link
              href={entityPath(r.entity)}
              className="min-w-0 flex-1 truncate font-semibold hover:underline"
            >
              {r.entity.name}
            </Link>
            <span className="label tnum text-ink-3">{formatNumber(r.score, 1)}</span>
            <span className="label w-14 text-right text-ink-3">
              {r.previousRank === null
                ? 'nouveau'
                : r.previousRank === r.rank
                  ? '='
                  : `${r.previousRank > r.rank ? '▲' : '▼'} ${String(Math.abs(r.previousRank - r.rank))}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OutList({ rows, size }: { rows: OutRow[]; size: number }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-10">
      <h3 className="label mb-3 border-t-2 border-ink pt-2">
        Out · sortis du Top {size} cette semaine
      </h3>
      <ul className="grid gap-x-8 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.entity.slug} className="flex items-center gap-3 border-b border-hair py-2">
            <MoveBadge kind="out" />
            <Mark entity={r.entity} size={28} />
            <Link
              href={entityPath(r.entity)}
              className="min-w-0 flex-1 truncate font-semibold hover:underline"
            >
              {r.entity.name}
            </Link>
            <span className="label text-ink-3">
              était {ordinal(r.previousRank)}
              {r.currentRank ? `, maintenant ${ordinal(r.currentRank)}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
