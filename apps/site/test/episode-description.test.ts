import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EpisodeDescription } from '../src/components/episode-description';
import { EpisodeComposer } from '../src/components/episode-composer';
import { LocalizationProvider } from '../src/components/localization';
import { loadContent } from '../src/lib/load';
import { episodeSchema } from '../src/domain/schema';

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

  it('renders Markdown in the edit form', () => {
    const content = loadContent();
    const episode = episodeSchema.parse({
      number: 999,
      title: 'Test episode',
      dek: 'Short summary.',
      publishedAt: '2026-10-07T10:00:00.000Z',
      durationSec: 1800,
      description: '**Important text**\n\n- One point',
      hosts: ['equipe-sandbox'],
      topics: [],
      cover: { tone: 1, kicker: 'Episode 999' },
    });
    const props = {
      initialNumber: episode.number,
      hosts: content.hosts,
      topics: content.topics,
      otherEpisodes: content.episodes,
      onSelectEpisode: () => undefined,
      pending: false,
      onSave: () => Promise.resolve(),
    };
    const html = renderToStaticMarkup(createElement(EpisodeComposer, { ...props, episode }));

    expect(html).toContain('episode-markdown-preview');
    expect(html).toContain('<strong>Important text</strong>');
    expect(html).toContain('<ul>');
  });

  it('shows the Markdown preview in the create form', () => {
    const content = loadContent();
    const html = renderToStaticMarkup(
      createElement(EpisodeComposer, {
        initialNumber: 999,
        hosts: content.hosts,
        topics: content.topics,
        otherEpisodes: content.episodes,
        onSelectEpisode: () => undefined,
        pending: false,
        onSave: () => Promise.resolve(),
      }),
    );

    expect(html).toContain('episode-markdown-preview');
  });
});
