import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PodcastPage from '../src/app/(fr)/podcast/page';
import { allEpisodes } from '../src/lib/repository';
import { setEditorialOverride } from '../src/lib/load';

// Cette suite utilise les épisodes Git ; les publications locales sont testées séparément.
vi.mock('../src/lib/admin-persistence', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/admin-persistence')>()),
  preparePublicEditorialContent: async () => undefined,
}));
beforeEach(() => {
  setEditorialOverride(undefined);
});

describe('parcours de la bibliothèque podcast', () => {
  it('n’expose aucun épisode de démonstration', () => {
    expect(allEpisodes()).toEqual([]);
  });

  it('rend la bibliothèque vide sans lecteur vidéo de démo', async () => {
    const page = await PodcastPage();
    const html = renderToStaticMarkup(createElement('div', null, page));
    expect(html).toContain('L&#x27;IA dans notre travail, en discussion.');
    expect(html).not.toContain('EP. 40');
    expect(html).not.toContain('EP. 41');
    expect(html).not.toContain('EP. 42');
    expect(html).not.toContain('<iframe');
  });
});
