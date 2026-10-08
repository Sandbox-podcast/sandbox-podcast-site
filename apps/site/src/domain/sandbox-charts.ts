import { entityHistory } from './history.ts';
import { computeMovements } from './movements.ts';
import type { ChartEdition, Entity, Movement, Snapshot, SnapshotEntry } from './schema.ts';
import { compareWeeks, previousWeek, weekStart } from './weeks.ts';

export type ChartId = 'github' | 'skills' | 'models' | 'rising';
export type ChartPeriod = 'week' | 'month' | 'quarter' | 'all';
export const CHART_PERIODS: { id: ChartPeriod; label: string; weeks: number | null }[] = [
  { id: 'week', label: 'CETTE SEMAINE', weeks: 1 },
  { id: 'month', label: 'CE MOIS', weeks: 4 },
  { id: 'quarter', label: '3 MOIS', weeks: 13 },
  { id: 'all', label: 'DEPUIS LE DÉBUT', weeks: null },
];
export const CHART_LABELS: Record<ChartId, { title: string; subtitle: string; slug: string }> = {
  github: {
    title: 'GITHUB TOP 20',
    subtitle: 'Les projets IA qui progressent le plus vite sur GitHub.',
    slug: 'github',
  },
  skills: {
    title: 'SKILLS TOP 20',
    subtitle: 'Les skills, agents et MCP qui gagnent du terrain.',
    slug: 'skills',
  },
  models: {
    title: 'MODELS TOP 20',
    subtitle: 'Les modèles d’IA en tête actuellement.',
    slug: 'ai-models',
  },
  rising: { title: 'RISING 20', subtitle: 'Les projets à suivre dès maintenant.', slug: 'rising' },
};
export const PROJECT_FILTERS = [
  'All',
  'Agents',
  'Coding',
  'MCP',
  'LLM',
  'RAG',
  'Research',
  'Image',
  'Video',
  'Voice',
  'Infrastructure',
];
export const SKILL_FILTERS = [
  'All',
  'Coding',
  'Research',
  'Productivity',
  'Design',
  'Marketing',
  'Data',
  'DevOps',
  'Browser',
  'Automation',
];
export const MODEL_VIEWS = [
  { id: 'quality', label: 'Général' },
  { id: 'coding', label: 'Code' },
  { id: 'reasoning', label: 'Raisonnement' },
  { id: 'research', label: 'Recherche' },
  { id: 'agents', label: 'Agents' },
  { id: 'image', label: 'Image' },
  { id: 'video', label: 'Vidéo' },
  { id: 'open', label: 'Code ouvert' },
  { id: 'speed', label: 'Vitesse' },
  { id: 'value', label: 'Rapport qualité-prix' },
];

const FILTER_LABELS: Record<string, string> = {
  All: 'Toutes',
  Coding: 'Code',
  Research: 'Recherche',
  Image: 'Image',
  Video: 'Vidéo',
  Voice: 'Voix',
  Infrastructure: 'Infrastructure',
  Productivity: 'Productivité',
  Design: 'Design',
  Data: 'Données',
  Browser: 'Navigateur',
  Automation: 'Automatisation',
};

export function chartFilterLabel(filter: string): string {
  return FILTER_LABELS[filter] ?? filter;
}

export interface ChartsEntity extends Pick<
  Entity,
  | 'slug'
  | 'kind'
  | 'name'
  | 'org'
  | 'tagline'
  | 'description'
  | 'category'
  | 'topics'
  | 'links'
  | 'openWeights'
  | 'github'
> {
  href: string;
}
export interface ChartsSeries {
  id: ChartId;
  slug: string;
  primary: string;
  dimensions: { id: string; label: string }[];
  metrics: { key: string; label: string; unit: string; source: string; url: string }[];
  snapshots: Snapshot[];
  editions: ChartEdition[];
}
export interface ChartsTake {
  chart: string;
  week: string;
  entity: string;
  text: string;
  author: string;
}
export interface ChartsData {
  mode: 'live' | 'fixtures' | 'pending' | 'unavailable';
  week: string;
  weeks: string[];
  entities: ChartsEntity[];
  series: ChartsSeries[];
  takes: ChartsTake[];
  episodes: { number: number; title: string; chart: string; week: string; href: string }[];
  newsletterUrl: string | null;
}
export interface ChartsRow {
  entity: ChartsEntity;
  rank: number;
  score: number;
  metrics: Record<string, number>;
  dimensions: Record<string, number>;
  movement: Movement;
  baseline: boolean;
  rankSeries: { week: string; rank: number | null }[];
  momentum: (number | null)[];
  weeksInTop: number;
  peak: number | null;
  periodStars: number | null;
  insight: ChartEdition['insights'][number] | undefined;
  take: ChartsTake | undefined;
  status: 'NEW' | 'RISING' | 'TRENDING' | 'ESTABLISHED';
}

