import { describe, expect, it } from 'vitest';
import {
  extractMarkdownResources,
  mergeDescriptionResources,
} from '../src/domain/episode-resources.ts';

describe('ressources depuis la description Markdown', () => {
  const description = `Ressources de l'épisode

- [Dépôt Dify](https://github.com/langgenius/dify)
- Analyse : https://example.com/analyse.
- [Vidéo de démonstration](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
- [Podcast Spotify](https://open.spotify.com/episode/123)
- [Article de référence][article]
- [Page avec parenthèses](https://en.wikipedia.org/wiki/Function_(mathematics))
- [Image ignorée](https://example.com/article)
![Miniature](https://example.com/thumbnail.png)
\`https://example.com/code\`

\`\`\`md
[À ignorer](https://example.com/fenced)
\`\`\`

[article]: https://arxiv.org/abs/2601.12345`;

  it('extrait les liens Markdown, références et URL brutes une seule fois', () => {
    expect(extractMarkdownResources(description)).toEqual([
      {
        kind: 'repo',
        label: 'Dépôt Dify',
        url: 'https://github.com/langgenius/dify',
        origin: 'description',
      },
      { kind: 'site', label: 'Analyse', url: 'https://example.com/analyse', origin: 'description' },
      {
        kind: 'video',
        label: 'Vidéo de démonstration',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        origin: 'description',
      },
      {
        kind: 'site',
        label: 'Podcast Spotify',
        url: 'https://open.spotify.com/episode/123',
        origin: 'description',
      },
      {
        kind: 'paper',
        label: 'Article de référence',
        url: 'https://arxiv.org/abs/2601.12345',
        origin: 'description',
      },
      {
        kind: 'site',
        label: 'Page avec parenthèses',
        url: 'https://en.wikipedia.org/wiki/Function_(mathematics)',
        origin: 'description',
      },
      {
        kind: 'site',
        label: 'Image ignorée',
        url: 'https://example.com/article',
        origin: 'description',
      },
    ]);
  });

  it('conserve les ressources manuelles et ignore la vidéo de cet épisode', () => {
    const manual = [
      {
        kind: 'site' as const,
        label: 'Libellé corrigé à la main',
        url: 'https://github.com/langgenius/dify',
        note: 'À lire',
      },
      { kind: 'paper' as const, label: 'Annexe sans lien' },
    ];
    const merged = mergeDescriptionResources(manual, description, 'dQw4w9WgXcQ');
    expect(merged[0]).toEqual(manual[0]);
    expect(merged[1]).toEqual(manual[1]);
    expect(merged.map((item) => item.url).filter(Boolean)).toEqual([
      'https://github.com/langgenius/dify',
      'https://example.com/analyse',
      'https://open.spotify.com/episode/123',
      'https://arxiv.org/abs/2601.12345',
      'https://en.wikipedia.org/wiki/Function_(mathematics)',
      'https://example.com/article',
    ]);
    expect(mergeDescriptionResources(merged, description, 'dQw4w9WgXcQ')).toEqual(merged);
  });

  it('écarte les URL non sécurisées et les liens cachés dans le HTML', () => {
    expect(
      extractMarkdownResources(
        '[Non sécurisé](http://example.com) <a href="https://example.com/hidden">HTML</a> <https://example.com/visible>',
      ),
    ).toEqual([
      {
        kind: 'site',
        label: 'example.com',
        url: 'https://example.com/visible',
        origin: 'description',
      },
    ]);
  });

  it('ignore les définitions dans un bloc de code et les URL ambiguës', () => {
    expect(
      extractMarkdownResources(
        '```md\n[secret]: https://example.com/code\n```\n[Secret][secret]\nhttps://example.com\\@evil.test',
      ),
    ).toEqual([]);
  });

  it('retire les liens supprimés du Markdown et garde les modifications des liens restants', () => {
    const current = mergeDescriptionResources(
      [{ kind: 'paper', label: 'Annexe manuelle' }],
      '[A](https://example.com/a) et [B](https://example.com/b)',
    );
    const edited = current.map((item) =>
      item.url === 'https://example.com/b' ? { ...item, label: 'Titre corrigé' } : item,
    );
    expect(mergeDescriptionResources(edited, '[B](https://example.com/b)')).toEqual([
      { kind: 'paper', label: 'Annexe manuelle' },
      { kind: 'site', label: 'Titre corrigé', url: 'https://example.com/b', origin: 'description' },
    ]);
  });
});
