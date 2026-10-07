import { describe, expect, it } from 'vitest';
import {
  parseYouTubeDescription,
  parseYouTubeDuration,
  parseYouTubeVideoId,
} from '../src/domain/youtube.ts';

describe('extraction d’un identifiant YouTube', () => {
  it('reconnaît les formats de liens YouTube usuels', () => {
    expect(parseYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('refuse les domaines inconnus, le HTTP et les identifiants mal formés', () => {
    expect(parseYouTubeVideoId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeUndefined();
    expect(parseYouTubeVideoId('http://youtube.com/watch?v=dQw4w9WgXcQ')).toBeUndefined();
    expect(parseYouTubeVideoId('https://youtube.com/watch?v=short')).toBeUndefined();
  });
});

describe('import des informations de la vidéo', () => {
  it('convertit la durée fournie par YouTube', () => {
    expect(parseYouTubeDuration('PT45M3S')).toBe(2703);
    expect(parseYouTubeDuration('PT1H2M')).toBe(3720);
    expect(parseYouTubeDuration('P1DT2H')).toBe(93_600);
    expect(parseYouTubeDuration('PT0S')).toBeUndefined();
    expect(parseYouTubeDuration('n/a')).toBeUndefined();
  });

  it('extrait résumé, chapitres, liens et plateformes sans inventer de contenu', () => {
    const details = parseYouTubeDescription(`Un épisode sur les agents et les classements.

00:00 Introduction
05:12 Classement GitHub
1:02:08 Conclusion

Code source : https://github.com/acme/demo
Article : https://example.com/analyse.
Écouter sur Spotify : https://open.spotify.com/episode/123
Apple Podcasts : https://podcasts.apple.com/fr/podcast/example/id123`);
    expect(details.summary).toBe('Un épisode sur les agents et les classements.');
    expect(details.chapters).toEqual([
      { at: 0, title: 'Introduction' },
      { at: 312, title: 'Classement GitHub' },
      { at: 3728, title: 'Conclusion' },
    ]);
    expect(details.resources).toEqual([
      { kind: 'repo', label: 'Code source', url: 'https://github.com/acme/demo' },
      { kind: 'site', label: 'Article', url: 'https://example.com/analyse' },
    ]);
    expect(details.spotifyUrl).toBe('https://open.spotify.com/episode/123');
    expect(details.appleUrl).toBe('https://podcasts.apple.com/fr/podcast/example/id123');
  });

  it('laisse les chapitres et ressources vides si la description ne les contient pas', () => {
    expect(parseYouTubeDescription('Présentation de la vidéo.')).toEqual({
      summary: 'Présentation de la vidéo.',
      chapters: [],
      resources: [],
    });
  });
});
