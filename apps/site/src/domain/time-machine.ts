import { z } from 'zod';

export const HISTORY_CATEGORIES = {
  model: { label: 'Modèles', singular: 'Modèle', color: '#50d9ee' },
  research: { label: 'Recherche', singular: 'Recherche', color: '#b5a4f5' },
  product: { label: 'Produits', singular: 'Produit', color: '#f0bb73' },
  milestone: { label: 'Démonstrations', singular: 'Démonstration', color: '#82cfa0' },
  governance: { label: 'Société & règles', singular: 'Société & règles', color: '#ed99ad' },
} as const;

export const HISTORY_DATE_KINDS = {
  announcement: 'Annonce',
  release: 'Ouverture / sortie',
  publication: 'Publication scientifique',
  event: 'Événement',
  effective: 'Entrée en vigueur',
} as const;

export type HistoryCategory = keyof typeof HISTORY_CATEGORIES;
export type HistoryDateKind = keyof typeof HISTORY_DATE_KINDS;

const historicalDate = z
  .string()
  .regex(/^\d{4}(-\d{2}(-\d{2})?)?$/)
  .refine((value) => {
    const normalized =
      value.length === 4 ? value + '-01-01' : value.length === 7 ? value + '-01' : value;
    const parsed = new Date(normalized + 'T00:00:00Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === normalized;
  }, 'Date historique invalide');

export const historyEventSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  date: historicalDate,
  dateKind: z.enum(['announcement', 'release', 'publication', 'event', 'effective']),
  title: z.string().min(2).max(100),
  shortTitle: z.string().min(2).max(35),
  organization: z.string().min(2).max(100),
  category: z.enum(['model', 'research', 'product', 'milestone', 'governance']),
  summary: z.string().min(10).max(500),
  context: z.string().min(10).max(650),
  landmark: z.boolean(),
  tags: z.array(z.string().min(1)).min(1).max(8),
  sources: z
    .array(
      z.object({
        label: z.string().min(2),
        url: z
          .url()
          .refine((value) => new URL(value).protocol === 'https:', 'Source HTTPS requise'),
      }),
    )
    .min(1)
    .max(3),
});

export const timeMachineDataSchema = z
  .object({
    reviewedAt: z.iso.date(),
    fromYear: z.number().int().min(1900),
    toYear: z.number().int().max(2100),
    events: z.array(historyEventSchema),
  })
  .superRefine((data, context) => {
    if (data.fromYear > data.toYear)
      context.addIssue({ code: 'custom', message: 'Période inversée' });
    const ids = new Set<string>();
    data.events.forEach((event, index) => {
      if (ids.has(event.id))
        context.addIssue({
          code: 'custom',
          path: ['events', index, 'id'],
          message: 'Identifiant dupliqué',
        });
      ids.add(event.id);
      const year = Number(event.date.slice(0, 4));
      if (year < data.fromYear || year > data.toYear || event.date > data.reviewedAt)
        context.addIssue({
          code: 'custom',
          path: ['events', index, 'date'],
          message: 'Événement hors de la période vérifiée',
        });
    });
  });

export type HistoryEvent = z.infer<typeof historyEventSchema>;
export type TimeMachineData = z.infer<typeof timeMachineDataSchema>;

export function historyEventAnchor(id: string): string {
  return `ia-${id}`;
}

export const HISTORY_ERAS = [
  {
    id: 'foundations',
    from: 1996,
    to: 2011,
    label: 'Les fondations',
    detail: 'Calcul, données et premières victoires',
  },
  {
    id: 'deep-learning',
    from: 2012,
    to: 2016,
    label: 'Le deep learning',
    detail: 'Reconnaître, apprendre, jouer',
  },
  {
    id: 'transformers',
    from: 2017,
    to: 2021,
    label: 'Les Transformers',
    detail: "Le langage change d'échelle",
  },
  {
    id: 'generative',
    from: 2022,
    to: 2024,
    label: "L'IA générative",
    detail: 'Texte, image, son et vidéo',
  },
  {
    id: 'reasoning',
    from: 2025,
    to: 2026,
    label: 'Raisonnement & agents',
    detail: 'Des modèles aux tâches',
  },
] as const;

