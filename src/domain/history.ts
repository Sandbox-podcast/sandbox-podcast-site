import type { Snapshot } from './schema.ts';

export interface HistoryPoint {
  week: string;
  /** Rang dans le pool (peut dépasser `size`), null si l'entité n'était pas suivie cette semaine-là. */
  rank: number | null;
  inTop: boolean;
  score: number | null;
  metrics: Record<string, number>;
  dimensions: Record<string, number>;
}

export interface EntityHistory {
  points: HistoryPoint[];
  currentRank: number | null;
  previousRank: number | null;
  /** Meilleure place atteinte dans le Top (null si jamais entré). */
  peak: number | null;
  weeksAtPeak: number;
  weeksInTop: number;
  /** Semaines consécutives dans le Top, en comptant jusqu'au dernier snapshot. */
  currentStreak: number;
  longestStreak: number;
  firstWeek: string | null;
  weeksAtNumberOne: number;
  /** Plus forte progression d'une semaine à l'autre, en places. */
  biggestClimb: { places: number; week: string } | null;
  biggestFall: { places: number; week: string } | null;
}

/** Historique d'une entité dans un classement, à partir de la suite complète des snapshots. */
export function entityHistory(
  history: readonly Snapshot[],
  entity: string,
  size: number,
): EntityHistory {
  const points: HistoryPoint[] = history.map((snap) => {
    const entry = snap.entries.find((e) => e.entity === entity);
    return {
      week: snap.week,
      rank: entry?.rank ?? null,
      inTop: entry !== undefined && entry.rank <= size,
      score: entry?.score ?? null,
      metrics: entry?.metrics ?? {},
      dimensions: entry?.dimensions ?? {},
    };
  });

  const topRanks = points.flatMap((p) => (p.inTop && p.rank !== null ? [p.rank] : []));
  const peak = topRanks.length > 0 ? Math.min(...topRanks) : null;

  let currentStreak = 0;
  for (let i = points.length - 1; i >= 0 && points[i]?.inTop; i--) currentStreak++;
  let longestStreak = 0;
  let run = 0;
  for (const p of points) {
    run = p.inTop ? run + 1 : 0;
    longestStreak = Math.max(longestStreak, run);
  }

  let climb: EntityHistory['biggestClimb'] = null;
  let fall: EntityHistory['biggestFall'] = null;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b || !a.inTop || !b.inTop || a.rank === null || b.rank === null) continue;
    const delta = a.rank - b.rank;
    if (delta > 0 && (!climb || delta > climb.places)) climb = { places: delta, week: b.week };
    if (delta < 0 && (!fall || -delta > fall.places)) fall = { places: -delta, week: b.week };
  }

  const last = points[points.length - 1];
  const before = points[points.length - 2];
  return {
    points,
    currentRank: last?.rank ?? null,
    previousRank: before?.rank ?? null,
    peak,
    weeksAtPeak: peak === null ? 0 : topRanks.filter((r) => r === peak).length,
    weeksInTop: topRanks.length,
    currentStreak,
    longestStreak,
    firstWeek: points.find((p) => p.inTop)?.week ?? null,
    weeksAtNumberOne: topRanks.filter((r) => r === 1).length,
    biggestClimb: climb,
    biggestFall: fall,
  };
}

export interface Reign {
  entity: string;
  from: string;
  to: string;
  weeks: number;
}

/** Séries de semaines consécutives à la première place : le « Hall of #1 ». */
export function reigns(history: readonly Snapshot[]): Reign[] {
  const out: Reign[] = [];
  for (const snap of history) {
    const top = snap.entries[0];
    if (!top) continue;
    const last = out[out.length - 1];
    if (last?.entity === top.entity) {
      last.to = snap.week;
      last.weeks += 1;
    } else {
      out.push({ entity: top.entity, from: snap.week, to: snap.week, weeks: 1 });
    }
  }
  return out;
}
