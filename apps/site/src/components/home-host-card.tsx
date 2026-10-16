'use client';

import Image from 'next/image';
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import type { homeProfiles } from '@/domain/home-story';
import { HOME_HOST_ARTWORK } from '@/domain/home-host-artwork';
import { Text } from './localization';
import { StageMotionContext } from './home-motion';
import styles from './home-host-card.module.css';

type HomeHost = ReturnType<typeof homeProfiles>[number];
const networks = ['github', 'linkedin', 'x'] as const;
const networkNames = { github: 'GitHub', linkedin: 'LinkedIn', x: 'X' };
const accents: Record<string, string> = {
  lou: '#75e6f4',
  loic: '#f4bd73',
  nicolas: '#b9a0f5',
};
const motionProperties = ['--tilt-x', '--tilt-y', '--shine-x', '--shine-y', '--foil-x', '--foil-y'];

function HostSigil({ slug }: { slug: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      {slug === 'lou' ? (
        <>
          <path d="M10 9h12c3 0 6 14 3 15-2 1-5-4-6-4h-6c-1 0-4 5-6 4C4 23 7 9 10 9Z" />
          <path d="M9 14h6m-3-3v6" />
          <circle cx="22" cy="13" r="1" />
          <circle cx="19" cy="16" r="1" />
        </>
      ) : slug === 'loic' ? (
        <>
          <ellipse cx="16" cy="16" rx="13" ry="5" />
          <ellipse cx="16" cy="16" rx="13" ry="5" transform="rotate(60 16 16)" />
          <ellipse cx="16" cy="16" rx="13" ry="5" transform="rotate(120 16 16)" />
          <circle cx="16" cy="16" r="2" fill="currentColor" stroke="none" />
        </>
      ) : (
        <>
          <path d="M16 7v6m0 0L7 23m9-10 9 10M7 23h18" />
          <circle cx="16" cy="5" r="3" />
          <circle cx="6" cy="25" r="3" />
          <circle cx="26" cy="25" r="3" />
          <circle cx="16" cy="13" r="2" />
        </>
      )}
    </svg>
  );
}

export function HomeHostCard({ host, index }: { host: HomeHost; index: number }) {
  const paused = useContext(StageMotionContext);
  const surface = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const motionDisabled = useRef(true);

  const resetMotion = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    pointer.current = null;
    const element = surface.current;
    if (!element) return;
    for (const property of motionProperties) element.style.removeProperty(property);
    element.dataset['holoActive'] = 'false';
  }, []);

  useEffect(() => {
    const reduction = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => {
      motionDisabled.current = paused || reduction.matches || !finePointer.matches;
      if (motionDisabled.current) resetMotion();
    };
    update();
    reduction.addEventListener('change', update);
    finePointer.addEventListener('change', update);
    return () => {
      reduction.removeEventListener('change', update);
      finePointer.removeEventListener('change', update);
      resetMotion();
    };
  }, [paused, resetMotion]);

  function move(event: PointerEvent<HTMLDivElement>) {
    if (paused || motionDisabled.current || event.pointerType !== 'mouse') return;
    pointer.current = { x: event.clientX, y: event.clientY };
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const element = surface.current;
      const position = pointer.current;
      if (!element || !position || motionDisabled.current) return;
      const bounds = element.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = Math.max(0, Math.min(1, (position.x - bounds.left) / bounds.width));
      const y = Math.max(0, Math.min(1, (position.y - bounds.top) / bounds.height));
      element.style.setProperty('--tilt-x', `${((0.5 - y) * 14).toFixed(2)}deg`);
      element.style.setProperty('--tilt-y', `${((x - 0.5) * 14).toFixed(2)}deg`);
      element.style.setProperty('--shine-x', `${(x * 100).toFixed(1)}%`);
      element.style.setProperty('--shine-y', `${(y * 100).toFixed(1)}%`);
      element.style.setProperty('--foil-x', `${(20 + x * 60).toFixed(1)}%`);
      element.style.setProperty('--foil-y', `${(20 + y * 60).toFixed(1)}%`);
      element.dataset['holoActive'] = 'true';
    });
  }

  const number = String(index + 1).padStart(3, '0');
  const artwork = HOME_HOST_ARTWORK[host.slug];
  const portrait = artwork ?? host.photo;
  return (
    <article className={styles['profile']} data-host-card={host.slug}>
      <div className={styles['perspective']}>
        <div
          ref={surface}
          className={styles['card']}
          style={{ '--host-accent': accents[host.slug] ?? '#75e6f4' } as CSSProperties}
          data-holo-surface="true"
          data-holo-active="false"
          onPointerMove={move}
          onPointerLeave={resetMotion}
          onPointerCancel={resetMotion}
        >
          <div className={styles['foil']} aria-hidden="true" />
          <div className={styles['inner']}>
            <div className={styles['edition']} aria-hidden="true">
              <span>Sandbox</span>
              <span className={styles['editionStars']}>✦ ✧ ✦</span>
            </div>
            <div className={styles['portrait']}>
              {portrait ? (
                <Image
                  src={portrait}
                  alt=""
                  fill
                  quality={90}
                  sizes="(max-width: 420px) 85vw, (max-width: 900px) 350px, 360px"
                  data-host-artwork={artwork ? host.slug : undefined}
                />
              ) : (
                <span aria-hidden="true">{host.name[0]}</span>
              )}
              <div className={styles['photoCorners']} aria-hidden="true" />
            </div>
            <div className={styles['identity']}>
              <div className={styles['nameLine']}>
                <h3>{host.name}</h3>
                <span className={styles['sigil']}>
                  <HostSigil slug={host.slug} />
                </span>
              </div>
              <p className={styles['focus']}>
                <Text>{host.focus}</Text>
              </p>
            </div>
            <div className={styles['collection']} aria-hidden="true">
              <span>Talk Show</span>
              <span>
                {number} / 003 <span className={styles['diamond']}>◆</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      <details className={styles['biography']}>
        <summary>
          <span>
            <Text>Faire connaissance</Text>
            <span className="sr-only"> - {host.name}</span>
          </span>
          <span className={styles['summaryArrow']} aria-hidden="true">
            +
          </span>
        </summary>
        <div className={styles['bioContent']}>
          {host.bio.split(/\n\s*\n/).map((paragraph) => (
            <p key={paragraph}>
              <Text>{paragraph}</Text>
            </p>
          ))}
        </div>
      </details>
      <div className={styles['socials']}>
        {networks.map((network) =>
          host.socials[network] ? (
            <a key={network} href={host.socials[network]} target="_blank" rel="noopener noreferrer">
              {networkNames[network]}
              <span className="sr-only">
                {' '}
                - {host.name} <Text>(nouvel onglet)</Text>
              </span>
            </a>
          ) : null,
        )}
      </div>
    </article>
  );
}
