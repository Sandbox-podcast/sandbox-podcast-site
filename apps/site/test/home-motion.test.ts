import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CinematicStage, StageMotionContext } from '../src/components/cinematic-stage';
import { HomeMotion } from '../src/components/home-motion';

describe('mouvements progressifs de l’accueil', () => {
  it.each(['title', 'collection', 'project', 'portal'])(
    'livre la révélation %s et ses liens visibles dans le HTML avant toute hydratation',
    (variant) => {
      const html = renderToStaticMarkup(
        createElement(
          HomeMotion,
          { className: 'landing', children: null },
          createElement(
            'section',
            { 'data-reveal': variant, 'data-reveal-delay': '80', 'data-reveal-side': 'left' },
            createElement('h2', null, 'Les voix de Sandbox'),
            createElement('a', { href: '/podcast' }, 'Regarder'),
          ),
        ),
      );
      expect(html).toContain('landing');
      expect(html).toContain(`data-reveal="${variant}"`);
      expect(html).toContain('data-reveal-side="left"');
      expect(html).toContain('<h2>Les voix de Sandbox</h2>');
      expect(html).toContain('<a href="/podcast">Regarder</a>');
      expect(html).not.toContain('data-reveal-state="pending"');
      expect(html).not.toContain('data-reveal-armed');
      expect(html).not.toContain('aria-hidden');
      expect(html).not.toContain('opacity');
    },
  );

  it('conserve une commande clavier dont l’état reflète la pause partagée avec la porte', () => {
    const html = renderToStaticMarkup(
      createElement(
        StageMotionContext,
        { value: true },
        createElement(CinematicStage, {
          children: createElement('h1', { id: 'discovery-title' }, 'Sandbox'),
        }),
      ),
    );
    expect(html).toContain('aria-labelledby="discovery-title"');
    expect(html).toContain('data-motion="static"');
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('Activer les mouvements');
  });
});
