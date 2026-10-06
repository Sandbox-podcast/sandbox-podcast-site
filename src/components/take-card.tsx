import { formatDateShort } from '@/domain/format';
import type { TakeView } from '@/lib/repository';

/**
 * OUR TAKE : l'avis de l'équipe. Composant, typographie et couleurs distincts de la donnée (DATA),
 * et signé : on sait toujours qui parle.
 */
export function TakeCard({ take, showDate = false }: { take: TakeView; showDate?: boolean }) {
  return (
    <figure className="take m-0">
      <figcaption className="take-head label">
        <span className="take-dot" aria-hidden="true" />
        <span>OUR TAKE</span>
        <span className="take-who" aria-hidden="true">
          {take.host.name.slice(0, 1)}
        </span>
        <span>
          {take.host.name}
          {showDate ? ` · ${formatDateShort(take.publishedAt)}` : ''}
        </span>
      </figcaption>
      <blockquote className="take-body m-0">« {take.text} »</blockquote>
    </figure>
  );
}
