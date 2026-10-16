'use client';

import Image from 'next/image';
import { useContext, useEffect, useRef, useState, type CSSProperties } from 'react';
import { StageMotionContext } from './cinematic-stage';
import { useLocalization } from './localization';
import { localizedHref } from '@/i18n/routing';
import {
  HOME_STUDIO_DOOR_IMAGE,
  STUDIO_DOOR_DURATION_MS,
  STUDIO_VIDEO_CLUB_HREF,
} from '@/domain/home-studio';
import { VIDEO_CLUB_ROOM_IMAGE } from '@/domain/video-club';
import styles from './discovery-home.module.css';

export function StudioDoor() {
  const { locale, t } = useLocalization();
  const href = localizedHref(STUDIO_VIDEO_CLUB_HREF, locale);
  const paused = useContext(StageMotionContext);
  const [opening, setOpening] = useState(false);
  const started = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function restore() {
      if (timer.current) clearTimeout(timer.current);
      started.current = false;
      setOpening(false);
    }
    window.addEventListener('pageshow', restore);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener('pageshow', restore);
    };
  }, []);

  return (
    <div
      className={styles['studioDoor']}
      data-opening={opening}
      style={
        {
          '--door-artwork': `url("${HOME_STUDIO_DOOR_IMAGE}")`,
          '--door-duration': `${STUDIO_DOOR_DURATION_MS}ms`,
        } as CSSProperties
      }
    >
      {opening ? (
        <span className={styles['doorPortal']} aria-hidden="true">
          <span className={styles['doorInterior']}>
            <Image src={VIDEO_CLUB_ROOM_IMAGE} alt="" fill sizes="160px" />
          </span>
          <span className={styles['doorLeaf']} />
        </span>
      ) : null}
      <a
        href={href}
        className={styles['stageDoor']}
        aria-label={t('Entrer dans le vidéoclub')}
        data-analytics-event="discovery_open"
        data-analytics-destination="projects"
        data-analytics-placement="home"
        aria-busy={opening || undefined}
        onClick={(event) => {
          if (
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          )
            return;
          if (
            paused ||
            window.matchMedia(
              '(prefers-reduced-motion: reduce), (max-width: 900px), (max-width: 1100px) and (max-height: 540px)',
            ).matches
          )
            return;
          event.preventDefault();
          if (started.current) return;
          started.current = true;
          setOpening(true);
          timer.current = setTimeout(() => {
            window.location.assign(href);
          }, STUDIO_DOOR_DURATION_MS);
        }}
      />
    </div>
  );
}
