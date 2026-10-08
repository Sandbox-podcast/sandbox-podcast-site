'use client';
import { Text, LocalizedElement } from '@/components/localization';
import { useEffect, useRef, useState, type ReactNode } from 'react';
export function EpisodeRail({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ overflow: false, previous: false, next: false });
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const update = (): void => {
      const end = element.scrollWidth - element.clientWidth;
      setPosition({
        overflow: end > 2,
        previous: element.scrollLeft > 2,
        next: element.scrollLeft < end - 2,
      });
    };
    update();
    element.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      element.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [children]);
  function move(direction: number): void {
    const element = rail.current;
    if (!element) return;
    element.scrollBy({
      left: direction * element.clientWidth * 0.8,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }
  return (
    <div className="episode-rail-shell">
      <Text>
        {position.overflow ? (
          <LocalizedElement
            as="div"
            className="rail-controls"
            role="group"
            aria-label={`Parcourir ${label}`}
          >
            <LocalizedElement
              as="button"
              type="button"
              className="rail-control"
              aria-label={`Épisodes précédents : ${label}`}
              aria-controls={id}
              disabled={!position.previous}
              onClick={() => {
                move(-1);
              }}
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m14 6-6 6 6 6" />
              </svg>
            </LocalizedElement>
            <LocalizedElement
              as="button"
              type="button"
              className="rail-control"
              aria-label={`Épisodes suivants : ${label}`}
              aria-controls={id}
              disabled={!position.next}
              onClick={() => {
                move(1);
              }}
            >
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m10 6 6 6-6 6" />
              </svg>
            </LocalizedElement>
          </LocalizedElement>
        ) : null}
      </Text>
      <LocalizedElement
        as="div"
        className="episode-rail"
        id={id}
        ref={rail}
        role="group"
        aria-label={label}
        tabIndex={0}
      >
        <Text>{children}</Text>
      </LocalizedElement>
    </div>
  );
}
