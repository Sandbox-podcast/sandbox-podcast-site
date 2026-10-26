import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scenes, talkScenes, radarScenes, sceneIndex } from '../public/slides/episode-004/model.js';
import { listSlideDecks, slidesPublicRoot } from '../src/domain/slide-decks';

const root = resolve(process.cwd(), 'public/slides/episode-004');

describe("Le Talk de l'épisode 004", () => {
  it('tient dans cinq slides de la même séquence, écran de sujet compris', () => {
    expect(talkScenes).toHaveLength(5);
    expect(new Set(scenes.map((slide) => slide.id)).size).toBe(8);
    expect(talkScenes.every((slide) => slide.chapter === 'Talk')).toBe(true);
    expect(talkScenes.map((slide) => slide.kind)).toEqual([
      'opening',
      'prototype',
      'handoff',
      'tickets',
      'debate',
    ]);
  });

  it('permet de retrouver chaque étape par son ancre ou son numéro', () => {
    for (const [index, slide] of scenes.entries()) {
      expect(sceneIndex(`#${slide.id}`)).toBe(index);
      expect(sceneIndex(`#${index + 1}`)).toBe(index);
    }
    for (const hash of ['', '#0', '#9', '#inconnu', '#1.5', '#-1']) {
      expect(sceneIndex(hash)).toBe(0);
    }
  });

  it('conserve les preuves et les limites dans les notes de chaque étape', () => {
    for (const slide of scenes) {
      expect(slide.notes.length).toBeGreaterThanOrEqual(3);
      expect(slide.sources.length).toBeGreaterThanOrEqual(1);
      for (const source of slide.sources) {
        expect(new URL(source.url).protocol).toBe('https:');
        expect(source.title.length).toBeGreaterThan(10);
      }
    }
    expect(talkScenes[3]?.notes.join(' ')).toContain('partie maintenance');
    expect(talkScenes[3]?.notes.join(' ')).toContain('accès anticipé fermé');
    expect(talkScenes[4]?.notes.join(' ')).toContain('ne démontrent pas la disparition générale');
    expect(talkScenes[2]?.notes.join(' ')).toContain('préversion privée');
    expect(talkScenes[2]?.notes.join(' ')).toContain('guides utilisateurs');
  });

  it('place trois slides Radar avant le Talk et conserve les chiffres avec leur attribution', () => {
    expect(radarScenes).toHaveLength(3);
    expect(scenes.slice(0, 3)).toEqual(radarScenes);
    expect(scenes.slice(3)).toEqual(talkScenes);
    expect(sceneIndex('#radar')).toBe(0);
    expect(sceneIndex('#talk')).toBe(3);
    const notes = radarScenes.flatMap((slide) => slide.notes).join(' ');
    for (const detail of [
      '94 %',
      '6 %',
      '44 %',
      '48 %',
      'plus de sept',
      'moitié',
      '80 sources',
      'Codex',
      'privé',
      'fermé',
    ]) {
      expect(notes).toContain(detail);
    }
    expect(notes).toContain('questions différentes');
    expect(notes).toContain('pas des gains garantis');
    expect(radarScenes.every((slide) => slide.sources[0]?.url.includes('atlassian.com'))).toBe(
      true,
    );
  });

  it('garde les ressources locales et la CSP restrictive', () => {
    const html = readFileSync(resolve(root, 'index.html'), 'utf8');
    expect(html).toContain("script-src 'self'");
    expect(html).toContain("connect-src 'none'");
    expect(html).not.toContain('unsafe-inline');
    expect(html).not.toContain('<script>');
    for (const asset of [
      'show.css',
      'show.js',
      'model.js',
      '../episode-003/show.css',
      '../episode-003/assets/talk-lobby-v1.webp',
      '../episode-002-bis/assets/logo.png',
      '../episode-002-bis/assets/archivo.woff2',
    ]) {
      expect(existsSync(resolve(root, asset)), asset).toBe(true);
    }
  });

  it("rend le nouveau support accessible depuis l'index des épisodes", () => {
    const decks = listSlideDecks(slidesPublicRoot(process.cwd()));
    expect(decks.find((deck) => deck.slug === 'episode-004')?.title).toBe('SANDBOX | Épisode 004');
    const index = readFileSync(resolve(root, '../index.html'), 'utf8');
    expect(index).toContain('./episode-004/index.html');
  });
});
