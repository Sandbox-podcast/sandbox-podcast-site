import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EpisodeComposer } from '../src/components/episode-composer.tsx';
import { episodeSchema } from '../src/domain/schema.ts';
import { loadContent } from '../src/lib/load.ts';

describe('ressources de l’éditeur d’épisode', () => {
  it('affiche les liens du Markdown pour un épisode déjà publié sans ressources enregistrées', () => {
    const base = loadContent();
    const episode = episodeSchema.parse({
      number: 1,
      title: 'Épisode 1',
      dek: 'Présentation de l’épisode.',
      publishedAt: '2026-10-12T10:00:00.000Z',
      durationSec: 780,
      description:
        '0:00 Introduction\n1:17:41 Conclusion\n[Dify](https://github.com/langgenius/dify)',
      hosts: ['lou'],
      platforms: { youtubeId: 'GgSiPkADCz4' },
      cover: { tone: 0, kicker: 'Sandbox' },
    });
    const html = renderToStaticMarkup(
      createElement(EpisodeComposer, {
        initialNumber: 1,
        episode,
        hosts: base.hosts,
        topics: base.topics,
        otherEpisodes: [],
        onSelectEpisode: () => undefined,
        pending: false,
        onSave: async () => undefined,
      }),
    );
    expect(html).toContain('Ressource 1 · Markdown');
    expect(html).toContain('value="Dify"');
    expect(html).toContain('value="https://github.com/langgenius/dify"');
    expect(html).toContain('Chapitres');
    expect(html).toContain('durée YouTube incohérente avec les chapitres');
    expect(html).toContain('Lecture de la durée depuis le lecteur YouTube');
  });
});
