import Image from 'next/image';
import type { HistoryEvent } from '@/domain/time-machine';
import { historyArtworkPath, historyArtworkSubject } from '@/domain/time-machine-artwork';

/** Le titre voisin porte le sens ; ces images de concept restent décoratives. */
export function HistoryArtwork({
  event,
  featured = false,
  sizes,
}: {
  event: HistoryEvent;
  featured?: boolean;
  sizes?: string;
}) {
  return (
    <Image
      src={historyArtworkPath(event)}
      alt=""
      aria-hidden="true"
      fill
      sizes={
        sizes ??
        (featured
          ? '(max-width: 700px) 92vw, (max-width: 1440px) 55vw, 740px'
          : '(max-width: 460px) 92vw, (max-width: 1000px) 45vw, 420px')
      }
      quality={90}
      unoptimized
      loading={featured ? 'eager' : 'lazy'}
      data-history-artwork={historyArtworkSubject(event)}
      data-history-artwork-id={event.id}
      style={{ objectFit: 'cover' }}
    />
  );
}
