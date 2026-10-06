import type { Entity } from '../domain/schema.ts';
import { currentRanks } from './repository.ts';

/** Description de page : la place actuelle d'abord (c'est ce qu'on cherche), puis ce que c'est. */
export function entityDescription(entity: Entity): string {
  const ranks = currentRanks(entity.slug)
    .map((r) => `n°${String(r.rank)} du ${r.chart.title}`)
    .join(', ');
  const head = ranks ? `${entity.name} : ${ranks}. ` : `${entity.name}. `;
  return `${head}${entity.tagline}. Historique, benchmarks, épisodes et avis de l’équipe.`;
}
