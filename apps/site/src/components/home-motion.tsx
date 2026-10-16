'use client';

import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './home-motion.module.css';

/** Partagé par le plateau, la porte et les interactions des cartes. */
export const StageMotionContext = createContext(false);
export const HomeMotionToggleContext = createContext<(() => void) | null>(null);

/** Le HTML reste visible sans JavaScript ; seules les sections à venir sont préparées. */
export function HomeMotion({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [userPaused, setUserPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const paused = userPaused || reducedMotion;
  const toggle = useCallback(() => {
    setUserPaused((value) => !value);
  }, []);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setReducedMotion(preference.matches);
    };
    update();
    preference.addEventListener('change', update);
    return () => {
      preference.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const targets = element.querySelectorAll<HTMLElement>('[data-reveal]');

    function reveal(target: HTMLElement, immediate = false) {
      target.dataset['revealState'] = 'visible';
      if (immediate) target.dataset['revealInstant'] = 'true';
    }

    if (
      paused ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      targets.forEach((target) => {
        reveal(target, true);
      });
      return;
    }

    // Le bas de la zone active reste à l'intérieur de l'écran : l'arrivée est visible.
    const entryInset = Math.round(Math.min(96, Math.max(32, window.innerHeight * 0.12)));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target instanceof HTMLElement) {
            reveal(entry.target);
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: `0px 0px -${entryInset}px 0px`, threshold: 0 },
    );

    for (const target of targets) {
      if (target.dataset['revealState'] === 'visible') continue;
      const bounds = target.getBoundingClientRect();
      // Une restauration de défilement ne doit jamais masquer du contenu déjà affiché.
      if (bounds.top < window.innerHeight || target.contains(document.activeElement)) {
        reveal(target, true);
        continue;
      }
      const delay = Number(target.dataset['revealDelay'] ?? 0);
      target.style.setProperty(
        '--reveal-delay',
        `${Number.isFinite(delay) ? Math.min(240, Math.max(0, delay)) : 0}ms`,
      );
      target.dataset['revealArmed'] = 'true';
      target.dataset['revealState'] = 'pending';
      observer.observe(target);
    }

    function revealFocused(event: FocusEvent) {
      if (!(event.target instanceof Element)) return;
      let target = event.target.closest<HTMLElement>('[data-reveal]');
      while (target && element?.contains(target)) {
        reveal(target, true);
        observer.unobserve(target);
        target = target.parentElement?.closest<HTMLElement>('[data-reveal]') ?? null;
      }
    }

    element.addEventListener('focusin', revealFocused);
    return () => {
      observer.disconnect();
      element.removeEventListener('focusin', revealFocused);
    };
  }, [paused]);

  return (
    <StageMotionContext value={paused}>
      <HomeMotionToggleContext value={toggle}>
        <div
          ref={root}
          className={[styles['root'], className].filter(Boolean).join(' ')}
          data-home-motion={paused ? 'static' : 'active'}
        >
          {children}
        </div>
      </HomeMotionToggleContext>
    </StageMotionContext>
  );
}
