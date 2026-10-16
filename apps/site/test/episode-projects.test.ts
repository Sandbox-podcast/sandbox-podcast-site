import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import fixture from './fixtures/episode-001-public.json';
import catalog from '../content/personal-projects.json';
import { episodeSchema } from '../src/domain/schema.ts';
import { personalProjectCatalogSchema } from '../src/domain/personal-projects.ts';
import { episodeEditorialPresentation } from '../src/domain/episode-editorial.ts';
import { episodeProjects } from '../src/domain/episode-projects.ts';
import { episodeResources } from '../src/domain/episode-resources.ts';
import { loadContent, setEditorialOverride } from '../src/lib/load.ts';
import SearchPage from '../src/app/(fr)/search/page.tsx';

import PersonalProjectPage from '../src/app/(fr)/nos-projets/[slug]/page.tsx';
import { LocalizationProvider } from '../src/components/localization.tsx';
import { siteDictionary } from '../src/i18n/dictionaries.ts';

vi.mock('../src/lib/admin-persistence.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/admin-persistence.ts')>()),
  preparePublishedEditorialContent: vi.fn(async () => undefined),
}));

const episode = episodeSchema.parse(fixture.episode);
const projects = personalProjectCatalogSchema.parse(catalog);
afterEach(() => {
  setEditorialOverride(undefined);
});

describe('promesse éditoriale et parcours Sillage', () => {
  it("aligne la copie du pilote sur le sujet annoncé et respecte une nouvelle rédaction dans l'admin", () => {
    const presentation = episodeEditorialPresentation(episode);
    expect(presentation.title).toBe('Codex, Claude Code, OpenCode : le modèle ne suffit pas');
    expect(presentation.dek).toContain('25:50');
    expect(presentation.dek).toContain('37:17');
    expect(
      episodeEditorialPresentation({
        ...episode,
        dek: episode.dek.replace('le podcast', 'le Talk Show'),
      }).dek,
    ).toBe(presentation.dek);
    expect(episode.title).toBe(fixture.episode.title);
    const edited = {
      ...episode,
      title: "Nouveau titre choisi dans l'admin",
      dek: 'Nouvelle présentation éditoriale.',
    };
    expect(episodeEditorialPresentation(edited)).toEqual(edited);
    expect(
      episodeEditorialPresentation({ ...episode, platforms: { youtubeId: 'XXXXXXXXXXX' } }).title,
    ).toBe(episode.title);
  });

  it('relie les sources exactes au projet et à ses deux passages vérifiables', () => {
    const relations = episodeProjects(episode, projects);
    const sillage = relations.find((relation) => relation.project.slug === 'sillage');
    expect(sillage?.chapters.map((chapter) => chapter.at)).toEqual([1550, 2237]);
    expect(relations.some((relation) => relation.project.slug === 'boostback')).toBe(false);
    const resources = episodeResources(episode, projects);
    expect(resources.filter((resource) => resource.label.startsWith('Sillage :'))).toHaveLength(2);
    expect(resources.map((resource) => resource.url)).toEqual(
      episodeResources(episode).map((resource) => resource.url),
    );
  });

  it('conserve les deux liens de chapitres du projet dans les quatre langues', async () => {
    setEditorialOverride({ ...loadContent(), episodes: [episode] });
    for (const [locale, prefix] of [
      ['fr-FR', ''],
      ['en', '/en'],
      ['es-ES', '/es-es'],
      ['de-DE', '/de-de'],
    ] as const) {
      const html = renderToStaticMarkup(
        createElement(LocalizationProvider, {
          locale,
          dictionary: await siteDictionary(locale),
          children: await PersonalProjectPage({ params: Promise.resolve({ slug: 'sillage' }) }),
        }),
      );
      expect(html).toContain(`href="${prefix}/episodes/1?t=1550#episode-video"`);
      expect(html).toContain(`href="${prefix}/episodes/1?t=2237#episode-video"`);
    }
  });

  it('retrouve les deux ressources Sillage avec la recherche, sans changer leurs ancres', async () => {
    setEditorialOverride({ ...loadContent(), episodes: [episode] });
    const html = renderToStaticMarkup(
      await SearchPage({ searchParams: Promise.resolve({ q: 'Sillage', type: 'resources' }) }),
    );
    expect(html).toContain('Sillage : Le site et le film de présentation');
    expect(html).toContain('Sillage : Le dépôt GitHub');
    expect(html).toContain('/episodes/1#resource-11');
    expect(html).toContain('/episodes/1#resource-12');
  });
});
