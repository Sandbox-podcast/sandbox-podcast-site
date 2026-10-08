import { describe, expect, it } from 'vitest';
import { subdomainRewriteRules } from '../src/domain/subdomain-routing';

describe('routage des sous-domaines publics', () => {
  it('sert le support d’épisode à la racine de slides.sandboxpodcast.fr', () => {
    expect(subdomainRewriteRules).toEqual([
      {
        source: '/',
        has: [{ type: 'host', value: 'slides.sandboxpodcast.fr' }],
        destination: '/slides/episode-043/index.html',
      },
    ]);
  });
});
