'use client';

import { useEffect, useRef } from 'react';
import styles from './temporal-starfield.module.css';

interface Star {
  x: number;
  y: number;
  depth: number;
  warm: boolean;
}

/** Un mouvement bref à chaque date, puis une image fixe : aucun rendu continu au repos. */
export function TemporalStarfield({ position, paused }: { position: number; paused: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const navigate = useRef<(direction: number) => void>(() => undefined);
  const previous = useRef(position);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let frame = 0;
    let started = 0;
    let travelled = 0;
    let last = 0;
    let direction = 1;
    let visible = true;
    let disposed = false;

    const paint = (speed = 0, delta = 0) => {
      context.clearRect(0, 0, width, height);
      for (const star of stars) {
        const before = star.depth;
        star.depth -= speed * delta * direction;
        if (star.depth < 0.2) star.depth = 1.4;
        if (star.depth > 1.4) star.depth = 0.2;
        const x = width / 2 + (star.x * width) / star.depth;
        const y = height * 0.42 + (star.y * height) / star.depth;
        const opacity = Math.min(0.58, 0.1 + (1.4 - star.depth) * 0.3);
        context.strokeStyle = star.warm
          ? `rgba(238,182,114,${opacity})`
          : `rgba(157,218,247,${opacity})`;
        context.fillStyle = context.strokeStyle;
        context.lineWidth = star.depth < 0.6 ? 1.4 : 0.8;
        if (speed > 0.06 && Math.abs(before - star.depth) < 0.5) {
          const tail = star.depth + speed * 0.045 * direction;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(
            width / 2 + (star.x * width) / tail,
            height * 0.42 + (star.y * height) / tail,
          );
          context.stroke();
        } else {
          context.beginPath();
          context.arc(x, y, star.depth < 0.6 ? 1.3 : 0.75, 0, Math.PI * 2);
          context.fill();
        }
      }
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      paint();
    };
    const animate = (now: number) => {
      const progress = Math.min(1, (now - travelled) / 1100);
      const delta = Math.min((now - last) / 1000, 0.04);
      last = now;
      // Accélération douce et décélération plus longue, sans flash ni zoom du texte.
      const envelope = Math.min(1, (now - started) / 180) * Math.pow(1 - progress, 2);
      paint(envelope * 0.8, delta);
      if (progress < 1 && visible && !document.hidden && !disposed) {
        frame = requestAnimationFrame(animate);
      } else {
        stop();
      }
    };
    const resize = () => {
      const bounds = element.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      // Positions déterministes : pas de scintillement à chaque redimensionnement.
      stars = Array.from({ length: width < 700 ? 60 : 120 }, (_, index) => ({
        x: (((index * 73 + 19) % 257) / 257 - 0.5) * 1.7,
        y: (((index * 109 + 43) % 263) / 263 - 0.5) * 1.7,
        depth: 0.25 + ((index * 31) % 113) / 100,
        warm: index % 9 === 0,
      }));
      paint();
    };
    navigate.current = (nextDirection) => {
      if (paused || reducedMotion.matches || document.hidden || !visible) return;
      direction = nextDirection;
      travelled = performance.now();
      // Un glissement prolongé entretient la vitesse au lieu de recommencer l'accélération.
      if (frame) return;
      started = travelled;
      last = started;
      frame = requestAnimationFrame(animate);
    };
    const visibilityChanged = () => {
      if (document.hidden) stop();
    };
    const preferenceChanged = () => {
      if (reducedMotion.matches) stop();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      if (!visible) stop();
    });
    intersection.observe(element);
    document.addEventListener('visibilitychange', visibilityChanged);
    reducedMotion.addEventListener('change', preferenceChanged);
    resize();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', visibilityChanged);
      reducedMotion.removeEventListener('change', preferenceChanged);
      navigate.current = () => undefined;
    };
  }, [paused]);

  useEffect(() => {
    const difference = position - previous.current;
    previous.current = position;
    if (difference !== 0) navigate.current(Math.sign(difference));
  }, [position]);

  return (
    <canvas
      ref={canvas}
      className={styles['field']}
      aria-hidden="true"
      data-temporal-starfield=""
    />
  );
}
