import { access } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import nextConfig from '../next.config';
import PersonalProjectsPage from '../src/app/(fr)/nos-projets/page';
import PersonalProjectPage, { generateMetadata } from '../src/app/(fr)/nos-projets/[slug]/page';
import SearchPage from '../src/app/(fr)/search/page';
import { LocalizationProvider } from '../src/components/localization';
import {
  filterPersonalProjects,
  personalProjectCatalogSchema,
  personalProjectPath,
  personalProjectSchema,
} from '../src/domain/personal-projects';
import { isNavigationActive } from '../src/domain/site-navigation';
import { localizedHref } from '../src/i18n/routing';
import { matchSharedPage } from '../src/i18n/page-routes';
import { siteDictionary } from '../src/i18n/dictionaries';
import { personalProject, personalProjects } from '../src/lib/personal-projects';

describe('catalogue des projets personnels', () => {
  it('réunit les projets demandés avec une attribution et des sources', () => {
    for (const slug of [
      'sillage',
      'boostback',
      'point-zero',
      'ballcam',
      'okodukai',
      'song-maker',
      'akasha-os',
    ])
      expect(personalProject(slug)?.sources.length).toBeGreaterThan(0);
    expect(personalProject('song-maker')?.creator).toBe('loic');
    expect(personalProject('mindodyssey')?.access).toBe('preview');
    expect(personalProject('aigora')?.url).toBe('https://github.com/MarlBurroW/aigora');
    expect(personalProject('kinbot')).toBeUndefined();
    expect(personalProject('hivekeep')?.description.join(' ')).toContain('KinBot');
  });

  it('refuse les doublons, liens non HTTPS et chemins de médias non maîtrisés', () => {
    const project = personalProjects[0];
    expect(project).toBeDefined();
    expect(personalProjectCatalogSchema.safeParse([project, project]).success).toBe(false);
    expect(
      personalProjectSchema.safeParse({ ...project, url: 'javascript:alert(1)' }).success,
    ).toBe(false);
    expect(
      personalProjectSchema.safeParse({
        ...project,
        icon: {
          src: '/nos-projets/../../secret.png',
          alt: 'Logo',
          sourceUrl: 'https://example.org',
          kind: 'logo',
        },
      }).success,
    ).toBe(false);
  });

  it('croise les filtres et cherche sans tenir compte de la casse ou des accents', () => {
    expect(
      filterPersonalProjects(personalProjects, { query: 'LOIC memoire' }).map(
        (project) => project.slug,
      ),
    ).toContain('akasha');
    expect(
      filterPersonalProjects(personalProjects, { creator: 'lou', category: 'education' }).map(
        (project) => project.slug,
      ),
    ).toEqual(['okodukai', 'heros-de-la-classe', 'mindodyssey']);
    expect(
      filterPersonalProjects(personalProjects, { query: '  SUPER heavy  ' }).map(
        (project) => project.slug,
      ),
    ).toEqual(['boostback']);
    expect(filterPersonalProjects(personalProjects, { query: 'Introuvable-xyz' })).toEqual([]);
    expect(filterPersonalProjects(personalProjects)).toHaveLength(personalProjects.length);
  });

  it('ne référence que des médias locaux réellement présents', async () => {
    for (const project of personalProjects) {
      const paths = [
        project.icon?.src,
        project.cover?.src,
        ...project.images.map((image) => image.src),
        ...project.videos.flatMap((video) => [
          video.poster,
          video.src.startsWith('/') ? video.src : undefined,
        ]),
      ].filter((path): path is string => Boolean(path));
      for (const path of paths)
        await expect(access(new URL(`../public${path}`, import.meta.url))).resolves.toBeUndefined();
    }
  });

  it('conserve les pages et les assets dans les liens localisés', () => {
    expect(matchSharedPage('/nos-projets')).toEqual({ route: '/nos-projets', params: {} });
    expect(matchSharedPage('/nos-projets/sillage')?.route).toBe('/nos-projets/:slug');
    expect(localizedHref('/nos-projets/sillage', 'en')).toBe('/en/nos-projets/sillage');
    expect(localizedHref('/nos-projets/sillage/board.webp', 'en')).toBe(
      '/nos-projets/sillage/board.webp',
    );
    expect(localizedHref('/nos-projets/okodukai/presentation.mp4', 'de-DE')).toBe(
      '/nos-projets/okodukai/presentation.mp4',
    );
    expect(isNavigationActive('/nos-projets/sillage', '/nos-projets')).toBe(true);
    expect(isNavigationActive('/nos-projets/sillage', '/charts')).toBe(false);
  });

  it('rend les fiches sans fausses notes et charge les vidéos seulement au clic', async () => {
    const html = renderToStaticMarkup(
      await PersonalProjectPage({ params: Promise.resolve({ slug: 'sillage' }) }),
    );
    expect(html).toContain('Sillage en 54 secondes');
    expect(html).toContain('Sources de cette fiche');
    expect(html).toContain('Lire la vidéo');
    expect(html).not.toContain('<video');
    expect(html).not.toContain('aggregateRating');
    expect(html).not.toContain('sillage-film.mp4');
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: 'sillage' }) });
    expect(metadata.alternates?.canonical).toBe('/nos-projets/sillage');
  });

  it.each([
    ['en', 'en', 'What we build.', 'Search projects'],
    ['es-ES', 'es-es', 'Lo que construimos.', 'Buscar un proyecto'],
    ['de-DE', 'de-de', 'Was wir entwickeln.', 'Projekt suchen'],
  ] as const)(
    'rend le catalogue et les liens de fiches en %s avec le dictionnaire public',
    async (locale, prefix, title, searchLabel) => {
      const html = renderToStaticMarkup(
        createElement(LocalizationProvider, {
          locale,
          dictionary: await siteDictionary(locale),
          children: createElement(PersonalProjectsPage),
        }),
      );
      expect(html).toContain(title);
      expect(html).not.toContain('Ce que nous construisons.');
      expect(html).not.toContain('Découvre les projets de Lou');
      expect(html).toContain(`href="/${prefix}/nos-projets/sillage"`);
      expect(html).toContain(`placeholder="${searchLabel}"`);
      for (const project of personalProjects)
        expect(html).toContain(`href="/${prefix}${personalProjectPath(project.slug)}"`);
    },
  );

  it('retrouve les applications dans la recherche globale', async () => {
    const html = renderToStaticMarkup(
      await SearchPage({
        searchParams: Promise.resolve({ q: 'Sillage', type: 'personal-projects' }),
      }),
    );
    expect(html).toContain('href="/nos-projets/sillage"');
    expect(html).toContain('search-personal-projects');
  });

  it('autorise uniquement les origines des vidéos vérifiées dans la CSP de production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      const headers = await nextConfig.headers?.();
      const policy = headers
        ?.flatMap((route) => route.headers)
        .find((header) => header.key === 'Content-Security-Policy')?.value;
      expect(policy).toContain(
        "media-src 'self' https://marlburrow.github.io https://raw.githubusercontent.com",
      );
      const project = personalProject('sillage');
      expect(
        personalProjectSchema.safeParse({
          ...project,
          videos: [
            {
              title: 'Vidéo',
              src: 'https://unverified.example/video.mp4',
              poster: '/nos-projets/sillage/board.webp',
              sourceUrl: 'https://example.org',
              kind: 'demo',
            },
          ],
        }).success,
      ).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
