import type { Movement, OutMovement, Snapshot, SnapshotEntry } from './schema.ts';

/**
 * Mouvements d'une semaine par rapport à la précédente.
 * Calculés à la lecture : un snapshot publié n'est jamais modifié, donc la même comparaison donne toujours le même résultat.
 *
 * `history` est trié par semaine croissante, `index` désigne le snapshot à analyser.
 * Les rangs au-delà de `size` existent dans le pool (« bubbling under ») mais ne comptent pas comme Top.
 */
export function computeMovements(
  history: readonly Snapshot[],
  index: number,
  size: number,
): { moves: Movement[]; out: OutMovement[] } {
  const current = history[index];
  if (!current) throw new Error(`Snapshot ${String(index)} introuvable`);
  const previous = index > 0 ? history[index - 1] : undefined;
  const earlier = history.slice(0, Math.max(0, index - 1));

  const prevByEntity = new Map<string, SnapshotEntry>();
  for (const e of previous?.entries ?? []) prevByEntity.set(e.entity, e);

  const moves: Movement[] = [];
  for (const entry of current.entries) {
    if (entry.rank > size) break;
    const prev = prevByEntity.get(entry.entity);
    const previousRank = prev?.rank ?? null;
    if (prev && prev.rank <= size) {
      const delta = prev.rank - entry.rank;
      moves.push({
        entity: entry.entity,
        kind: delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable',
        rank: entry.rank,
        previousRank,
        delta,
      });
      continue;
    }
    // Pas dans le Top la semaine précédente : première fois, ou retour.
    const wasInTopBefore = earlier.some((s) =>
      s.entries.some((e) => e.entity === entry.entity && e.rank <= size),
    );
    moves.push({
      entity: entry.entity,
      kind: wasInTopBefore ? 're' : 'new',
      rank: entry.rank,
      previousRank,
      delta: 0,
    });
  }

  const out: OutMovement[] = [];
  const currentByEntity = new Map(current.entries.map((e) => [e.entity, e] as const));
  for (const prev of previous?.entries ?? []) {
    if (prev.rank > size) break;
    const now = currentByEntity.get(prev.entity);
    if (!now || now.rank > size) {
      out.push({ entity: prev.entity, previousRank: prev.rank, currentRank: now?.rank ?? null });
    }
  }
  return { moves, out };
}

/** Le premier snapshot n'a pas de semaine précédente : ses entrées ne sont pas des « NEW », il n'y a rien à comparer. */
export function isBaseline(index: number): boolean {
  return index === 0;
}

export const movementLabel: Record<Movement['kind'] | 'out', string> = {
  up: 'UP',
  down: 'DOWN',
  stable: 'STABLE',
  new: 'NEW',
  re: 'RE-ENTRY',
  out: 'OUT',
};
