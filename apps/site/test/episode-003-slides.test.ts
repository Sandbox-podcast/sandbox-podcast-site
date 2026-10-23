import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scenes, sceneIndex } from '../public/slides/episode-003/model.js';

const root = resolve(process.cwd(), 'public/slides/episode-003');

describe('support de l’épisode 003', () => {
  it('contient quatre lobbies et six slides de contenu, dans l’ordre prévu', () => {
    expect(scenes.map(({ id, chapter, kind }) => ({ id, chapter, kind }))).toEqual([
      { id: 'intro', chapter: 'Introduction', kind: 'lobby' },
      { id: 'radar', chapter: 'Radar', kind: 'lobby' },
      { id: 'copilot-studio-frontier', chapter: 'Radar', kind: 'radar-story' },
      { id: 'anthropic-employment', chapter: 'Radar', kind: 'radar-story' },
      { id: 'voxtral-3', chapter: 'Radar', kind: 'radar-story' },
      { id: 'talk', chapter: 'Talk', kind: 'lobby' },
      { id: 'talk-case', chapter: 'Talk', kind: 'talk-case' },
      { id: 'talk-interfaces', chapter: 'Talk', kind: 'talk-trend' },
      { id: 'clash', chapter: 'Clash', kind: 'lobby' },
      { id: 'clash-question', chapter: 'Clash', kind: 'clash-question' },
    ]);
    expect(scenes.filter(({ kind }) => kind === 'lobby').map(({ sequence }) => sequence)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(new Set(scenes.map(({ id }) => id)).size).toBe(scenes.length);
    for (const slide of scenes) {
      const imagePath = resolve(root, slide.illustration.replace(/^\.\//, ''));
      expect(existsSync(imagePath), slide.illustration).toBe(true);
      const image = readFileSync(imagePath);
      expect(image.subarray(0, 4).toString()).toBe('RIFF');
      expect(image.subarray(8, 12).toString()).toBe('WEBP');
    }
  });

  it('reprend le cas d’usage du Talk et la question du Clash', () => {
    expect(scenes.find(({ id }) => id === 'talk-case')).toMatchObject({
      title: 'J’ai intégré l’ensemble de notre catalogue produits dans un agent.',
      question: 'Qu’est-ce que ça permet aux équipes ?',
    });
    expect(scenes.find(({ id }) => id === 'clash-question')?.title).toBe(
      'En entreprise, peut-on vraiment mettre en production un produit développé en vibe coding ?',
    );
  });

  it('ajoute une actualité Microsoft sourcée et distingue le déploiement des annonces à venir', () => {
    const slide = scenes.find(({ id }) => id === 'copilot-studio-frontier');
    expect(slide?.chapter).toBe('Radar');
    expect(slide?.points).toHaveLength(3);
    expect(slide?.availability).toContain('expérimentales');
    expect(slide?.upcoming).toContain('À venir');
    expect(slide?.sources).toHaveLength(2);
    for (const source of slide?.sources ?? []) {
      expect(new URL(source.url).hostname).toBe('www.microsoft.com');
    }
    expect(existsSync(resolve(root, slide?.sourceImage ?? 'absent'))).toBe(true);
    expect(sceneIndex('#copilot-studio-frontier')).toBe(2);
  });

  it('ne charge aucun des anciens sujets ou contenus de préparation', () => {
    const script = readFileSync(resolve(root, 'show.js'), 'utf8');
    const html = readFileSync(resolve(root, 'index.html'), 'utf8');
    const model = readFileSync(resolve(root, 'model.js'), 'utf8');
    for (const obsoleteDataFile of ['content.json', 'shorts.json', 'rundown.json']) {
      expect(script).not.toContain(obsoleteDataFile);
      expect(html).not.toContain(obsoleteDataFile);
      expect(model).not.toContain(obsoleteDataFile);
    }
    // Les anciens jeux de données sont exclus, pas les URL de sources contenant /news/.
    expect(model).not.toMatch(/\b(?:news|skills|debates|shorts)\s*[:=]/);
    expect(html).not.toContain('notes-toggle');
    expect(html).not.toContain('Exporter nos choix');
    expect(html).not.toContain('Notre choix');
  });

  it('conserve Voxtral 3 avec son schéma, ses légendes et sa question après Anthropic', () => {
    const slide = scenes.find(({ id }) => id === 'voxtral-3');
    expect(sceneIndex('#voxtral-3')).toBe(4);
    expect(slide?.figureCaption).toContain('SDK Voice Agents');
    expect(slide?.figureAside).toContain('préversion publique');
    expect(slide?.question).toContain('quelles tâches vocales');
    expect(slide?.sources).toHaveLength(2);
    expect(existsSync(resolve(root, slide?.sourceImage ?? 'absent'))).toBe(true);
  });

  it('rattache le plan de Nico et ses précautions au sujet Anthropic dans le Radar', () => {
    const slide = scenes.find(({ id }) => id === 'anthropic-employment');
    expect(slide?.title).toBe('Comment l’IA transforme Anthropic');
    expect(slide?.chapter).toBe('Radar');
    expect(slide?.points?.map(([figure]) => figure)).toEqual(['6 ×', '> ½ semaine', '27 % → 9 %']);
    expect(slide?.sources?.[0]?.url).toBe(
      'https://www.anthropic.com/research/employment-at-anthropic',
    );
    expect(slide?.notes).toHaveLength(6);
    const notes = slide?.notes?.map(({ text }) => text).join(' ');
    for (const qualification of [
      '40 heures',
      'sans équivalence de travail utile',
      'pas un temps observé',
      'pas des licenciements',
      'pas randomisée',
    ]) {
      expect(notes).toContain(qualification);
    }
    expect(sceneIndex('#anthropic-employment')).toBe(3);
  });

  it('garde les quatre accès de séquence et les commandes de présentation', () => {
    const html = readFileSync(resolve(root, 'index.html'), 'utf8');
    const script = readFileSync(resolve(root, 'show.js'), 'utf8');
    for (const id of ['intro', 'radar', 'talk', 'clash']) {
      expect(html).toContain(`href="#${id}"`);
    }
    for (const control of ['previous', 'next', 'topics', 'present', 'fullscreen', 'leave-live']) {
      expect(html).toContain(`id="${control}"`);
    }
    expect(script).toContain("event.key.toLowerCase() === 'f'");
    expect(script).toContain("event.key.toLowerCase() === 'p'");
    expect(script).toContain("'ArrowRight', 'PageDown', ' '");
    expect(html).toContain("script-src 'self'");
    expect(html).toContain("object-src 'none'");
  });

  it('résout les ancres des dix écrans et revient à l’introduction si elle est inconnue', () => {
    expect(sceneIndex('#intro')).toBe(0);
    expect(sceneIndex('#radar')).toBe(1);
    expect(sceneIndex('#talk-case')).toBe(6);
    expect(sceneIndex('#clash-question')).toBe(9);
    expect(sceneIndex('#6')).toBe(5);
    expect(sceneIndex('#sujet-retiré')).toBe(0);
  });

  it('adapte les lobbies et les questions aux fenêtres étroites', () => {
    const css = readFileSync(resolve(root, 'show.css'), 'utf8');
    expect(css).toContain('min-height: 100dvh');
    expect(css).toContain('.slide-illustration');
    expect(css).toContain('.clash-copy');
    expect(css).toContain('@media (max-width: 780px)');
    expect(css).toContain('@media (max-width: 480px)');
  });
});
