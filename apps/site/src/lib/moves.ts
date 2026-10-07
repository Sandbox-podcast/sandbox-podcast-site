import { formatCompact, ordinal } from '../domain/format.ts';
import type { Highlight } from './repository.ts';

/** Textes des événements de classement : la matière première des cartes de partage et du bandeau. */
export function highlightHeadline(h: Highlight): string {
  const name = h.entity.name;
  const title = h.chart.title;
  const n = Math.abs(h.delta);
  switch (h.kind) {
    case 'number-one':
      return `${name} passe #1 du ${title} cette semaine.`;
    case 'up':
      return `${name} gagne ${String(n)} place${n > 1 ? 's' : ''} dans le ${title} (n°${String(h.rank ?? '')}).`;
    case 'down':
      return `${name} perd ${String(n)} place${n > 1 ? 's' : ''} dans le ${title} (n°${String(h.rank ?? '')}).`;
    case 'new':
      return `${name} entre dans le ${title}, à la ${ordinal(h.rank ?? 0)} place.`;
    case 're':
      return `${name} revient dans le ${title} (n°${String(h.rank ?? '')}).`;
    case 'out':
      return `${name} sort du ${title}.`;
    case 'surge':
      return `${name} : +${formatCompact(h.stat?.value ?? 0)} stars en 7 jours.`;
  }
}

export interface TickerPart {
  badge: string;
  tone: 'up' | 'down' | 'neutral' | 'hot';
  text: string;
}

export function highlightTicker(h: Highlight): TickerPart {
  const where = h.chart.short;
  switch (h.kind) {
    case 'number-one':
      return { badge: '#1', tone: 'hot', text: `${h.entity.name} · ${where}` };
    case 'up':
      return { badge: `▲ ${String(h.delta)}`, tone: 'up', text: `${h.entity.name} · ${where}` };
    case 'down':
      return {
        badge: `▼ ${String(Math.abs(h.delta))}`,
        tone: 'down',
        text: `${h.entity.name} · ${where}`,
      };
    case 'new':
      return { badge: 'NEW', tone: 'hot', text: `${h.entity.name} · ${where}` };
    case 're':
      return { badge: 'RE', tone: 'neutral', text: `${h.entity.name} · ${where}` };
    case 'out':
      return { badge: 'OUT', tone: 'down', text: `${h.entity.name} · ${where}` };
    case 'surge':
      return {
        badge: `★ +${formatCompact(h.stat?.value ?? 0)}`,
        tone: 'hot',
        text: `${h.entity.name} · ${where}`,
      };
  }
}

/** Une carte de partage est identifiée par classement, semaine et entité ; elle regroupe tous les événements du trio. */
export const sharePath = (chart: string, week: string, entity: string): string =>
  `/moves/${chart}/${week}/${entity}`;

export const movePath = (h: Pick<Highlight, 'chart' | 'week' | 'entity'>): string =>
  sharePath(h.chart.slug, h.week, h.entity.slug);

/** Détail court pour les listes denses : où en est l'entité, d'où elle vient. */
export function highlightDetail(h: Highlight): string {
  const n = Math.abs(h.delta);
  const rank = h.rank ?? 0;
  switch (h.kind) {
    case 'number-one':
      return h.stat
        ? `${h.chart.title} · prend la tête, +${formatCompact(h.stat.value)} stars en 7 jours`
        : `${h.chart.title} · prend la tête`;
    case 'up':
      return `${h.chart.title} · n°${String(rank)} (était n°${String(rank + n)})`;
    case 'down':
      return `${h.chart.title} · n°${String(rank)} (était n°${String(rank - n)})`;
    case 'new':
      return `${h.chart.title} · entre à la ${ordinal(rank)} place`;
    case 're':
      return `${h.chart.title} · retour à la ${ordinal(rank)} place`;
    case 'out':
      return `${h.chart.title} · sort du Top ${String(h.chart.size)}`;
    case 'surge':
      return `${h.chart.title} · +${formatCompact(h.stat?.value ?? 0)} stars en 7 jours`;
  }
}
