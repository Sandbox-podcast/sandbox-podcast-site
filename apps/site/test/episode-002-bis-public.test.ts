import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '../src/proxy';
import { slidesBrowserRedirect } from '../src/domain/subdomain-routing';

describe('publication indépendante de l’épisode 002 BIS', () => {
  it('réécrit exactement l’URL publique vers un fichier HTML existant', () => {
    const response = proxy(
      new NextRequest('https://slides.sandboxpodcast.fr/episode-002-bis/index.html', {
        headers: { host: 'slides.sandboxpodcast.fr' },
      }),
    );
    const rewrite = response.headers.get('x-middleware-rewrite');
    expect(rewrite).toBeTruthy();
    if (!rewrite) throw new Error('Réécriture BIS absente');
    const target = new URL(rewrite);
    expect(target.pathname).toBe('/slides/episode-002-bis/index.html');
    const file = join(process.cwd(), 'public', target.pathname);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, 'utf8')).toContain('<title>SANDBOX | Épisode 002 BIS</title>');
    expect(slidesBrowserRedirect('/episode-002-bis/')).toBe('/episode-002-bis/index.html');
  });
});
