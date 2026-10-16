import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HistoryArtwork } from '../src/components/history-artwork.tsx';
import {
  HISTORY_ARTWORK_GROUPS,
  historyArtworkPath,
  historyArtworkSubject,
} from '../src/domain/time-machine-artwork.ts';
import { timeMachineData } from '../src/lib/time-machine.ts';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const events = timeMachineData().events;
const readArtwork = (path: string) => readFileSync(resolve('public', path.slice(1)), 'utf8');

describe('affiches distinctes de la Time Machine', () => {
  it('attribue un fichier et une composition graphique propres à chacun des 151 événements', () => {
    const ids = Object.values(HISTORY_ARTWORK_GROUPS).flat();
    expect(new Set(ids)).toEqual(new Set(events.map((event) => event.id)));
    const paths = events.map(historyArtworkPath);
    expect(new Set(paths).size).toBe(events.length);
    const geometry = [];
    let totalBytes = 0;
    for (const event of events) {
      const path = resolve('public', historyArtworkPath(event).slice(1));
      expect(existsSync(path), event.id).toBe(true);
      expect(statSync(path).size, event.id).toBeGreaterThan(1_000);
      expect(statSync(path).size, event.id).toBeLessThan(100_000);
      totalBytes += statSync(path).size;
      const svg = readFileSync(path, 'utf8');
      const drawing = /<g id="concept"[^>]*>([\s\S]*?)<\/g>/.exec(svg)?.[1];
      expect(drawing, event.id).toBeTruthy();
      geometry.push(digest((drawing ?? '').replace(/<text\b[\s\S]*?<\/text>/g, '')));
    }
    expect(new Set(geometry).size).toBe(events.length);
    expect(totalBytes).toBeLessThan(3_000_000);
  });

  it('sert uniquement des SVG locaux inertes sans script, police distante ou ressource externe', () => {
    for (const event of events) {
      const svg = readArtwork(historyArtworkPath(event));
      expect(svg).toContain('viewBox="0 0 1000 1000"');
      expect(svg).not.toMatch(
        /<(?:script|foreignObject|iframe|image|style)\b|\son[a-z]+\s*=|(?:href|src)\s*=|url\(|<!DOCTYPE|<!ENTITY/i,
      );
      expect(svg).toContain('Affiche de concept éditoriale');
    }
  });

  it('préserve une taxonomie scientifique distincte sans réutiliser les mêmes images', () => {
    const subject = (id: string) => {
      const event = events.find((entry) => entry.id === id);
      if (!event) throw new Error('Événement absent : ' + id);
      return historyArtworkSubject(event);
    };
    expect(subject('deep-blue-match')).toBe('chess');
    expect(subject('alphago-lee-sedol')).toBe('go');
    expect(subject('alphafold-3')).toBe('biology');
    expect(subject('plasma-control')).toBe('fusion');
    expect(subject('gnome')).toBe('materials');
    expect(subject('graphcast')).toBe('climate');
    expect(subject('dqn-atari')).toBe('arcade');
    expect(subject('ai-act-effective')).toBe('governance');
  });

  it('garde une image décorative différée et charge immédiatement le visuel principal', () => {
    const event = events[0];
    if (!event) throw new Error('Corpus vide');
    const html = renderToStaticMarkup(createElement(HistoryArtwork, { event }));
    expect(html).toContain('alt=""');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('data-history-artwork="chess"');
    expect(html).toContain('/images/time-machine/events/deep-blue-first-game.svg');
    expect(html).not.toContain('/_next/image');
    const featured = renderToStaticMarkup(createElement(HistoryArtwork, { event, featured: true }));
    expect(featured).toContain('loading="eager"');
    expect(historyArtworkPath({ ...event, id: 'future-model', category: 'model' })).toBe(
      '/images/time-machine/events/future-model.svg',
    );
  });

  it('reproduit exactement les affiches et le manifeste depuis les sources locales versionnées', () => {
    expect(() =>
      execFileSync(process.execPath, ['scripts/generate-time-machine-artwork.mjs', '--check'], {
        cwd: resolve('.'),
        encoding: 'utf8',
      }),
    ).not.toThrow();
  });
});