export function hasChartEdition(data: ChartsData, id: ChartId, week: string): boolean {
  return data.series.some(
    (series) => series.id === id && series.snapshots.some((snapshot) => snapshot.week === week),
  );
}

const byRank = (a: SnapshotEntry, b: SnapshotEntry): number => a.rank - b.rank;

function rankedEntries(
  snapshot: Snapshot,
  dimension: string,
  primary: string,
  entities: Map<string, ChartsEntity>,
  openOnly: boolean,
): SnapshotEntry[] {
  const sorted = snapshot.entries.filter(
    (entry) =>
      (!openOnly || entities.get(entry.entity)?.openWeights === true) &&
      (dimension === primary || entry.dimensions[dimension] !== undefined),
  );
  return sorted
    .toSorted((a, b) =>
      dimension === primary
        ? byRank(a, b)
        : (b.dimensions[dimension] ?? 0) - (a.dimensions[dimension] ?? 0) || byRank(a, b),
    )
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      score: entry.dimensions[dimension] ?? entry.score,
    }));
}

/** Les périodes longues sont un indice de présence aux meilleures places, jamais une moyenne de scores normalisés. */
function aggregateSnapshots(snapshots: Snapshot[]): Snapshot | undefined {
  const last = snapshots.at(-1);
  if (!last) return undefined;
  const points = new Map<string, { entry: SnapshotEntry; total: number; stars: number | null }>();
  for (const snapshot of snapshots) {
    for (const entry of snapshot.entries) {
      const previous = points.get(entry.entity);
      const stars = entry.metrics['stars7d'];
      points.set(entry.entity, {
        entry,
        total: (previous?.total ?? 0) + 100 / entry.rank,
        stars: stars === undefined ? (previous?.stars ?? null) : (previous?.stars ?? 0) + stars,
      });
    }
  }
  const entries = [...points.values()]
    .toSorted((a, b) => b.total - a.total || a.entry.entity.localeCompare(b.entry.entity))
    .map((point, index) => ({
      ...point.entry,
      rank: index + 1,
      score: Math.round((point.total / snapshots.length) * 100) / 100,
      metrics: {
        ...point.entry.metrics,
        ...(point.stars !== null ? { periodStars: point.stars } : {}),
      },
    }));
  return { ...last, entries };
}

export function chartRows(
  data: ChartsData,
  id: ChartId,
  week: string,
  period: ChartPeriod = 'week',
  view?: string,
): ChartsRow[] {
  const series = data.series.find((item) => item.id === id);
  if (!series) return [];
  const entities = new Map(data.entities.map((entity) => [entity.slug, entity]));
  const dimension = view === 'open' ? series.primary : (view ?? series.primary);
  const history = series.snapshots
    .filter((snapshot) => compareWeeks(snapshot.week, week) <= 0)
    .map((snapshot) => ({
      ...snapshot,
      entries: rankedEntries(snapshot, dimension, series.primary, entities, view === 'open'),
    }));
  if (history.at(-1)?.week !== week) return [];
  const selectedMonth = editionMonth(week);
  const monthStart = new Date(`${selectedMonth}-01T00:00:00Z`);
  const priorMonth = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() - 1, 1),
  )
    .toISOString()
    .slice(0, 7);
  const windowEnd = weekStart(week).getTime();
  const quarterStart = windowEnd - 12 * 7 * 86400000;
  const currentWindow =
    period === 'month'
      ? history.filter((item) => editionMonth(item.week) === selectedMonth)
      : period === 'quarter'
        ? history.filter((item) => weekStart(item.week).getTime() >= quarterStart)
        : history;
  const selected = period === 'week' ? history.at(-1) : aggregateSnapshots(currentWindow);
  if (!selected) return [];
  const previous =
    period === 'all'
      ? undefined
      : period === 'week'
        ? history.find((item) => item.week === previousWeek(week))
        : aggregateSnapshots(
            period === 'month'
              ? history.filter((item) => editionMonth(item.week) === priorMonth)
              : history.filter((item) => {
                  const time = weekStart(item.week).getTime();
                  return time < quarterStart && time >= quarterStart - 13 * 7 * 86400000;
                }),
          );
  const comparison = previous ? [previous, selected] : [selected];
  const movementHistory = period === 'week' && previous ? history : comparison;
  const { moves } = computeMovements(movementHistory, movementHistory.length - 1, 20);
  const edition = series.editions.find((item) => item.week === week);
  return moves.flatMap((movement) => {
    const entry = selected.entries.find((item) => item.entity === movement.entity);
    const entity = entities.get(movement.entity);
    if (!entry || !entity) return [];
    const stats = entityHistory(history, entry.entity, 20);
    const momentum = history.slice(-5).map((snapshot) => {
      const item = snapshot.entries.find((candidate) => candidate.entity === entry.entity);
      return item?.metrics['stars7d'] ?? item?.score ?? null;
    });
    const officialMovement: Movement =
      data.mode === 'live' && movement.kind === 're' ? { ...movement, kind: 'new' } : movement;
    return [
      {
        entity,
        rank: entry.rank,
        score: entry.score,
        metrics: entry.metrics,
        dimensions: entry.dimensions,
        movement: officialMovement,
        baseline: previous === undefined,
        rankSeries: stats.points.slice(-5).map((point) => ({ week: point.week, rank: point.rank })),
        momentum,
        weeksInTop: stats.weeksInTop,
        peak: stats.peak,
        periodStars: entry.metrics['periodStars'] ?? entry.metrics['stars7d'] ?? null,
        insight: edition?.insights.find((item) => item.entity === entry.entity),
        take: data.takes.find(
          (take) =>
            take.chart === series.slug && take.week === week && take.entity === entry.entity,
        ),
        status:
          officialMovement.kind === 'new' && history.length > 1
            ? 'NEW'
            : movement.delta >= 3
              ? 'RISING'
              : movement.delta > 0
                ? 'TRENDING'
                : 'ESTABLISHED',
      },
    ];
  });
}

