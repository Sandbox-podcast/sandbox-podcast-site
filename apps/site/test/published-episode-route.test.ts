import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/lib/admin-persistence', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/admin-persistence')>();
  return {
    ...actual,
    preparePublishedEditorialContent: vi.fn(async () => undefined),
  };
});
import HomePage, { dynamic as homeDynamic } from '../src/app/(fr)/page';
import AboutPage, { dynamic as aboutDynamic } from '../src/app/(fr)/about/page';
import TopicsPage, { dynamic as topicsDynamic } from '../src/app/(fr)/topics/page';
import TopicPage, {
  dynamic as topicDynamic,
  dynamicParams as topicDynamicParams,
} from '../src/app/(fr)/topics/[slug]/page';
import { GET as getFeed, dynamic as feedDynamic } from '../src/app/feed.xml/route';
import sitemap, { dynamic as sitemapDynamic } from '../src/app/sitemap';
import EpisodePage, {
  dynamic as episodeDynamic,
  dynamicParams,
} from '../src/app/(fr)/episodes/[number]/page';
import { editableContentSchema } from '../src/domain/admin-content';
import { episodeSchema } from '../src/domain/schema';
import { loadContent, setEditorialOverride } from '../src/lib/load';

describe('épisodes publiés après le build', () => {
  it('rend les vues éditoriales à la requête pour lire la publication Postgres', () => {
    expect(homeDynamic).toBe('force-dynamic');
    expect(aboutDynamic).toBe('force-dynamic');
    expect(topicsDynamic).toBe('force-dynamic');
    expect(topicDynamic).toBe('force-dynamic');
    expect(topicDynamicParams).toBe(true);
    expect(feedDynamic).toBe('force-dynamic');
    expect(episodeDynamic).toBe('force-dynamic');
    expect(sitemapDynamic).toBe('force-dynamic');
  });

  it('ouvre la fiche ciblée par le bouton de l’accueil', async () => {
    const base = loadContent();
    const episode = episodeSchema.parse({
      number: 1,
      title: 'Épisode publié après le build',
      dek: 'Présentation du premier épisode Sandbox et de ses ressources pour mieux comprendre les outils IA.',
      publishedAt: '2026-10-12T12:00:00.000Z',
      durationSec: 780,
      description:
        'Un épisode à découvrir dans la bibliothèque.\n\n0:00 Intro\n1:17:41 Conclusion\n[Dify](https://github.com/langgenius/dify)',
      hosts: ['lou'],
      topics: ['agents'],
      platforms: { youtubeId: 'GgSiPkADCz4' },
      featured: true,
      cover: { tone: 0, kicker: 'Sandbox' },
    });
    const published = editableContentSchema.parse({
      site: { ...base.site, aboutTitle: 'Équipe publiée après le build' },
      hosts: base.hosts.map((host) =>
        host.slug === 'loic'
          ? { ...host, socials: { ...host.socials, github: 'https://github.com/azerothl' } }
          : host,
      ),
      topics: base.topics,
      sources: base.sources,
      scoring: base.scoring,
      charts: base.charts,
      entities: base.entities,
      takes: base.takes,
      episodes: [...base.episodes, episode],
      stories: base.stories,
    });

    expect(dynamicParams).toBe(true);
    setEditorialOverride(published);
    try {
      const home = renderToStaticMarkup(await HomePage());
      expect(home).toContain('href="/episodes/1"');
      expect(home).not.toContain('Les classements');
      expect(home).not.toContain('ranking-shelf');
      expect(home).not.toContain('ranking-mini-grid');
      const detail = renderToStaticMarkup(
        createElement('div', null, await EpisodePage({ params: Promise.resolve({ number: '1' }) })),
      );
      expect(detail).toContain('Épisode publié après le build');
      expect(detail).toContain('https://github.com/langgenius/dify');
      expect(detail).toContain('Dify');
      expect(detail).toContain('Conclusion');
      expect(detail).not.toContain('13 min');
      const about = renderToStaticMarkup(await AboutPage());
      expect(about).toContain('Équipe publiée après le build');
      expect(about).toContain('aria-label="Profils de Loïc"');
      expect(about).toContain('href="https://github.com/azerothl"');
      expect(about.includes('Équipe Sandbox')).toBe(false);

      const topics = renderToStaticMarkup(await TopicsPage());
      expect(topics).toContain('1 épisode');
      const topic = renderToStaticMarkup(
        await TopicPage({ params: Promise.resolve({ slug: 'agents' }) }),
      );
      expect(topic).toContain('Épisode publié après le build');

      const rss = await getFeed();
      expect(rss.status).toBe(200);
      expect(await rss.text()).toContain('Épisode publié après le build');
      const sitemapEntries = await sitemap();
      expect(sitemapEntries.some((entry) => entry.url.endsWith('/episodes/1'))).toBe(true);
    } finally {
      setEditorialOverride(undefined);
    }
  });
});
