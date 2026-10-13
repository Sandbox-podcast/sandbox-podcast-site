import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EpisodeDescription } from '../src/components/episode-description';
import { EpisodeComposer } from '../src/components/episode-composer';
import { LocalizationProvider } from '../src/components/localization';
import { episodeSchema } from '../src/domain/schema';
import { loadContent } from '../src/lib/load';

describe('description Markdown d’un épisode', () => {
  it('rend les paragraphes, listes, liens YouTube et styles dans la fiche', () => {
    const html = renderToStaticMarkup(
      createElement(EpisodeDescription, {
        markdown:
          'Une **séquence** à voir.\nRetour à la ligne.\n\n## Sources\n- [Documentation](https://example.org/docs)\n- https://example.org/video',
      }),
    );

    expect(html).toContain('<strong>séquence</strong>');
    expect(html).toContain('Retour à la ligne.');
    expect(html).toContain('<h3>Sources</h3>');
    expect(html).toContain('<ul>');
    expect(html).toContain('href="https://example.org/docs"');
    expect(html).toContain('href="https://example.org/video"');
  });

  it('ignore le HTML, les images et les destinations de lien non sûres', () => {
    const html = renderToStaticMarkup(
      createElement(EpisodeDescription, {
        markdown:
          '<script>alert(1)</script>\n![image](https://example.org/image.svg) [piège](javascript:alert%281%29) [http](http://example.org)',
      }),
    );

    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain('href="http://');
  });

  it('traduit le document entier avant de rendre son Markdown', () => {
    const html = renderToStaticMarkup(
      createElement(LocalizationProvider, {
        locale: 'en',
        dictionary: { '**Bonjour** le monde.': '**Hello** world.' },
        children: createElement(EpisodeDescription, { markdown: '**Bonjour** le monde.' }),
      }),
    );
    expect(html).toContain('<strong>Hello</strong> world.');
  });

  it('propose le même rendu dans le formulaire d’édition', () => {
    const content = loadContent();
    const episode = episodeSchema.parse({
      number: 999,
      title: 'Épisode de test',
      dek: 'Résumé de test.',
      publishedAt: '2026-10-07T10:00:00.000Z',
      durationSec: 1800,
      description: '**Texte important**\n\n- Un point',
      hosts: ['lou'],
      topics: [],
      cover: { tone: 1, kicker: 'Test' },
    });
    const html = renderToStaticMarkup(
      createElement(EpisodeComposer, {
        initialNumber: episode.number,
        episode,
        hosts: content.hosts,
        topics: content.topics,
        otherEpisodes: content.episodes,
        onSelectEpisode: () => undefined,
        pending: false,
        onSave: () => Promise.resolve(),
      }),
    );

    expect(html).toContain('Aperçu de la description');
    expect(html).toContain('<strong>Texte important</strong>');
    expect(html).toContain('<ul>');
    expect(html).toContain('**Texte important**');
  });
});
