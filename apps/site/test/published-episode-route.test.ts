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
import TopicsPage, { dynamic as topicsDynamic } from '../src/app/(fr)/topics/page';
import TopicPage, {
  dynamic as topicDynamic,
  dynamicParams as topicDynamicParams,
} from '../src/app/(fr)/topics/[slug]/page';
import { GET as getFeed, dynamic as feedDynamic } from '../src/app/feed.xml/route';
import EpisodePage, {
  dynamicParams,
  generateStaticParams,
} from '../src/app/(fr)/episodes/[number]/page';
import { editableContentSchema } from '../src/domain/admin-content';
import { episodeSchema } from '../src/domain/schema';
import { loadContent, setEditorialOverride } from '../src/lib/load';

describe('épisodes publiés après le build', () => {
  it('rend les vues éditoriales à la requête pour lire la publication Postgres', () => {
    expect(homeDynamic).toBe('force-dynamic');
    expect(topicsDynamic).toBe('force-dynamic');
    expect(topicDynamic).toBe('force-dynamic');
    expect(topicDynamicParams).toBe(true);
    expect(feedDynamic).toBe('force-dynamic');
  });

  it('ouvre la fiche ciblée par le bouton de l’accueil', async () => {
    const buildNumbers = generateStaticParams().map(({ number }) => number);
    const base = loadContent();
    const episode = episodeSchema.parse({
      number: 1,
      title: 'Épisode publié après le build',
      dek: 'Présentation du premier épisode.',
      publishedAt: '2026-10-12T12:00:00.000Z',
      durationSec: 780,
      description: 'Un épisode à découvrir dans la bibliothèque.',
      hosts: ['lou'],
      topics: ['agents'],
      featured: true,
      cover: { tone: 0, kicker: 'Sandbox' },
    });
    const published = editableContentSchema.parse({
      site: base.site,
      hosts: base.hosts,
      topics: base.topics,
      sources: base.sources,
      scoring: base.scoring,
      charts: base.charts,
      entities: base.entities,
      takes: base.takes,
      episodes: [...base.episodes, episode],
      stories: base.stories,
    });

    expect(buildNumbers.includes('1')).toBe(false);
    expect(dynamicParams).toBe(true);
    setEditorialOverride(published);
    try {
      const home = renderToStaticMarkup(await HomePage());
      expect(home).toContain('href="/episodes/1"');
      const detail = renderToStaticMarkup(
        createElement('div', null, await EpisodePage({ params: Promise.resolve({ number: '1' }) })),
      );
      expect(detail).toContain('Épisode publié après le build');

      const topics = renderToStaticMarkup(await TopicsPage());
      expect(topics).toContain('1 épisode');
      const topic = renderToStaticMarkup(
        await TopicPage({ params: Promise.resolve({ slug: 'agents' }) }),
      );
      expect(topic).toContain('Épisode publié après le build');

      const rss = await getFeed();
      expect(rss.status).toBe(200);
      expect(await rss.text()).toContain('Épisode publié après le build');
    } finally {
      setEditorialOverride(undefined);
    }
  });
});
