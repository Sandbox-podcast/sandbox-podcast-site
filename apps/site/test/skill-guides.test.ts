import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import GuidePage, {
  generateMetadata,
  generateStaticParams,
} from '../src/app/(fr)/guides/[slug]/page';
import GuidesPage, { metadata as hubMetadata } from '../src/app/(fr)/guides/page';
import { SkillGuideLinks } from '../src/components/skill-guide';
import { Footer } from '../src/components/shell';
import { SKILL_GUIDES_REVIEWED_AT, skillGuidePath, skillGuides } from '../src/domain/skill-guides';
import { matchSharedPage } from '../src/i18n/page-routes';
import { localizedHref } from '../src/i18n/routing';

describe('guides de choix des skills', () => {
  it.each(skillGuides)('rend le guide $slug et ses preuves sans JavaScript', async (guide) => {
    const params = Promise.resolve({ slug: guide.slug });
    const html = renderToStaticMarkup(await GuidePage({ params }));
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('Revue documentaire');
    expect(html).toContain('pas des résultats de tests réalisés par Sandbox');
    expect(html.match(/<blockquote>/g)).toHaveLength(guide.options.length);
    expect(html.match(/<summary>Comment vérifier le résultat<\/summary>/g)).toHaveLength(
      guide.options.length,
    );
    for (const option of guide.options) {
      expect(html).toContain(`href="${option.source}"`);
      expect(html).toContain(option.name);
    }
    for (const anchor of ['choix', 'installation', 'methode', 'questions']) {
      expect(html).toContain(`href="#${anchor}"`);
      expect(html.match(new RegExp(`id="${anchor}"`, 'g'))).toHaveLength(1);
    }
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)];
    expect(scripts).toHaveLength(1);
    const structured = JSON.parse(scripts[0]?.[1] ?? 'null') as Record<string, unknown>[];
    const article = structured.find((node) => node['@type'] === 'Article');
    expect(article).toMatchObject({
      headline: guide.heading,
      dateModified: SKILL_GUIDES_REVIEWED_AT,
      inLanguage: 'fr-FR',
    });
    expect(article).not.toHaveProperty('aggregateRating');
    expect(article).not.toHaveProperty('reviewRating');
    expect(article).not.toHaveProperty('datePublished');
    const metadata = await generateMetadata({ params });
    expect(metadata.alternates).toEqual({ canonical: skillGuidePath(guide.slug) });
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(metadata.openGraph).toMatchObject({
      title: guide.title,
      description: guide.description,
      type: 'article',
    });
  });

  it('distingue les recettes à créer des skills disponibles et donne une vraie procédure', async () => {
    const chat = skillGuides.find((guide) => guide.kind === 'recipes');
    expect(chat?.tool).toBe('ChatGPT');
    if (!chat) throw new Error('Guide ChatGPT manquant');
    const html = renderToStaticMarkup(
      await GuidePage({ params: Promise.resolve({ slug: chat.slug }) }),
    );
    expect(html).toContain('pas des extensions à télécharger');
    expect(html).toContain('@skill-creator');
    expect(html).toContain('Créer ton skill');
    expect(html).not.toContain('>Installation</a>');
    const claude = skillGuides.find((guide) => guide.tool === 'Claude');
    expect(claude?.command).toContain('/plugin install document-skills@anthropic-agent-skills');
  });

  it('rend les guides découvrables depuis le hub, le classement et le pied de page', () => {
    const hub = renderToStaticMarkup(createElement(GuidesPage));
    const links = renderToStaticMarkup(createElement(SkillGuideLinks));
    const footer = renderToStaticMarkup(createElement(Footer));
    expect(footer).toContain('href="/guides"');
    expect(hub.match(/<h1\b/g)).toHaveLength(1);
    expect(hubMetadata.robots).toMatchObject({ index: true });
    for (const guide of skillGuides) {
      const href = `href="${skillGuidePath(guide.slug)}"`;
      expect(hub).toContain(href);
      expect(links).toContain(href);
    }
    const related = renderToStaticMarkup(
      createElement(SkillGuideLinks, { currentSlug: skillGuides[0]?.slug ?? '' }),
    );
    expect(related).not.toContain(`href="${skillGuidePath(skillGuides[0]?.slug ?? '')}"`);
  });

  it('ne crée ni guide inconnu ni fausse traduction', async () => {
    const params = Promise.resolve({ slug: 'invented-skill' });
    await expect(GuidePage({ params })).rejects.toThrow(/404/);
    await expect(generateMetadata({ params })).rejects.toThrow(/404/);
    expect(generateStaticParams()).toHaveLength(3);
    expect(new Set(skillGuides.map((guide) => guide.title)).size).toBe(3);
    for (const guide of skillGuides) {
      const path = skillGuidePath(guide.slug);
      expect(matchSharedPage(path)).toBeUndefined();
      expect(localizedHref(path, 'en')).toBe(path);
    }
  });
});
