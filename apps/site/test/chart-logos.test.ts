import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chartLogoOwner, chartLogoUrl, chartLogoInitials } from '../src/domain/chart-logos';
import { ChartLogo } from '../src/components/chart-logo';
import type { ChartsEntity } from '../src/domain/sandbox-charts';

function entity(overrides: Partial<ChartsEntity> = {}): ChartsEntity {
  return {
    slug: 'project',
    kind: 'project',
    name: 'Projet Test',
    tagline: 'Test',
    description: 'Test',
    category: 'Coding',
    topics: [],
    links: [],
    href: '/charts/project/project',
    ...overrides,
  };
}

describe('identité visuelle des classements', () => {
  it('utilise le propriétaire déclaré du dépôt, sans déduire une marque de son nom', () => {
    const project = entity({ name: 'Clone de Claude', github: { repo: 'some-owner/project' } });
    expect(chartLogoOwner(project)).toBe('some-owner');
    expect(chartLogoUrl(project)).toBe('https://github.com/some-owner.png?size=80');
  });
  it('retrouve le propriétaire depuis un lien GitHub de skill sans champ repo', () => {
    expect(
      chartLogoOwner(
        entity({
          kind: 'tool',
          links: [
            {
              kind: 'github',
              label: 'Source',
              url: 'https://github.com/obra/superpowers/tree/main/skills',
            },
          ],
        }),
      ),
    ).toBe('obra');
  });
  it.each([
    ['Anthropic', 'anthropics'],
    ['OpenAI', 'openai'],
    ['Google DeepMind', 'google-deepmind'],
    ['Alibaba Qwen', 'QwenLM'],
    ['Meta', 'facebook'],
    ['Ai2', 'allenai'],
    ['Mistral AI', 'mistralai'],
  ])('associe %s à son compte éditeur vérifié', (org, owner) => {
    expect(
      chartLogoOwner(entity({ kind: 'model', org, github: { repo: 'unrelated/project' } })),
    ).toBe(owner);
  });
  it('ne transforme pas un nom de modèle ou un éditeur inconnu en logo supposé', () => {
    expect(
      chartLogoUrl(entity({ kind: 'model', name: 'OpenAI Compatible', org: 'Autre éditeur' })),
    ).toBeNull();
    expect(chartLogoUrl(entity({ kind: 'model', name: 'Claude' }))).toBeNull();
  });
  it('ignore les propriétés héritées dans les noms des éditeurs', () => {
    expect(chartLogoUrl(entity({ kind: 'model', org: '__proto__' }))).toBeNull();
    expect(chartLogoUrl(entity({ kind: 'model', org: 'constructor' }))).toBeNull();
  });
  it.each([
    'https://github.com.evil.test/openai/repo',
    'https://github.com@evil.test/openai/repo',
    'http://github.com/openai/repo',
    'https://user:password@github.com/openai/repo',
    'https://github.com:444/openai/repo',
    'https://github.com/openai',
  ])('refuse un lien non exploitable : %s', (url) => {
    expect(chartLogoUrl(entity({ links: [{ kind: 'github', label: 'Source', url }] }))).toBeNull();
  });
  it('refuse les chemins ou paramètres injectés dans le propriétaire', () => {
    expect(chartLogoUrl(entity({ github: { repo: '../avatar?secret=1' } }))).toBeNull();
    expect(chartLogoUrl(entity({ github: { repo: 'owner?secret=1/repo' } }))).toBeNull();
  });
  it('affiche des initiales décoratives lorsque le logo est inconnu', () => {
    const html = renderToStaticMarkup(createElement(ChartLogo, { entity: entity() }));
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('PT');
    expect(html).not.toContain('<img');
  });
  it('conserve des initiales lisibles pour les noms courts et composés', () => {
    expect(chartLogoInitials('llama.cpp')).toBe('LC');
    expect(chartLogoInitials('OpenAI')).toBe('OP');
    expect(chartLogoInitials('  Projet test  ')).toBe('PT');
    expect(chartLogoInitials('')).toBe('?');
  });
});
