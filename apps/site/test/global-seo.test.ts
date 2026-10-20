import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { siteIdentityLd } from '../src/lib/site-identity';
import { absoluteUrl, publisherLd } from '../src/lib/seo';
import { setSiteSettingsOverride, siteConfig } from '../src/config/site';
import { loadContent } from '../src/lib/load';
import { publicHosts } from '../src/lib/repository';
import { personalProject } from '../src/lib/personal-projects';
import AboutPage from '../src/app/(fr)/about/page';
import ProjectPage from '../src/app/(fr)/nos-projets/[slug]/page';

vi.mock('../src/lib/admin-persistence', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/lib/admin-persistence')>()),
  preparePublicEditorialContent: async () => undefined,
}));
afterEach(() => {
  setSiteSettingsOverride(undefined);
});

function structuredData(html: string): Record<string, unknown>[] {
  return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].flatMap(
    (match) => JSON.parse(match[1] ?? '[]') as Record<string, unknown>[],
  );
}

describe('SEO global : identité et attribution des contenus', () => {
  it('relie chaque langue à la même organisation et aux profils publics sans figer un ancien nom', () => {
    setSiteSettingsOverride({ ...loadContent().site, name: 'Sandbox Studio' });
    for (const locale of ['fr-FR', 'en', 'es-ES', 'de-DE']) {
      const [website, organization] = siteIdentityLd(`Description ${locale}`, locale);
      expect(website).toMatchObject({
        '@id': absoluteUrl('/#website'),
        inLanguage: locale,
        description: `Description ${locale}`,
        publisher: { '@id': absoluteUrl('/#organization') },
      });
      expect(organization).toMatchObject({
        '@id': absoluteUrl('/#organization'),
        name: siteConfig.name,
      });
      expect(organization?.['sameAs']).toContain(siteConfig.platforms.youtube);
      expect(organization?.['sameAs']).toContain(
        'https://www.linkedin.com/company/sandbox-podcast-fr/',
      );
      expect(publisherLd.name).toBe('Sandbox Studio');
      expect(organization).not.toHaveProperty('aggregateRating');
    }
  });

  it('rend les biographies déjà publiées visibles et attribue chaque profil à une ancre réelle', async () => {
    const html = renderToStaticMarkup(createElement('div', null, await AboutPage()));
    const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    expect(visible.match(/class="about-social-bio whitespace-pre-line"/g)).toHaveLength(
      publicHosts().length,
    );
    for (const host of publicHosts()) expect(visible).toContain(`id="${host.slug}"`);
    const about = structuredData(html).find((node) => node['@type'] === 'AboutPage');
    const entity = about?.['mainEntity'] as Record<string, unknown>;
    const people = entity['member'] as Record<string, unknown>[];
    expect(people.map((person) => person['description'])).toEqual(
      publicHosts().map((host) => host.bio),
    );
    const englishHtml = renderToStaticMarkup(
      createElement('div', null, await AboutPage({ locale: 'en' })),
    );
    expect(structuredData(englishHtml).find((node) => node['@type'] === 'AboutPage')).toMatchObject(
      { url: absoluteUrl('/en/about'), inLanguage: 'en' },
    );
  });

  it.each(['fr-FR', 'en'])(
    'décrit le projet et ses sources sans inventer de date de publication ni d’avis en %s',
    async (locale) => {
      const project = personalProject('sillage');
      if (!project) throw new Error('Projet Sillage absent');
      const html = renderToStaticMarkup(
        await ProjectPage({ params: Promise.resolve({ slug: project.slug }), locale }),
      );
      const page = structuredData(html).find((node) => node['@type'] === 'WebPage');
      expect(page).toMatchObject({
        inLanguage: locale,
        lastReviewed: project.verifiedAt,
        citation: project.sources.map((source) => source.url),
      });
      expect(page?.['url']).toBe(
        absoluteUrl(`${locale === 'en' ? '/en' : ''}/nos-projets/sillage`),
      );
      const entity = page?.['mainEntity'] as Record<string, unknown>;
      expect(entity).toMatchObject({ name: project.name, url: project.url });
      expect(entity).not.toHaveProperty('aggregateRating');
      expect(entity).not.toHaveProperty('offers');
      expect(page).not.toHaveProperty('datePublished');
    },
  );
});
