import { Text, LocalizedElement } from '@/components/localization';
import { formatByUnit } from '@/domain/format';
import type { Unit } from '@/domain/schema';
import { shortWeek } from '@/domain/weeks';
/**
 * Graphiques en SVG rendus côté serveur : zéro JavaScript, zéro bibliothèque, texte alternatif complet.
 * Le rang 1 est en haut : monter dans le classement, c'est monter sur le graphique.
 */
const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
/** Petite courbe de rang. `values` : rang dans le pool par semaine, null si l'entité n'était pas suivie. */
export function RankSpark({
  values,
  size,
  width = 132,
  height = 36,
}: {
  values: (number | null)[];
  size: number;
  width?: number;
  height?: number;
}) {
  const cap = size + 2;
  const pad = 5;
  const n = values.length;
  const x = (i: number): number =>
    pad + (n <= 1 ? (width - 2 * pad) / 2 : (i * (width - 2 * pad)) / (n - 1));
  const y = (rank: number): number =>
    pad + ((clamp(rank, 1, cap) - 1) / (cap - 1)) * (height - 2 * pad);
  const segments: string[] = [];
  let current = '';
  values.forEach((v, i) => {
    if (v === null) {
      if (current) segments.push(current);
      current = '';
    } else {
      current += `${current ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
    }
  });
  if (current) segments.push(current);
  const last = values[n - 1];
  const description = `Rang sur ${String(n)} semaines : ${values.map((v) => (v === null ? 'hors suivi' : `n°${String(v)}`)).join(', ')}`;
  return (
    <LocalizedElement
      as="svg"
      viewBox={`0 0 ${String(width)} ${String(height)}`}
      width={width}
      height={height}
      role="img"
      aria-label={description}
      className="block overflow-visible"
    >
      <line
        x1={pad}
        x2={width - pad}
        y1={y(size)}
        y2={y(size)}
        stroke="var(--hair)"
        strokeDasharray="2 3"
      />
      {segments.map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ))}
      {values.map((v, i) =>
        v !== null && v > size ? (
          <circle
            key={`o${String(i)}`}
            cx={x(i)}
            cy={y(v)}
            r="2"
            fill="var(--paper)"
            stroke="var(--ink)"
            strokeWidth="1"
          />
        ) : null,
      )}
      {last !== null && last !== undefined ? (
        <circle
          cx={x(n - 1)}
          cy={y(last)}
          r="4.5"
          fill="var(--hl)"
          stroke="var(--ink)"
          strokeWidth="2"
        />
      ) : null}
    </LocalizedElement>
  );
}
export interface HistoryPoint {
  week: string;
  rank: number | null;
}
/** Courbe de rang détaillée : toute l'histoire d'une entité dans un classement. */
export function RankHistory({
  points,
  size,
  title,
}: {
  points: HistoryPoint[];
  size: number;
  title: string;
}) {
  const W = 640;
  const H = 250;
  const left = 34;
  const right = 14;
  const top = 14;
  const bottom = 30;
  const cap = size + 3;
  const n = points.length;
  const x = (i: number): number =>
    left + (n <= 1 ? (W - left - right) / 2 : (i * (W - left - right)) / (n - 1));
  const y = (rank: number): number =>
    top + ((clamp(rank, 1, cap) - 1) / (cap - 1)) * (H - top - bottom);
  const segments: string[] = [];
  let current = '';
  points.forEach((p, i) => {
    if (p.rank === null) {
      if (current) segments.push(current);
      current = '';
    } else {
      current += `${current ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.rank).toFixed(1)}`;
    }
  });
  if (current) segments.push(current);
  const ticks = [1, 3, 5, size].filter((v, i, a) => v <= size && a.indexOf(v) === i);
  const labelEvery = n > 12 ? 3 : 2;
  const summary = points
    .map((p) => `${shortWeek(p.week)} : ${p.rank === null ? 'hors suivi' : `n°${String(p.rank)}`}`)
    .join(' ; ');
  return (
    <figure className="m-0">
      <LocalizedElement
        as="svg"
        viewBox={`0 0 ${String(W)} ${String(H)}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`${title}. ${summary}`}
      >
        <rect
          x={left}
          y={y(1) - 8}
          width={W - left - right}
          height={y(3) - y(1) + 16}
          fill="var(--hl)"
          opacity="0.35"
        />
        <rect
          x={left}
          y={y(size) + 10}
          width={W - left - right}
          height={H - bottom - y(size) - 10}
          fill="var(--hair)"
          opacity="0.5"
        />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} stroke="var(--hair)" />
            <text
              x={left - 8}
              y={y(t) + 4}
              textAnchor="end"
              fontFamily="var(--font-mono)"
              fontSize="11"
              fill="var(--ink-2)"
            >
              {t}
            </text>
          </g>
        ))}
        <text
          x={left + 6}
          y={H - bottom - 6}
          fontFamily="var(--font-mono)"
          fontSize="10"
          fill="var(--ink-3)"
        >
          <Text values={{ size }}>{'HORS TOP {size}'}</Text>
        </text>
        {points.map((p, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text
              key={p.week}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="10"
              fill="var(--ink-2)"
            >
              <Text>{shortWeek(p.week)}</Text>
            </text>
          ) : null,
        )}
        {segments.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="var(--ink)"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {points.map((p, i) =>
          p.rank === null ? null : (
            <circle
              key={p.week}
              cx={x(i)}
              cy={y(p.rank)}
              r={i === n - 1 ? 6 : 4}
              fill={p.rank > size ? 'var(--paper)' : i === n - 1 ? 'var(--hl)' : 'var(--ink)'}
              stroke="var(--ink)"
              strokeWidth="2"
            >
              <LocalizedElement as="title">{`${shortWeek(p.week)} : n°${String(p.rank)}`}</LocalizedElement>
            </circle>
          ),
        )}
      </LocalizedElement>
    </figure>
  );
}
export interface SeriesPoint {
  week: string;
  value: number | null;
}
/** Évolution d'une métrique (étoiles, score de benchmark…) : aire et courbe, sans axe superflu. */
export function SeriesChart({
  points,
  unit,
  decimals = 0,
  title,
}: {
  points: SeriesPoint[];
  unit: Unit;
  decimals?: number;
  title: string;
}) {
  const W = 640;
  const H = 170;
  const left = 8;
  const right = 8;
  const top = 22;
  const bottom = 26;
  const values = points.flatMap((p) => (p.value === null ? [] : [p.value]));
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max === min ? 1 : max - min;
  const n = points.length;
  const x = (i: number): number =>
    left + (n <= 1 ? (W - left - right) / 2 : (i * (W - left - right)) / (n - 1));
  const y = (v: number): number => top + (1 - (v - min) / span) * (H - top - bottom);
  let line = '';
  let area = '';
  const defined = points.flatMap((p, i) => (p.value === null ? [] : [{ i, v: p.value }]));
  defined.forEach(({ i, v }, k) => {
    line += `${k === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
  });
  const first = defined[0];
  const last = defined[defined.length - 1];
  if (first && last) {
    area = `${line}L${x(last.i).toFixed(1)} ${String(H - bottom)}L${x(first.i).toFixed(1)} ${String(H - bottom)}Z`;
  }
  const flat = values.every((v) => v === values[0]);
  return (
    <figure className="m-0">
      <LocalizedElement
        as="svg"
        viewBox={`0 0 ${String(W)} ${String(H)}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`${title} : de ${formatByUnit(first?.v ?? 0, unit, decimals)} à ${formatByUnit(last?.v ?? 0, unit, decimals)}`}
      >
        <path d={area} fill="var(--hair)" />
        <path d={line} fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
        {last ? (
          <circle
            cx={x(last.i)}
            cy={y(last.v)}
            r="5"
            fill="var(--hl)"
            stroke="var(--ink)"
            strokeWidth="2"
          />
        ) : null}
        {first ? (
          <text
            x={x(first.i)}
            y={top - 8}
            fontFamily="var(--font-mono)"
            fontSize="11"
            fill="var(--ink-2)"
          >
            {formatByUnit(first.v, unit, decimals)}
          </text>
        ) : null}
        {last ? (
          <text
            x={x(last.i)}
            y={top - 8}
            textAnchor="end"
            fontFamily="var(--font-mono)"
            fontSize="11"
            fontWeight="700"
            fill="var(--ink)"
          >
            {formatByUnit(last.v, unit, decimals)}
          </text>
        ) : null}
        {points.map((p, i) =>
          i % 3 === 0 || i === n - 1 ? (
            <text
              key={p.week}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize="10"
              fill="var(--ink-2)"
            >
              <Text>{shortWeek(p.week)}</Text>
            </text>
          ) : null,
        )}
      </LocalizedElement>
      <Text>
        {flat ? (
          <figcaption className="label text-ink-3">
            <Text>{'Valeur stable sur la p\u00E9riode'}</Text>
          </figcaption>
        ) : null}
      </Text>
    </figure>
  );
}
/** Barre de 0 à 100 pour un sous-score. */
export function ScoreBar({ value }: { value: number }) {
  return (
    <span className="bar block w-full" role="presentation">
      <i style={{ width: `${String(clamp(value, 0, 100))}%` }} />
    </span>
  );
}
