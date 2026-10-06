import type { MetricDef, Unit } from './schema.ts';

const NBSP = ' ';
const NNBSP = ' ';

/** Nombre au format français : « 8 420 », « 94,2 ». Espace insécable pour ne jamais couper un chiffre. */
export function formatNumber(n: number, decimals = 0): string {
  const fixed = Math.abs(n).toFixed(decimals);
  const [int = '0', frac] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
  const body = frac ? `${grouped},${frac}` : grouped;
  return n < 0 ? `−${body}` : body;
}

/** « 1,2k », « 18,4k », « 2,1M » : pour les compteurs qui grossissent (stars, forks). */
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${formatNumber(n / 1_000_000, abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 10_000) return `${formatNumber(n / 1000, abs >= 100_000 ? 0 : 1)}k`;
  return formatNumber(n);
}

export function formatDelta(n: number, decimals = 0): string {
  if (n === 0) return '0';
  return `${n > 0 ? '+' : '−'}${formatNumber(Math.abs(n), decimals)}`;
}

export function formatMetric(value: number, def: Pick<MetricDef, 'unit' | 'decimals'>): string {
  return formatByUnit(value, def.unit, def.decimals);
}

export function formatByUnit(value: number, unit: Unit, decimals = 0): string {
  switch (unit) {
    case 'count':
      return formatCompact(value);
    case 'percent':
    case 'ratio':
      return `${formatNumber(value, decimals)}${NNBSP}%`;
    case 'score':
      return formatNumber(value, decimals);
    case 'usd':
      return `${formatNumber(value, decimals)}${NNBSP}$`;
    case 'tokens':
      return value >= 1000
        ? `${formatNumber(value / 1000, value % 1000 === 0 ? 0 : 1)}M`
        : `${formatNumber(value)}k`;
    case 'tps':
      return `${formatNumber(value, decimals)}${NBSP}tok/s`;
  }
}

const dateLong = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const dateShort = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const dayMonth = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const timeUtc = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});

/** « 6 octobre 2026 » */
export const formatDate = (iso: string | Date): string => dateLong.format(new Date(iso));
/** « 6 oct. 2026 » */
export const formatDateShort = (iso: string | Date): string => dateShort.format(new Date(iso));
/** « 6 oct. » */
export const formatDayMonth = (iso: string | Date): string => dayMonth.format(new Date(iso));
/** « 07:00 UTC » */
export const formatTimeUtc = (iso: string | Date): string => `${timeUtc.format(new Date(iso))} UTC`;

/** « 1 h 12 » ou « 58 min » */
export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0
    ? `${String(h)}${NBSP}h${NBSP}${String(m).padStart(2, '0')}`
    : `${String(m)}${NBSP}min`;
}

/** « 12:03 » ou « 1:02:15 » : horodatage dans l'épisode. */
export function formatTimestamp(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${String(h)}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/** Rang sur deux chiffres : « 01 », « 10 ». */
export const padRank = (rank: number): string => String(rank).padStart(2, '0');

/** « il y a 2 h » : n'est utilisé que côté client, jamais dans un rendu statique. */
export function formatRelative(from: Date, now: Date): string {
  const sec = Math.max(0, Math.round((now.getTime() - from.getTime()) / 1000));
  if (sec < 60) return "à l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${String(min)}${NBSP}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${String(h)}${NBSP}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `il y a ${String(d)}${NBSP}j`;
  const mo = Math.floor(d / 30);
  return `il y a ${String(mo)}${NBSP}mois`;
}

export function pluralize(n: number, one: string, many: string): string {
  return `${String(n)}${NBSP}${n > 1 ? many : one}`;
}

/** Ordinal court : 1ᵉʳ, 2ᵉ… */
export function ordinal(n: number): string {
  return n === 1 ? '1ᵉʳ' : `${String(n)}ᵉ`;
}

/** Durée ISO 8601 pour schema.org : 4580 s → « PT1H16M20S ». */
export function isoDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `PT${h > 0 ? `${String(h)}H` : ''}${m > 0 ? `${String(m)}M` : ''}${s > 0 || (h === 0 && m === 0) ? `${String(s)}S` : ''}`;
}
