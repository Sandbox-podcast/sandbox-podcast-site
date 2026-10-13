import { describe, expect, it } from 'vitest';
import { episodeSchema } from '../src/domain/schema.ts';
import {
  episodeChapters,
  episodeVideoClips,
  episodeStartOffset,
  verifiedEpisodeDuration,
} from '../src/domain/episode-presentation.ts';

const episode = episodeSchema.parse({
  number: 1,
  title: 'Épisode 1',
  dek: 'Présentation de l’épisode.',
  publishedAt: '2026-10-12T10:00:00.000Z',
  durationSec: 780,
  description: '0:00 Introduction\n1:17:41 Conclusion',
  hosts: ['lou'],
  cover: { tone: 0, kicker: 'Sandbox' },
});

describe('présentation des épisodes publiés', () => {
  it('récupère les chapitres présents dans une description sans chapitres structurés', () => {
    expect(episodeChapters(episode)).toEqual([
      { at: 0, title: 'Introduction' },
      { at: 4661, title: 'Conclusion' },
    ]);
  });

  it('masque une durée contredite par les horodatages', () => {
    expect(verifiedEpisodeDuration(episode)).toBeUndefined();
    expect(verifiedEpisodeDuration({ ...episode, durationSec: 4702 })).toBe(4702);
  });

  it('respecte les chapitres édités à la main', () => {
    expect(episodeChapters({ ...episode, chapters: [{ at: 60, title: 'Début' }] })).toEqual([
      { at: 60, title: 'Début' },
    ]);
  });

  it('balise les moments clés sans inventer la fin d’une vidéo de durée inconnue', () => {
    const chapters = episodeChapters(episode);
    expect(
      episodeVideoClips(chapters, undefined, 'https://www.sandboxpodcast.fr/episodes/1'),
    ).toEqual([
      {
        '@type': 'Clip',
        name: 'Introduction',
        startOffset: 0,
        endOffset: 4661,
        url: 'https://www.sandboxpodcast.fr/episodes/1?t=0#episode-video',
      },
    ]);
    expect(
      episodeVideoClips(chapters, 4702, 'https://www.sandboxpodcast.fr/episodes/1'),
    ).toHaveLength(2);
    expect(
      episodeVideoClips(chapters, 4702, 'https://www.sandboxpodcast.fr/episodes/1')[1]?.endOffset,
    ).toBe(4702);
  });

  it('ignore les chapitres éditoriaux avec un horodatage déjà présent', () => {
    const clips = episodeVideoClips(
      [
        { at: 0, title: 'Introduction' },
        { at: 0, title: 'Doublon' },
        { at: 60, title: 'Suite' },
      ],
      120,
      'https://www.sandboxpodcast.fr/episodes/1',
    );
    expect(clips.map((clip) => clip.startOffset)).toEqual([0, 60]);
  });

  it('valide les liens profonds vers le lecteur', () => {
    expect(episodeStartOffset('4661', 4702)).toBe(4661);
    expect(episodeStartOffset('4702', 4702)).toBeUndefined();
    expect(episodeStartOffset('12s', 4702)).toBeUndefined();
  });
});
