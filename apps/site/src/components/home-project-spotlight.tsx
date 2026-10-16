'use client';

import Image from 'next/image';
import { useContext, useRef, useState } from 'react';
import { PROJECT_CREATORS, type PersonalProject } from '@/domain/personal-projects';
import { HOME_PROJECT_ARTWORK } from '@/domain/home-project-artwork';
import { LocalizedLink, Text, useLocalization } from './localization';
import { StageMotionContext } from './home-motion';
import styles from './home-project-spotlight.module.css';

export function HomeProjectSpotlight({ projects }: { projects: readonly PersonalProject[] }) {
  const [selected, setSelected] = useState(0);
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const paused = useContext(StageMotionContext);
  const { t } = useLocalization();
  const active = selected % Math.max(1, projects.length);
  const select = (index: number) => {
    setSelected((index + projects.length) % projects.length);
  };
  if (!projects.length) return null;
  return (
    <div
      className={styles['spotlight']}
      data-motion-paused={paused}
      role="region"
      aria-roledescription={t('carrousel')}
      aria-label={t("Projets de l'équipe")}
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const destination = {
          ArrowLeft: active - 1,
          ArrowRight: active + 1,
          Home: 0,
          End: projects.length - 1,
        }[event.key];
        if (destination === undefined) return;
        event.preventDefault();
        select(destination);
        if (event.target instanceof HTMLAnchorElement) {
          const region = event.currentTarget;
          requestAnimationFrame(() => {
            region
              .querySelector<HTMLAnchorElement>('a[data-position="active"]')
              ?.focus({ preventScroll: true });
          });
        }
      }}
    >
      <div
        className={styles['rail']}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
          swiped.current = false;
        }}
        onPointerCancel={(event) => {
          if (gesture.current?.id === event.pointerId) gesture.current = null;
        }}
        onPointerUp={(event) => {
          const start = gesture.current;
          if (start?.id !== event.pointerId) return;
          gesture.current = null;
          const dx = event.clientX - start.x;
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(event.clientY - start.y)) {
            swiped.current = true;
            select(active + (dx < 0 ? 1 : -1));
          }
        }}
      >
        {projects.map((project, index) => {
          const current = index === active;
          const artwork = HOME_PROJECT_ARTWORK[project.slug] ?? project.cover?.src;
          const placement = current
            ? 'active'
            : index === (active + 1) % projects.length
              ? 'next'
              : 'previous';
          return (
            <LocalizedLink
              href={`/nos-projets/${project.slug}`}
              key={project.slug}
              className={styles['card']}
              data-position={placement}
              aria-hidden={!current}
              tabIndex={current ? 0 : -1}
              onDragStart={(event) => {
                event.preventDefault();
              }}
              onClick={(event) => {
                if (swiped.current && event.detail > 0) {
                  event.preventDefault();
                  swiped.current = false;
                  return;
                }
                if (!current && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
                  event.preventDefault();
                  select(index);
                }
              }}
            >
              {artwork ? (
                <Image
                  src={artwork}
                  alt=""
                  fill
                  sizes="(max-width: 700px) 85vw, 720px"
                  quality={90}
                  draggable={false}
                />
              ) : null}
              <div className={styles['caption']}>
                <p className={styles['creator']}>{PROJECT_CREATORS[project.creator].name}</p>
                <h3>{project.name}</h3>
                <p className={styles['tagline']}>
                  <Text>{project.tagline}</Text>
                </p>
                <span className={styles['open']}>
                  <Text>Découvrir le projet</Text>
                  <span aria-hidden="true">↗</span>
                </span>
              </div>
            </LocalizedLink>
          );
        })}
      </div>
      <div className={styles['controls']}>
        <button
          type="button"
          onClick={() => {
            select(active - 1);
          }}
          aria-label={t('Projet précédent')}
        >
          <span aria-hidden="true">←</span>
        </button>
        <div className={styles['pagination']}>
          {projects.map((project, index) => (
            <button
              type="button"
              key={project.slug}
              onClick={() => {
                select(index);
              }}
              aria-label={project.name}
              aria-pressed={index === active}
            >
              <span />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            select(active + 1);
          }}
          aria-label={t('Projet suivant')}
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {projects[active]?.name}
      </p>
    </div>
  );
}
