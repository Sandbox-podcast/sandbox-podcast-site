'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import {
  homeSignalContact,
  homeSignalLayoutPoint,
  homeSignalProgress,
  homeSignalSegments,
  type SignalSegment,
} from '@/domain/home-signal';
import { StageMotionContext } from './home-motion';
import styles from './home-signal.module.css';

function layoutPoint(element: HTMLElement) {
  return homeSignalLayoutPoint(element, (node) => ({
    x: node.offsetLeft,
    y: node.offsetTop,
    borderX: node.clientLeft,
    borderY: node.clientTop,
    parent: node.offsetParent instanceof HTMLElement ? node.offsetParent : null,
  }));
}

/** Un câble de régie décoratif relie les chapitres sans agir sur le défilement. */
export function HomeSignal() {
  const paused = useContext(StageMotionContext);
  const root = useRef<HTMLDivElement>(null);
  const layers = useRef<(SVGSVGElement | null)[]>([]);
  const geometry = useRef({ segments: [] as SignalSegment[], pageTop: 0 });
  const repaint = useRef<(() => void) | null>(null);
  const [drawing, setDrawing] = useState({ segments: [] as SignalSegment[], width: 0 });

  useEffect(() => {
    const element = root.current;
    const page = element?.closest<HTMLElement>('[data-home-motion]');
    if (!element || !page) return;
    const scene = page.querySelector<HTMLElement>('[aria-labelledby="discovery-title"]');
    if (!scene) return;
    const contacts = [...page.querySelectorAll<HTMLElement>('[data-signal-contact]')];
    const reduction = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let measurementFrame = 0;
    let visible = true;
    const painted = new WeakMap<SVGSVGElement, string>();

    function paint() {
      frame = 0;
      if (!visible || document.hidden || paused || reduction.matches) return;
      const readingLine = window.scrollY + window.innerHeight * 0.72 - geometry.current.pageTop;
      geometry.current.segments.forEach((segment, index) => {
        const layer = layers.current[index];
        if (!layer) return;
        const progress = homeSignalProgress(segment, readingLine);
        const value = progress.toFixed(4);
        const head = progress > 0 && progress < 1 ? '1' : '0';
        const state = `${value}:${head}`;
        if (painted.get(layer) === state) return;
        painted.set(layer, state);
        layer.style.setProperty('--signal-progress', value);
        layer.style.setProperty('--signal-head', head);
      });
    }

    function schedule() {
      if (!frame && visible && !document.hidden && !paused && !reduction.matches) {
        frame = window.requestAnimationFrame(paint);
      }
    }

    function measure() {
      measurementFrame = 0;
      if (!page || !scene || document.hidden) return;
      const width = page.clientWidth;
      if (width <= 0) return;
      const pagePosition = layoutPoint(page);
      const pageOrigin = {
        x: pagePosition.x + page.clientLeft,
        y: pagePosition.y + page.clientTop,
      };
      const startY = layoutPoint(scene).y - pageOrigin.y + scene.offsetHeight;
      const anchors = contacts.map((contact) => {
        const point = layoutPoint(contact);
        return homeSignalContact(
          { x: point.x - pageOrigin.x, y: point.y - pageOrigin.y },
          contact.offsetHeight,
          window.innerWidth,
        );
      });
      const last = anchors.at(-1);
      if (last) anchors.push({ x: last.x, y: page.clientHeight - 52 });
      const segments = homeSignalSegments({ x: width / 2, y: startY }, anchors);
      geometry.current = { segments, pageTop: pageOrigin.y };
      setDrawing((current) =>
        current.width === width &&
        current.segments.length === segments.length &&
        current.segments.every((segment, index) => {
          const next = segments[index];
          return (
            segment.top === next?.top &&
            segment.height === next.height &&
            segment.path === next.path
          );
        })
          ? current
          : { segments, width },
      );
      schedule();
    }

    function scheduleMeasure() {
      if (!measurementFrame && !document.hidden) {
        measurementFrame = window.requestAnimationFrame(measure);
      }
    }

    function stopFrames() {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(measurementFrame);
      frame = 0;
      measurementFrame = 0;
    }

    function visibilityChange() {
      if (document.hidden) stopFrames();
      else scheduleMeasure();
    }

    const resize = 'ResizeObserver' in window ? new ResizeObserver(scheduleMeasure) : null;
    const observed = new Set<HTMLElement>([page, scene, ...contacts]);
    for (const contact of contacts) {
      const section = contact.closest<HTMLElement>('[data-home-section]');
      if (section) observed.add(section);
    }
    observed.forEach((target) => {
      resize?.observe(target);
    });
    const intersection =
      'IntersectionObserver' in window
        ? new IntersectionObserver((entries) => {
            visible = entries.some((entry) => entry.isIntersecting);
            if (visible) schedule();
            else {
              window.cancelAnimationFrame(frame);
              frame = 0;
            }
          })
        : null;
    intersection?.observe(page);
    repaint.current = schedule;
    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', scheduleMeasure);
    page.addEventListener('toggle', scheduleMeasure, true);
    page.addEventListener('load', scheduleMeasure, true);
    document.fonts.addEventListener('loadingdone', scheduleMeasure);
    document.addEventListener('visibilitychange', visibilityChange);
    reduction.addEventListener('change', schedule);
    return () => {
      stopFrames();
      repaint.current = null;
      resize?.disconnect();
      intersection?.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', scheduleMeasure);
      page.removeEventListener('toggle', scheduleMeasure, true);
      page.removeEventListener('load', scheduleMeasure, true);
      document.fonts.removeEventListener('loadingdone', scheduleMeasure);
      document.removeEventListener('visibilitychange', visibilityChange);
      reduction.removeEventListener('change', schedule);
    };
  }, [paused]);

  // Les nouvelles couches SVG reçoivent la progression après leur insertion par React.
  useEffect(() => {
    repaint.current?.();
  }, [drawing]);

  return (
    <div ref={root} className={styles['signal']} aria-hidden="true" data-home-signal>
      {drawing.segments.map((segment, index) => (
        <svg
          key={index}
          ref={(element) => {
            layers.current[index] = element;
          }}
          className={styles['segment']}
          style={{ top: segment.top, height: segment.height }}
          viewBox={`0 0 ${drawing.width} ${segment.height}`}
          preserveAspectRatio="none"
          focusable="false"
        >
          <path className={styles['cable']} d={segment.path} pathLength="1" />
          <path className={styles['halo']} d={segment.path} pathLength="1" />
          <path className={styles['current']} d={segment.path} pathLength="1" />
          <path className={styles['head']} d={segment.path} pathLength="1" />
        </svg>
      ))}
    </div>
  );
}
