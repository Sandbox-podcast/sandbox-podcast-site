'use client';

import { useContext, useEffect, useRef, type ReactNode } from 'react';
import { StageMotionContext, HomeMotionToggleContext } from './home-motion';
import { Text } from './localization';
import { studioScrollState } from '@/domain/studio-scroll';
import styles from './studio-landing.module.css';

export function StudioScroll({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const paused = useContext(StageMotionContext);
  const toggle = useContext(HomeMotionToggleContext);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const preference = window.matchMedia(
      '(min-width: 901px) and (min-height: 600px) and (prefers-reduced-motion: no-preference) and (scripting: enabled)',
    );
    const front = element.querySelector<HTMLElement>('[data-studio-front]');
    const copy = element.querySelector<HTMLElement>('[data-studio-copy]');
    const wall = element.querySelector<HTMLElement>('[data-studio-wall]');
    let frame = 0;
    let start = 0;
    let distance = 1;
    function update() {
      frame = 0;
      if (!element) return;
      const active = preference.matches && !paused;
      element.dataset['scrollStudio'] = active ? 'active' : 'static';
      if (!active) {
        element.removeAttribute('style');
        element.dataset['studioPhase'] = 'static';
        for (const group of [front, copy, wall]) if (group) group.inert = false;
        return;
      }
      const state = studioScrollState((window.scrollY - start) / distance);
      for (const [key, value] of Object.entries(state)) {
        if (typeof value === 'number') element.style.setProperty(`--studio-${key}`, String(value));
      }
      element.dataset['studioPhase'] = state.phase;
      if (front) front.inert = state.turn > 0.45;
      if (copy) copy.inert = state.copy < 0.05;
      if (wall) wall.inert = state.wall < 0.95;
    }
    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }
    function measure() {
      if (!element) return;
      element.dataset['scrollStudio'] = preference.matches && !paused ? 'active' : 'static';
      start = element.getBoundingClientRect().top + window.scrollY;
      distance = Math.max(1, element.offsetHeight - window.innerHeight);
      schedule();
    }
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    preference.addEventListener('change', measure);
    return () => {
      window.cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', measure);
      preference.removeEventListener('change', measure);
      for (const group of [front, copy, wall]) if (group) group.inert = false;
    };
  }, [paused]);

  return (
    <section
      ref={root}
      className={styles['journey']}
      aria-labelledby="discovery-title"
      data-scroll-studio="active"
    >
      <span id="studio-lights" className={styles['lightsAnchor']} aria-hidden="true" />
      <span id="studio-replays" className={styles['replaysAnchor']} aria-hidden="true" />
      <div className={styles['viewport']}>
        {children}
        <div className={styles['journeyControls']}>
          <a href="#home-story">
            <Text>Rencontrer l'équipe</Text>
          </a>
          {toggle ? (
            <button type="button" aria-pressed={paused} onClick={toggle}>
              <Text>{paused ? 'Activer les mouvements' : 'Réduire les mouvements'}</Text>
            </button>
          ) : null}
        </div>
        <div className={styles['progress']} aria-hidden="true">
          <span />
        </div>
      </div>
    </section>
  );
}
