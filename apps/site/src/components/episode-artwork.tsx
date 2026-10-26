'use client';

import Image from 'next/image';
import { useLocalization } from './localization';
import {
  cinemaPosterArtwork,
  replayPortraitArtwork,
  replayPosterCaption,
} from '@/domain/replay-posters';
import styles from './episode-artwork.module.css';

/** Les titres traduits restent du texte HTML ; aucun texte français n'est repris des pixels. */
export function EpisodeArtwork({
  artwork,
  videoId,
  title,
  number,
  portrait = false,
  cinema = false,
  sizes,
  className,
  loading = 'lazy',
}: {
  artwork?: string | undefined;
  videoId?: string | undefined;
  title: string;
  number?: number | undefined;
  portrait?: boolean;
  cinema?: boolean;
  sizes: string;
  className?: string;
  loading?: 'eager' | 'lazy';
}) {
  const { locale, t } = useLocalization();
  const cinemaArtwork = cinema ? (cinemaPosterArtwork(videoId) ?? artwork) : undefined;
  if (cinema)
    return (
      <span
        className={styles['cinema']}
        data-cinema-episode-artwork={locale}
        data-with-poster={cinemaPosterArtwork(videoId) ? 'true' : 'false'}
        data-mood={videoId === '7KVqydbGow0' ? 'amber' : 'cyan'}
        aria-hidden="true"
      >
        {cinemaArtwork ? (
          <Image src={cinemaArtwork} alt="" fill sizes={sizes} loading={loading} />
        ) : null}
        <span className={styles['cinemaCopy']}>
          <span className={styles['cinemaBrand']}>SANDBOX</span>
          <span className={styles['cinemaTitle']}>{t(replayPosterCaption(videoId) ?? title)}</span>
          <span className={styles['cinemaRule']} />
          {number !== undefined ? (
            <span className={styles['cinemaNumber']}>{t(`Épisode ${String(number)}`)}</span>
          ) : null}
        </span>
      </span>
    );
  if (locale === 'fr-FR')
    return artwork ? (
      <Image src={artwork} alt="" fill sizes={sizes} className={className} loading={loading} />
    ) : null;

  const portraits = replayPortraitArtwork(videoId);
  return (
    <span
      className={styles['localized']}
      data-localized-episode-artwork={locale}
      data-layout={portrait ? 'portrait' : 'landscape'}
      data-with-portraits={portraits ? 'true' : 'false'}
      aria-hidden="true"
    >
      {portraits ? (
        <span className={styles['portraits']}>
          <Image src={portraits} alt="" width={768} height={1152} sizes={sizes} loading={loading} />
        </span>
      ) : null}
      <span className={styles['copy']}>
        <span className={styles['brand']}>SANDBOX</span>
        {number !== undefined ? (
          <span className={styles['number']}>{t(`Épisode ${String(number)}`)}</span>
        ) : null}
        <span className={styles['title']}>{t(replayPosterCaption(videoId) ?? title)}</span>
      </span>
    </span>
  );
}
