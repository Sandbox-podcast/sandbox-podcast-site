import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PodcastReplays } from '../src/components/podcast-replays';
import { EpisodeComposer } from '../src/components/episode-composer';
import { episodeSchema } from '../src/domain/schema';
import config from '../next.config';

const episode = (number: number, publishedAt: string) =>
  episodeSchema.parse({
    number,
    publishedAt,
    title: `Replay numéro ${String(number)}`,
    dek: 'Un épisode sur les outils IA.',
    description: 'Un épisode de test sur les outils IA et leurs usages.',
    durationSec: 3600,
    hosts: ['lou'],
    topics: ['agents'],
    cover: { tone: 0, kicker: 'Sandbox' },
    platforms: { youtubeId: 'GgSiPkADCz4' },
  });

describe('replays hebdomadaires', () => {
  it('affiche un état vide sans historique ni lecteur fictif', () => {
    const html = renderToStaticMarkup(createElement(PodcastReplays, { episodes: [] }));
    expect(html).toContain('Aucun replay pour le moment.');
    expect(html).not.toContain('Épisodes précédents');
    expect(html).not.toContain('<iframe');
  });
  it('présente le seul épisode une fois, sans rayon ni filtre', () => {
    const html = renderToStaticMarkup(
      createElement(PodcastReplays, { episodes: [episode(1, '2026-10-12T12:00:00.000Z')] }),
    );
    const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
    expect(visible).toContain('href="/episodes/1"');
    expect(visible.match(/<h2\b/g)).toHaveLength(1);
    expect(visible).not.toContain('Épisodes précédents');
    expect(visible).not.toContain('/topics');
    expect(visible).not.toMatch(/<input|<select|<iframe/);
  });
  it('place le plus récent devant un historique complet, sans répéter le dernier ni honorer une ancienne mise en avant', () => {
    const oldest = { ...episode(1, '2026-10-05T12:00:00.000Z'), featured: true };
    const entries = [
      oldest,
      episode(3, '2026-10-19T12:00:00.000Z'),
      episode(2, '2026-10-12T12:00:00.000Z'),
    ];
    const html = renderToStaticMarkup(createElement(PodcastReplays, { episodes: entries }));
    expect(html.indexOf('id="latest-replay-title"')).toBeLessThan(
      html.indexOf('Replay numéro 3</a>'),
    );
    const history = html.slice(html.indexOf('<ol class="replay-list">'), html.indexOf('</ol>'));
    expect(history).not.toContain('/episodes/3');
    expect(history.indexOf('/episodes/2')).toBeLessThan(history.indexOf('/episodes/1'));
    expect(history.match(/<li>/g)).toHaveLength(2);
    expect(entries[0]).toBe(oldest);
  });
  it('ne demande plus de thème dans la saisie d’un épisode', () => {
    const html = renderToStaticMarkup(
      createElement(EpisodeComposer, {
        initialNumber: 1,
        hosts: [],
        otherEpisodes: [],
        pending: false,
        onSelectEpisode: () => undefined,
        onSave: async () => undefined,
      }),
    );
    expect(html).not.toContain('Thèmes');
  });
  it('redirige les anciens catalogues dans chaque langue sans intercepter les fiches', async () => {
    const redirects = await config.redirects?.();
    for (const prefix of ['', '/en', '/es-es', '/de-de']) {
      for (const suffix of ['/episodes', '/topics/:slug*']) {
        expect(redirects).toContainEqual({
          source: prefix + suffix,
          destination: prefix + '/podcast',
          permanent: true,
        });
      }
      expect(redirects?.some((item) => item.source === prefix + '/episodes/:number')).toBe(false);
    }
  });
});
