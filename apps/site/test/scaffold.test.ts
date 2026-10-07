import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/lib/load.ts';
import {
  newChart,
  newEntity,
  newEpisode,
  newStory,
  newTake,
  slugify,
} from '../src/lib/scaffold.ts';
import { validateContent } from '../src/lib/validate.ts';

const content = loadContent();
const now = new Date('2026-10-13T08:00:00Z');

describe('squelettes de contenu', () => {
  it('fabrique des slugs propres', () => {
    expect(slugify('Pourquoi tout le monde parle de X ?')).toBe(
      'pourquoi-tout-le-monde-parle-de-x',
    );
    expect(slugify('Éléphants & café')).toBe('elephants-cafe');
  });

  it("numérote l'épisode suivant et produit un contenu valide", () => {
    const episode = newEpisode(content.episodes, now, ['lou']);
    expect(episode.number).toBe(43);
    const check = validateContent({ ...content, episodes: [episode, ...content.episodes] });
    expect(check.filter((i) => i.level === 'error')).toEqual([]);
  });

  it('crée un article, une entité, un avis et un classement acceptés par la validation', () => {
    const story = newStory('news', 'Un titre de test', 'lou', now);
    const entity = newEntity(
      'project',
      'projet-test',
      'Projet Test',
      'https://github.com/org/projet-test',
    );
    const take = newTake({
      chart: 'github',
      week: '2026-W41',
      entity: 'claude-code',
      host: 'lou',
      text: 'Test.',
      now,
    });
    const template = content.charts[0];
    if (!template) throw new Error('fixture');
    const chart = newChart(template, 'nouveau', 'Nouveau Top 10');
    expect(entity.github?.repo).toBe('org/projet-test');
    expect(chart.methodology.changelog).toEqual([]);
    const check = validateContent({
      ...content,
      stories: [story, ...content.stories],
      entities: [entity, ...content.entities],
      takes: [take, ...content.takes],
    });
    expect(check.filter((i) => i.level === 'error')).toEqual([]);
  });

  it('refuse un avis trop long ou un lien non sécurisé', () => {
    expect(() =>
      newTake({
        chart: 'github',
        week: '2026-W41',
        entity: 'claude-code',
        host: 'lou',
        text: 'x'.repeat(400),
        now,
      }),
    ).toThrow();
    expect(() => newEntity('project', 'x', 'X', 'http://example.com')).toThrow();
  });
});

describe('validation du contenu', () => {
  it('refuse les données de démonstration en mode réel', () => {
    const check = validateContent(content, { live: true });
    expect(check.some((i) => i.level === 'error' && i.message.includes('démonstration'))).toBe(
      true,
    );
    expect(validateContent(content).filter((i) => i.level === 'error')).toEqual([]);
  });

  it('détecte une référence cassée', () => {
    const take = newTake({
      chart: 'github',
      week: '2026-W41',
      entity: 'inconnu',
      host: 'lou',
      text: 'Test.',
      now,
    });
    const check = validateContent({ ...content, takes: [take] });
    expect(check.some((i) => i.level === 'error' && i.message.includes('entité inconnue'))).toBe(
      true,
    );
  });

  it('détecte un trou dans les snapshots', () => {
    const github = content.snapshots['github'] ?? [];
    const gap = github.filter((s) => s.week !== '2026-W30');
    const check = validateContent({ ...content, snapshots: { ...content.snapshots, github: gap } });
    expect(check.some((i) => i.level === 'error' && i.message.includes('trou'))).toBe(true);
  });
});