export function matchesChartFilter(entity: ChartsEntity, filter: string): boolean {
  if (filter === 'All') return true;
  const text = `${entity.category} ${entity.topics.join(' ')} ${entity.name}`.toLowerCase();
  const patterns: Record<string, RegExp> = {
    Agents: /agent/,
    Coding: /coding|code|développement/,
    MCP: /mcp/,
    LLM: /llm|modèle|model/,
    RAG: /rag|retrieval/,
    Research: /research|recherche/,
    Image: /image|vision/,
    Video: /vidéo|video/,
    Voice: /voice|voix|audio/,
    Infrastructure: /infrastructure|inférence|inference|serving/,
    Productivity: /productiv|assistant/,
    Design: /design/,
    Marketing: /marketing/,
    Data: /data|données|donnees/,
    DevOps: /devops|déploiement|deployment/,
    Browser: /browser|navigateur/,
    Automation: /automat|agent/,
  };
  return patterns[filter]?.test(text) ?? false;
}

/** Rising compare les accélérations au sein de chaque source avant de réunir les candidats. */
export function risingSnapshots(sources: readonly ChartsSeries[]): Snapshot[] {
  const weeks = [
    ...new Set(sources.flatMap((source) => source.snapshots.map((snapshot) => snapshot.week))),
  ].sort(compareWeeks);
  return weeks.map((week) => {
    const candidates = new Map<string, SnapshotEntry>();
    const selected: Snapshot[] = [];
    for (const source of sources) {
      const snapshot = source.snapshots.find((item) => item.week === week);
      const previous = source.snapshots.find((item) => item.week === previousWeek(week));
      if (!snapshot) continue;
      selected.push(snapshot);
      const stars = snapshot.entries
        .flatMap((entry) => (entry.metrics['stars'] === undefined ? [] : [entry.metrics['stars']]))
        .toSorted((a, b) => a - b);
      const median = stars[Math.floor(stars.length / 2)] ?? 0;
      const accelerating = snapshot.entries
        .flatMap((entry) => {
          const before = previous?.entries.find((item) => item.entity === entry.entity);
          if (!before) return [];
          const value = entry.metrics['stars7d'] ?? entry.score;
          const prior = before.metrics['stars7d'] ?? before.score;
          const small =
            entry.metrics['stars'] !== undefined
              ? entry.metrics['stars'] <= median
              : entry.rank > 10;
          if (!small || prior <= 0 || value <= prior) return [];
          return [{ entry, acceleration: ((value - prior) / prior) * 100 }];
        })
        .toSorted(
          (a, b) => b.acceleration - a.acceleration || a.entry.entity.localeCompare(b.entry.entity),
        );
      accelerating.forEach(({ entry, acceleration }, index) => {
        const score =
          Math.round(((accelerating.length - index) / accelerating.length) * 10000) / 100;
        const candidate = {
          ...entry,
          score,
          dimensions: { discovery: score },
          metrics: { ...entry.metrics, acceleration },
        };
        if (score > (candidates.get(entry.entity)?.score ?? -1))
          candidates.set(entry.entity, candidate);
      });
    }
    const entries = [...candidates.values()]
      .toSorted(
        (a, b) =>
          b.score - a.score ||
          (b.metrics['acceleration'] ?? 0) - (a.metrics['acceleration'] ?? 0) ||
          a.entity.localeCompare(b.entity),
      )
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
    return {
      chart: 'rising',
      week,
      publishedAt:
        selected
          .map((item) => item.publishedAt)
          .sort()
          .at(-1) ?? weekStart(week).toISOString(),
      retrievedAt:
        selected
          .map((item) => item.retrievedAt)
          .sort()
          .at(-1) ?? weekStart(week).toISOString(),
      provenance: selected.some((item) => item.provenance === 'mock') ? 'mock' : 'auto',
      entries,
    };
  });
}

