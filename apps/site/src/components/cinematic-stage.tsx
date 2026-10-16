'use client';

import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Text } from './localization';
import { HomeMotionToggleContext, StageMotionContext } from './home-motion';
import { stagePointerMotion } from '@/domain/stage-motion';
import styles from './discovery-home.module.css';

export { StageMotionContext } from './home-motion';

/** La profondeur suit le pointeur ; le défilement et la géométrie de la page restent natifs. */
export function CinematicStage({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const inheritedPause = useContext(StageMotionContext);
  const toggleMotion = useContext(HomeMotionToggleContext);
  const [localPause, setLocalPause] = useState(false);
  const paused = inheritedPause || localPause;

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const artwork = element.querySelector<HTMLElement>('[data-depth-stage]');
    if (!artwork) return;
    const interactive = window.matchMedia(
      '(hover: hover) and (pointer: fine) and (min-width: 1101px) and (prefers-reduced-motion: no-preference)',
    );
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    let visible = true;

    function reset() {
      window.cancelAnimationFrame(frame);
      frame = 0;
      pointer = null;
      artwork?.style.removeProperty('--depth-x');
      artwork?.style.removeProperty('--depth-y');
      if (artwork) artwork.dataset['depthActive'] = 'false';
    }

    function update() {
      frame = 0;
      if (!element || !artwork || !pointer || paused || !interactive.matches || !visible) return;
      const bounds = element.getBoundingClientRect();
      const motion = stagePointerMotion(
        pointer.x - bounds.left,
        pointer.y - bounds.top,
        bounds.width,
        bounds.height,
      );
      artwork.style.setProperty('--depth-x', `${motion.x.toFixed(2)}px`);
      artwork.style.setProperty('--depth-y', `${motion.y.toFixed(2)}px`);
      artwork.dataset['depthActive'] = 'true';
    }

    function move(event: PointerEvent) {
      if (paused || !interactive.matches || !visible || event.pointerType !== 'mouse') return;
      pointer = { x: event.clientX, y: event.clientY };
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    function visibilityChange() {
      if (document.hidden) reset();
    }

    const observer =
      'IntersectionObserver' in window
        ? new IntersectionObserver((entries) => {
            visible = entries.some((entry) => entry.isIntersecting);
            if (!visible) reset();
          })
        : null;
    observer?.observe(element);
    element.addEventListener('pointermove', move, { passive: true });
    element.addEventListener('pointerleave', reset);
    element.addEventListener('pointercancel', reset);
    element.addEventListener('focusin', reset);
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', visibilityChange);
    interactive.addEventListener('change', reset);
    return () => {
      reset();
      observer?.disconnect();
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerleave', reset);
      element.removeEventListener('pointercancel', reset);
      element.removeEventListener('focusin', reset);
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', visibilityChange);
      interactive.removeEventListener('change', reset);
    };
  }, [paused]);

  return (
    <section
      ref={root}
      className={styles['scene']}
      aria-labelledby="discovery-title"
      data-motion={paused ? 'static' : 'active'}
    >
      <div className={styles['hero']}>
        <StageMotionContext value={paused}>{children}</StageMotionContext>
        <button
          type="button"
          className={styles['motionControl']}
          aria-pressed={paused}
          onClick={() => {
            if (toggleMotion) toggleMotion();
            else setLocalPause((value) => !value);
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
