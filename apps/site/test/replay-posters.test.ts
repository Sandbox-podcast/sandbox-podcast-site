import { describe, expect, it } from 'vitest';
import { cinemaPosterArtwork, replayPosterArtwork } from '../src/domain/replay-posters';

describe('affiches de la salle cinéma', () => {
  it('associe chaque nouveau décor à sa vidéo sans modifier les affiches des autres pages', () => {
    expect(cinemaPosterArtwork('GgSiPkADCz4')).toBe(
      '/images/home/replays/episode-001-cinema-v2.webp',
    );
    expect(cinemaPosterArtwork('7KVqydbGow0')).toBe(
      '/images/home/replays/episode-002-cinema-v2.webp',
    );
    expect(cinemaPosterArtwork('abcdefghijk')).toBeUndefined();
    expect(cinemaPosterArtwork('eEsaxtmDjR4')).toBe(
      '/images/home/replays/episode-003-cinema-v1.webp',
    );
    expect(cinemaPosterArtwork()).toBeUndefined();
  });
});

describe('affiches vintage des replays', () => {
  it('associe le pilote à sa miniature officielle transformée en affiche', () => {
    expect(
      replayPosterArtwork({
        platforms: { youtubeId: 'GgSiPkADCz4' },
        cover: { tone: 0, kicker: 'TEST' },
      }),
    ).toBe('/images/home/replays/episode-001-vintage-v1.webp');
  });
  it('conserve la miniature de chaque autre vidéo sans lui attribuer une affiche du pilote', () => {
    expect(
      replayPosterArtwork({
        platforms: { youtubeId: '7KVqydbGow0' },
        cover: { tone: 0, kicker: 'TEST' },
      }),
    ).toBe('/images/home/replays/episode-002-vintage-v1.webp');
    expect(
      replayPosterArtwork({
        platforms: { youtubeId: 'abcdefghijk' },
        cover: { tone: 0, kicker: 'TEST' },
      }),
    ).toBe('/api/youtube-thumbnail/abcdefghijk');
    expect(
      replayPosterArtwork({
        platforms: {},
        cover: { tone: 0, kicker: 'TEST', uploadedArtworkPath: '/images/custom.webp' },
      }),
    ).toBe('/images/custom.webp');
  });
});