export interface HistoryFilters {
  category?: HistoryCategory | 'all';
  fromYear?: number;
  toYear?: number;
  query?: string;
  landmarksOnly?: boolean;
}

export interface HistoryPeriod {
  fromYear: number;
  toYear: number;
}

/** La borne modifiée entraîne l'autre si nécessaire, pour garder une période valide. */
export function changeHistoryPeriod(
  period: HistoryPeriod,
  boundary: 'from' | 'to',
  year: number,
  bounds: HistoryPeriod,
): HistoryPeriod {
  if (!Number.isInteger(year)) return period;
  const clamped = Math.min(bounds.toYear, Math.max(bounds.fromYear, year));
  return boundary === 'from'
    ? { fromYear: clamped, toYear: Math.max(clamped, period.toYear) }
    : { fromYear: Math.min(period.fromYear, clamped), toYear: clamped };
}

export function historyTimestamp(date: string): number {
  return Date.parse(
    (date.length === 4 ? date + '-01-01' : date.length === 7 ? date + '-01' : date) + 'T00:00:00Z',
  );
}

export function historyDate(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    ...(date.length > 7 ? { day: 'numeric' as const } : {}),
    ...(date.length > 4 ? { month: 'long' as const } : {}),
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(historyTimestamp(date)));
}

export function sortHistory(events: readonly HistoryEvent[]): HistoryEvent[] {
  return [...events].sort(
    (a, b) => historyTimestamp(a.date) - historyTimestamp(b.date) || a.id.localeCompare(b.id, 'en'),
  );
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR')
    .trim();
}

export function filterHistory(
  events: readonly HistoryEvent[],
  filters: HistoryFilters,
): HistoryEvent[] {
  const query = normalizeSearch(filters.query ?? '');
  return sortHistory(
    events.filter((event) => {
      const year = Number(event.date.slice(0, 4));
      return (
        (!filters.category || filters.category === 'all' || event.category === filters.category) &&
        (filters.fromYear === undefined || year >= filters.fromYear) &&
        (filters.toYear === undefined || year <= filters.toYear) &&
        (!filters.landmarksOnly || event.landmark) &&
        (!query ||
          normalizeSearch(
            [event.title, event.organization, event.summary, ...event.tags].join(' '),
          ).includes(query))
      );
    }),
  );
}

export interface HistoryPoint {
  event: HistoryEvent;
  x: number;
  y: number;
  count: number;
}

/** X est le temps réel. Y compte uniquement les événements de la sélection. */
export function historyCurve(
  events: readonly HistoryEvent[],
  fromYear: number,
  toYear: number,
): HistoryPoint[] {
  const ordered = sortHistory(events);
  const from = Date.UTC(fromYear, 0, 1);
  const to = Date.UTC(toYear + 1, 0, 1);
  return ordered.map((event, index) => ({
    event,
    x: Math.max(0, Math.min(1, (historyTimestamp(event.date) - from) / Math.max(1, to - from))),
    y: (index + 1) / Math.max(1, ordered.length),
    count: index + 1,
  }));
}

export function nearestHistoryPoint(points: readonly HistoryPoint[], position: number): number {
  let nearest = 0;
  let distance = Infinity;
  points.forEach((point, index) => {
    const next = Math.abs(point.x - position);
    if (next < distance) {
      distance = next;
      nearest = index;
    }
  });
  return nearest;
}

export function historyYears(events: readonly HistoryEvent[]): number[] {
  return [...new Set(events.map((event) => Number(event.date.slice(0, 4))))].sort((a, b) => b - a);
}

export function buildHistoryWrapped(data: TimeMachineData, year: number) {
  const events = filterHistory(data.events, { fromYear: year, toYear: year });
  return {
    year,
    events,
    highlights: events.filter((event) => event.landmark).slice(0, 6),
    organizations: new Set(events.map((event) => event.organization)).size,
    models: events.filter((event) => event.category === 'model').length,
    ongoing: year >= Number(data.reviewedAt.slice(0, 4)),
    reviewedAt: data.reviewedAt,
  };
}

export type HistoryWrapped = ReturnType<typeof buildHistoryWrapped>;
