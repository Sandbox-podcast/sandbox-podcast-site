import { describe, expect, it } from 'vitest';
import { indexableEpisode } from '../src/domain/episode-seo.ts';
import { episodeSchema } from '../src/domain/schema.ts';
import { pageMetadata } from '../src/lib/seo.ts';

const realEpisode = episodeSchema.parse({
  number: 1,
  title: 'Un épisode réel',
  dek: 'Une conversation publiée sur les outils IA et leurs limites, avec sources et exemples.',
  description:
    'Un épisode vidéo du podcast Sandbox consacré aux outils IA. Nous explorons les sources et les limites.\n0:00 Introduction',
  publishedAt: '2026-10-12T21:40:00.000Z',
  durationSec: 4702,
  hosts: ['lou'],
  platforms: { youtubeId: 'GgSiPkADCz4' },
  cover: { tone: 0, kicker: 'Sandbox' },
});

describe('indexation sélective des contenus vérifiés', () => {
  it('conserve le noindex par défaut pour les fixtures en mode mock', () => {
    expect(
      pageMetadata({ title: 'Mock', description: 'Mock', path: '/mock' }).robots,
    ).toMatchObject({
      index: false,
    });
    expect(
      pageMetadata({ title: 'Réel', description: 'Réel', path: '/real', noindex: false }).robots,
    ).toMatchObject({ index: true });
  });

  it('demande une publication, une vidéo et un texte substantiel pour un épisode', () => {
    expect(indexableEpisode(realEpisode)).toBe(true);
    expect(indexableEpisode({ ...realEpisode, status: 'draft' })).toBe(false);
    expect(indexableEpisode({ ...realEpisode, platforms: {} })).toBe(false);
    expect(indexableEpisode({ ...realEpisode, description: 'Court' })).toBe(false);
  });
});