export function editionMonth(week: string): string {
  return weekStart(week).toISOString().slice(0, 7);
}
export function chartMonthRows(data: ChartsData, id: ChartId, week: string): ChartsRow[] {
  const month = editionMonth(week);
  const series = data.series.map((item) => ({
    ...item,
    snapshots: item.snapshots.filter(
      (snapshot) => editionMonth(snapshot.week) === month && compareWeeks(snapshot.week, week) <= 0,
    ),
  }));
  return chartRows({ ...data, series }, id, week, 'all');
}

export interface MarketSignal {
  category: string;
  change: number | null;
  stars: number;
  candidates: number;
}
/** Cohorte identique entre les deux semaines ; un dépôt partagé n'est compté qu'une fois. */
export function marketSignals(data: ChartsData, week: string): MarketSignal[] {
  const current = new Map<string, SnapshotEntry>();
  const previous = new Map<string, SnapshotEntry>();
  for (const series of data.series.filter((item) => item.id === 'github' || item.id === 'skills')) {
    for (const entry of series.snapshots.find((snapshot) => snapshot.week === week)?.entries ?? [])
      current.set(entry.entity, entry);
    for (const entry of series.snapshots.find((snapshot) => snapshot.week === previousWeek(week))
      ?.entries ?? [])
      previous.set(entry.entity, entry);
  }
  return ['Agents', 'MCP', 'Coding', 'Infrastructure'].map((category) => {
    const cohort = data.entities.filter(
      (entity) =>
        current.has(entity.slug) &&
        previous.has(entity.slug) &&
        matchesChartFilter(entity, category),
    );
    const stars = cohort.reduce(
      (sum, entity) => sum + (current.get(entity.slug)?.metrics['stars7d'] ?? 0),
      0,
    );
    const before = cohort.reduce(
      (sum, entity) => sum + (previous.get(entity.slug)?.metrics['stars7d'] ?? 0),
      0,
    );
    return {
      category,
      change: before > 0 ? ((stars - before) / before) * 100 : null,
      stars,
      candidates: cohort.length,
    };
  });
}

export function chartsRecords(
  data: ChartsData,
  id: ChartId,
  week: string,
): { label: string; entity: ChartsEntity; value: string; week: string }[] {
  const source = data.series.find((item) => item.id === id);
  if (!source) return [];
  const history = source.snapshots.filter((snapshot) => compareWeeks(snapshot.week, week) <= 0);
  const stats = data.entities
    .map((entity) => ({ entity, history: entityHistory(history, entity.slug, 20) }))
    .filter((item) => item.history.weeksInTop > 0);
  const streaks = new Map<string, number>();
  let streak = 0;
  let previousLeader: string | undefined;
  let previousEdition: string | undefined;
  for (const snapshot of history.toSorted((a, b) => compareWeeks(a.week, b.week))) {
    const leader = snapshot.entries.find((entry) => entry.rank === 1)?.entity;
    streak =
      leader && leader === previousLeader && previousEdition === previousWeek(snapshot.week)
        ? streak + 1
        : 1;
    if (leader) streaks.set(leader, Math.max(streaks.get(leader) ?? 0, streak));
    previousLeader = leader;
    previousEdition = snapshot.week;
  }
  const longest = stats.toSorted(
    (a, b) => (streaks.get(b.entity.slug) ?? 0) - (streaks.get(a.entity.slug) ?? 0),
  )[0];
  const regular = stats.toSorted((a, b) => b.history.weeksInTop - a.history.weeksInTop)[0];
  const jumper = stats.toSorted(
    (a, b) => (b.history.biggestClimb?.places ?? 0) - (a.history.biggestClimb?.places ?? 0),
  )[0];
  const records: { label: string; entity: ChartsEntity; value: string; week: string }[] = [];
  if (longest && (streaks.get(longest.entity.slug) ?? 0) > 0)
    records.push({
      label: 'PLUS LONGUE SÉRIE À LA 1RE PLACE',
      entity: longest.entity,
      value: `${streaks.get(longest.entity.slug)} sem.`,
      week,
    });
  if (jumper?.history.biggestClimb)
    records.push({
      label: 'PLUS FORTE HAUSSE HEBDOMADAIRE',
      entity: jumper.entity,
      value: `+${jumper.history.biggestClimb.places}`,
      week: jumper.history.biggestClimb.week,
    });
  if (regular)
    records.push({
      label: 'PLUS DE SEMAINES DANS LE TOP 20',
      entity: regular.entity,
      value: `${regular.history.weeksInTop} sem.`,
      week,
    });
  return records;
}
