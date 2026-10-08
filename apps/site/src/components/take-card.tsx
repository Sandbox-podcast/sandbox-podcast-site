import { Text } from '@/components/localization';
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
        <span>
          <Text>{'OUR TAKE'}</Text>
        </span>
        <span className="take-who" aria-hidden="true">
          <Text>{take.host.name.slice(0, 1)}</Text>
        </span>
        <span>
          <Text>{take.host.name}</Text>
          <Text>{showDate ? ` · ${formatDateShort(take.publishedAt)}` : ''}</Text>
        </span>
      </figcaption>
      <blockquote className="take-body m-0">
        <Text>{'\u00AB '}</Text>
        <Text>{take.text}</Text>
        <Text>{' \u00BB'}</Text>
      </blockquote>
    </figure>
  );
}
