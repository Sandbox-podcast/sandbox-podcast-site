'use client';

import { createContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Text } from './localization';
import { stageMotion } from '@/domain/stage-motion';
import styles from './discovery-home.module.css';

export const StageMotionContext = createContext(false);

/** Le contenu reste rendu côté serveur ; seul le déplacement du décor s'hydrate. */
export function CinematicStage({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const simplified = window.matchMedia('(prefers-reduced-motion: reduce), (max-width: 1100px)');
    let frame = 0;
    function update() {
      frame = 0;
      if (!element) return;
      const enabled = !paused && !simplified.matches;
      element.dataset['motion'] = enabled ? 'active' : 'static';
      const bounds = element.getBoundingClientRect();
      const motion = stageMotion(enabled ? bounds.top : 0, bounds.height - window.innerHeight);
      element.style.setProperty('--stage-scale', String(motion.scale));
      element.style.setProperty('--stage-shift', `${motion.shift}px`);
      element.style.setProperty('--title-shift', `${motion.titleShift}px`);
      element.style.setProperty('--title-opacity', String(motion.titleOpacity));
      element.style.setProperty('--stage-inset', `${motion.inset}%`);
    }
    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    simplified.addEventListener('change', schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      simplified.removeEventListener('change', schedule);
    };
  }, [paused]);

  return (
    <section ref={root} className={styles['scene']} aria-labelledby="discovery-title">
      <div className={styles['hero']}>
        <StageMotionContext value={paused}>{children}</StageMotionContext>
        <button
          type="button"
          className={styles['motionControl']}
          aria-pressed={paused}
          onClick={() => {
            setPaused(!paused);
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            {paused ? <path d="M3 1v10l8-5z" /> : <path d="M2 1h3v10H2zm5 0h3v10H7z" />}
          </svg>
          <Text>{paused ? 'Activer les mouvements' : 'Réduire les mouvements'}</Text>
        </button>
      </div>
    </section>
  );
}
