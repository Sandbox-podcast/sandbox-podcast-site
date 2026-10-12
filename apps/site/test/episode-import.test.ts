import { describe, expect, it } from 'vitest';
import { createEpisodeFromYouTube } from '../src/domain/episode-import.ts';

const metadata = {
  videoId: 'dQw4w9WgXcQ',
  title: 'Le vrai titre de la vidéo',
  channel: 'Sandbox',
  thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  publishedAt: '2026-10-12T10:00:00.000Z',
  durationSec: 1800,
  source: 'youtube-data-api' as const,
};

const description = `Un épisode sur les outils IA.

00:00 Introduction
05:12 Démonstration
35:00 Hors durée

Code source : https://github.com/sandbox/demo
Vidéo : https://www.youtube.com/watch?v=dQw4w9WgXcQ
Écouter : https://open.spotify.com/episode/123`;

describe('création simplifiée d’un épisode', () => {
  it('reprend les métadonnées YouTube et extrait les sources du texte collé', () => {
    const episode = createEpisodeFromYouTube({
      number: 43,
      metadata,
      description,
      hosts: ['lou'],
      status: 'draft',
    });

    expect(episode.title).toBe('Le vrai titre de la vidéo');
    expect(episode.dek).toBe('Un épisode sur les outils IA.');
    expect(episode.publishedAt).toBe(metadata.publishedAt);
    expect(episode.durationSec).toBe(1800);
    expect(episode.description).toBe(description);
    expect(episode.hosts).toEqual(['lou']);
    expect(episode.chapters).toEqual([
      { at: 0, title: 'Introduction' },
      { at: 312, title: 'Démonstration' },
    ]);
    expect(episode.mentions).toEqual([
      { kind: 'repo', label: 'Code source', url: 'https://github.com/sandbox/demo' },
    ]);
    expect(episode.platforms).toMatchObject({
      youtubeId: metadata.videoId,
      youtubeChannel: 'Sandbox',
      spotifyUrl: 'https://open.spotify.com/episode/123',
    });
    expect(episode.status).toBe('draft');
  });

  it('ne fabrique pas de durée quand la clé YouTube manque', () => {
    expect(() =>
      createEpisodeFromYouTube({
        number: 43,
        metadata: { ...metadata, source: 'oembed', durationSec: undefined },
        description,
        hosts: ['lou'],
        status: 'published',
      }),
    ).toThrow('Configurez YOUTUBE_API_KEY');
  });

  it('demande une description et un animateur réels', () => {
    expect(() =>
      createEpisodeFromYouTube({
        number: 43,
        metadata,
        description: ' ',
        hosts: ['lou'],
        status: 'draft',
      }),
    ).toThrow('Collez la description');
    expect(() =>
      createEpisodeFromYouTube({
        number: 43,
        metadata,
        description,
        hosts: [],
        status: 'draft',
      }),
    ).toThrow('Aucun animateur');
  });
});
