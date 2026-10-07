import { describe, expect, it } from 'vitest';
import { episodeSchema } from '../src/domain/schema.ts';

const draftEpisode = {
  number: 43,
  title: 'Un nouvel épisode',
  dek: 'Un résumé court.',
  publishedAt: '2026-10-07T10:00:00.000Z',
  durationSec: 1800,
  description: 'Une description complète de l’épisode.',
  hosts: ['alex'],
  cover: { tone: 1, kicker: 'Épisode 43' },
};

describe('schéma des épisodes du catalogue', () => {
  it('fournit les valeurs par défaut pour les chapitres, ressources et la visibilité', () => {
    const episode = episodeSchema.parse(draftEpisode);
    expect(episode.chapters).toEqual([]);
    expect(episode.mentions).toEqual([]);
    expect(episode.sources).toEqual([]);
    expect(episode.featured).toBe(false);
    expect(episode.status).toBe('published');
  });

  it('accepte les miniatures YouTube officielles et refuse les autres domaines', () => {
    expect(
      episodeSchema.safeParse({
        ...draftEpisode,
        platforms: {
          youtubeId: 'dQw4w9WgXcQ',
          thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        },
      }).success,
    ).toBe(true);
    expect(
      episodeSchema.safeParse({
        ...draftEpisode,
        platforms: { thumbnailUrl: 'https://images.example.test/thumb.jpg' },
      }).success,
    ).toBe(false);
    expect(
      episodeSchema.safeParse({
        ...draftEpisode,
        platforms: { youtubeId: 'too-short' },
      }).success,
    ).toBe(false);
  });
});
