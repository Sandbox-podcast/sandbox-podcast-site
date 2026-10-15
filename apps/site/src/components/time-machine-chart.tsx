'use client';

import { useId, useState } from 'react';
import {
  HISTORY_CATEGORIES,
  historyCurve,
  historyDate,
  type HistoryEvent,
} from '@/domain/time-machine';
import styles from './time-machine.module.css';

const LEFT = 58;
const RIGHT = 970;
const TOP = 52;
const BOTTOM = 346;

export function TimeMachineChart({
  events,
  selectedIndex,
  fromYear,
  toYear,
  onSelect,
}: {
  events: HistoryEvent[];
  selectedIndex: number;
  fromYear: number;
  toYear: number;
  onSelect: (index: number) => void;
}) {
  const id = useId().replaceAll(':', '');
  const [hovered, setHovered] = useState<number | null>(null);
  const points = historyCurve(events, fromYear, toYear);
  const positions = points.map((point) => ({
    ...point,
    px: LEFT + point.x * (RIGHT - LEFT),
    py: BOTTOM - point.y * (BOTTOM - TOP),
  }));
  const active = positions[selectedIndex];
  const preview = positions[hovered ?? selectedIndex] ?? active;
  const counts = [
    ...new Set([0, 0.25, 0.5, 0.75, 1].map((value) => Math.round(value * events.length))),
  ];
  const stepPath = positions.reduce((path, point, index) => {
    const previousY = positions[index - 1]?.py ?? BOTTOM;
    return (
      path +
      ' L' +
      point.px.toFixed(2) +
      ',' +
      previousY.toFixed(2) +
      ' L' +
      point.px.toFixed(2) +
      ',' +
      point.py.toFixed(2)
    );
  }, `M${LEFT},${BOTTOM}`);
  const fullPath = `${stepPath} L${RIGHT},${positions.at(-1)?.py ?? BOTTOM}`;
  const area = `${fullPath} L${RIGHT},${BOTTOM}Z`;
  const span = toYear - fromYear;
  const tickStep = span > 20 ? 5 : span > 7 ? 2 : 1;
  const years = Array.from(
    { length: Math.floor(span / tickStep) + 1 },
    (_, i) => fromYear + i * tickStep,
  );
  if (years.at(-1) !== toYear) years.push(toYear);
  const start = Date.UTC(fromYear, 0, 1);
  const end = Date.UTC(toYear + 1, 0, 1);
  const ticks =
    fromYear === toYear
      ? [0, 3, 6, 9, 11].map((month) => ({
          label: new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(
            new Date(Date.UTC(fromYear, month, 1)),
          ),
          position: (Date.UTC(fromYear, month, 1) - start) / (end - start),
        }))
      : years.map((year) => ({
          label: String(year),
          position: (Date.UTC(year, 0, 1) - start) / (end - start),
        }));
  let lastLabel = -Infinity;
  const labeledIds = new Set(
    positions
      .filter((point) => {
        if (!point.event.landmark || point.px - lastLabel < 150) return false;
        lastLabel = point.px;
        return true;
      })
      .map((point) => point.event.id),
  );

  function closest(clientX: number, clientY: number, element: SVGSVGElement): number {
    const bounds = element.getBoundingClientRect();
    const x = ((clientX - bounds.left) / bounds.width) * 1000;
    const y = ((clientY - bounds.top) / bounds.height) * 410;
    let found = 0;
    let distance = Infinity;
    positions.forEach((point, index) => {
      const next = Math.hypot(point.px - x, (point.py - y) * 0.65);
      if (next < distance) {
        distance = next;
        found = index;
      }
    });
    return found;
  }

  return (
    <div
      className={styles['chartWrap']}
      tabIndex={0}
      role="group"
      aria-label="Courbe chronologique. Flèches pour parcourir les événements, Début et Fin pour les bornes."
      onKeyDown={(event) => {
        let next: number | undefined;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
          next = Math.min(events.length - 1, selectedIndex + 1);
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
          next = Math.max(0, selectedIndex - 1);
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = events.length - 1;
        if (next !== undefined) {
          event.preventDefault();
          onSelect(next);
        }
      }}
    >
      <div className={styles['chartCaption']}>
        <span>JALONS DOCUMENTÉS / CUMUL</span>
        <span>{events.length} événements</span>
      </div>
      <svg
        viewBox="0 0 1000 410"
        className={styles['chart']}
        role="img"
        aria-labelledby={id + '-title'}
        aria-describedby={id + '-desc'}
        onPointerMove={(event) => {
          setHovered(closest(event.clientX, event.clientY, event.currentTarget));
        }}
        onPointerLeave={() => {
          setHovered(null);
        }}
        onClick={(event) => {
          onSelect(closest(event.clientX, event.clientY, event.currentTarget));
        }}
      >
        <title id={id + '-title'}>
          {fromYear === toYear
            ? `Chronologie mondiale de l'IA en ${fromYear}`
            : `Chronologie mondiale de l'IA, de ${fromYear} à ${toYear}`}
        </title>
        <desc id={id + '-desc'}>
          Cumul des événements retenus. Les dates et les sources figurent dans la liste
          chronologique.
        </desc>
        <defs>
          <linearGradient id={id + '-fill'} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#50d9ee" stopOpacity=".13" />
            <stop offset="100%" stopColor="#50d9ee" stopOpacity="0" />
          </linearGradient>
          <clipPath id={id + '-clip'}>
            <rect
              x={LEFT}
              y="0"
              width={Math.max(0, (active?.px ?? RIGHT) - LEFT + 1)}
              height="410"
            />
          </clipPath>
        </defs>
        {counts.map((count) => {
          const y = BOTTOM - (count / Math.max(1, events.length)) * (BOTTOM - TOP);
          return (
            <g key={count}>
              <line
                x1={LEFT}
                y1={y}
                x2={RIGHT}
                y2={y}
                stroke="#243340"
                strokeDasharray={count ? '2 6' : undefined}
              />
              <text x="37" y={y + 4} textAnchor="end" fill="#8da4b5" fontSize="11">
                {count}
              </text>
            </g>
          );
        })}
        {ticks.map((tick) => {
          const x = LEFT + tick.position * (RIGHT - LEFT);
          return (
            <g key={tick.label}>
              <line x1={x} y1={BOTTOM} x2={x} y2={BOTTOM + 8} stroke="#456071" />
              <text x={x} y={BOTTOM + 31} fill="#8da4b5" fontSize="12" textAnchor="middle">
                {tick.label}
              </text>
            </g>
          );
        })}
        <path d={area} fill={'url(#' + id + '-fill)'} />
        <path d={fullPath} fill="none" stroke="#35515e" strokeWidth="2" strokeLinejoin="round" />
        <path
          d={fullPath}
          className={styles['curveReveal']}
          clipPath={'url(#' + id + '-clip)'}
          fill="none"
          stroke="#50d9ee"
          strokeWidth="2.5"
          strokeLinejoin="round"
          pathLength="1"
        />
        {positions.map((point, index) => (
          <g key={point.event.id} opacity={index > selectedIndex ? 0.48 : 1}>
            <circle
              cx={point.px}
              cy={point.py}
              r={point.event.landmark ? 4.5 : 2.7}
              fill={HISTORY_CATEGORIES[point.event.category].color}
              stroke="#0a1721"
              strokeWidth="1.5"
            />
            {labeledIds.has(point.event.id) && index !== selectedIndex ? (
              <g>
                <line
                  x1={point.px}
                  y1={point.py - 9}
                  x2={point.px}
                  y2={point.py - 28}
                  stroke="#456071"
                />
                <text
                  x={point.px > RIGHT - 220 ? point.px - 9 : point.px + 9}
                  textAnchor={point.px > RIGHT - 220 ? 'end' : 'start'}
                  y={point.py - 29}
                  fill="#9cb1bf"
                  fontSize="12"
                >
                  {point.event.shortTitle}
                </text>
              </g>
            ) : null}
          </g>
        ))}
        {preview ? (
          <g pointerEvents="none">
            <line
              x1={preview.px}
              x2={preview.px}
              y1={TOP - 24}
              y2={BOTTOM}
              stroke="#7ba2b4"
              strokeDasharray="3 6"
              opacity=".5"
            />
            <circle
              className={styles['pointHalo']}
              cx={preview.px}
              cy={preview.py}
              r="15"
              fill="none"
              stroke="#50d9ee"
              strokeOpacity=".3"
            />
            <circle
              cx={preview.px}
              cy={preview.py}
              r="7"
              fill="#07131d"
              stroke="#50d9ee"
              strokeWidth="2.5"
            />
            <rect
              x={Math.max(LEFT, Math.min(RIGHT - 194, preview.px - 97))}
              y={BOTTOM + 9}
              width="194"
              height="29"
              rx="4"
              fill="#50d9ee"
            />
            <text
              x={Math.max(LEFT + 97, Math.min(RIGHT - 97, preview.px))}
              y={BOTTOM + 28}
              fill="#07131d"
              fontSize="11"
              fontWeight="600"
              textAnchor="middle"
            >
              {historyDate(preview.event.date)}
            </text>
          </g>
        ) : null}
      </svg>
      <div className={styles['chartFootnote']}>
        <span>Cliquez sur un point pour consulter l'annonce.</span>
      </div>
    </div>
  );
}
