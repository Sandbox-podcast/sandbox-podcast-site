import type { Entity, Episode, Mention, Story, Topic } from '../domain/schema.ts';
import { compareWeeks } from '../domain/weeks.ts';
import {
  allCharts,
  allEntities,
  allEpisodes,
  allStories,
  allTopics,
  currentRanks,
  findEntity,
  getEntity,
  snapshotsOf,
} from './repository.ts';

/**
 * Le site est un graphe de contenus : entités, classements, épisodes, articles, thèmes.
 * Les liens ne sont jamais saisis deux fois. On les déduit des références déjà présentes dans le contenu
 * (mentions d'épisode, relations d'article, références `[[entity:…]]` dans les textes, voisins de classement).
 */

const REF = /\[\[entity:([a-z0-9-]+)\]\]/g;

function textsOf(story: Story): string[] {
  const texts: string[] = [story.title, story.dek];
  for (const b of story.body) {
    if (
      b.type === 'p' ||
      b.type === 'h2' ||
      b.type === 'h3' ||
      b.type === 'quote' ||
      b.type === 'callout'
    ) {
      texts.push(b.text);
    } else if (b.type === 'list') {
      texts.push(...b.items);
    }
  }
  return texts;
}

/** Entités citées par un article : relations explicites, blocs entité et références dans le texte. */
export function storyEntitySlugs(story: Story): string[] {
  const slugs = new Set<string>();
  for (const r of story.related) if (r.kind === 'entity') slugs.add(r.entity);
  for (const b of story.body) if (b.type === 'entity') slugs.add(b.entity);
  for (const text of textsOf(story)) {
    for (const m of text.matchAll(REF)) if (m[1]) slugs.add(m[1]);
  }
  return [...slugs].filter((s) => findEntity(s));
}

export function storiesForEntity(slug: string): Story[] {
  return allStories().filter((s) => storyEntitySlugs(s).includes(slug));
}

export interface EpisodeMention {
  episode: Episode;
  mentions: Mention[];
}

export function episodesForEntity(slug: string): EpisodeMention[] {
  return allEpisodes()
    .map((episode) => ({ episode, mentions: episode.mentions.filter((m) => m.entity === slug) }))
    .filter((e) => e.mentions.length > 0);
}

/** Concurrents : ceux que l'équipe a choisis, puis les voisins directs dans les classements (rang ±2). */
export function competitorsOf(entity: Entity, limit = 6): Entity[] {
  const picked: Entity[] = [];
  const add = (slug: string): void => {
    if (slug === entity.slug || picked.some((p) => p.slug === slug)) return;
    const found = findEntity(slug);
    if (found) picked.push(found);
  };
  entity.alternatives.forEach(add);
  for (const chart of allCharts()) {
    const last = snapshotsOf(chart.slug).at(-1);
    const me = last?.entries.find((e) => e.entity === entity.slug);
    if (!last || !me) continue;
    for (const e of last.entries) {
      if (e.entity !== entity.slug && Math.abs(e.rank - me.rank) <= 2) add(e.entity);
    }
  }
  return picked.slice(0, limit);
}

/** Entités citées dans un épisode, avec leur place actuelle dans les classements. */
export function entitiesOfEpisode(episode: Episode): Entity[] {
  const seen = new Set<string>();
  const out: Entity[] = [];
  for (const m of episode.mentions) {
    if (m.entity && !seen.has(m.entity)) {
      seen.add(m.entity);
      out.push(getEntity(m.entity));
    }
  }
  return out;
}

export function storiesForEpisode(episode: Episode): Story[] {
  return allStories().filter(
    (s) =>
      s.related.some((r) => r.kind === 'episode' && r.number === episode.number) ||
      storyEntitySlugs(s).some((slug) => episode.mentions.some((m) => m.entity === slug)),
  );
}

export function episodesForStory(story: Story): Episode[] {
  const explicit = story.related.flatMap((r) =>
    r.kind === 'episode' ? allEpisodes().filter((e) => e.number === r.number) : [],
  );
  const implicit = allEpisodes().filter((e) =>
    storyEntitySlugs(story).some((slug) => e.mentions.some((m) => m.entity === slug)),
  );
  return [...new Map([...explicit, ...implicit].map((e) => [e.number, e] as const)).values()].sort(
    (a, b) => b.number - a.number,
  );
}

export function relatedStories(story: Story, limit = 3): Story[] {
  const mine = new Set(storyEntitySlugs(story));
  return allStories()
    .filter((s) => s.slug !== story.slug)
    .map((s) => ({
      story: s,
      score:
        (story.related.some((r) => r.kind === 'story' && r.slug === s.slug) ? 5 : 0) +
        storyEntitySlugs(s).filter((e) => mine.has(e)).length * 2 +
        s.topics.filter((t) => story.topics.includes(t)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.story.publishedAt.localeCompare(a.story.publishedAt))
    .slice(0, limit)
    .map((x) => x.story);
}

/** Classements concernés par un article : explicites, plus ceux où figurent ses entités. */
export function chartsForStory(
  story: Story,
): { slug: string; rank: number | null; entity?: Entity }[] {
  const out = new Map<string, { slug: string; rank: number | null; entity?: Entity }>();
  for (const r of story.related)
    if (r.kind === 'chart') out.set(r.chart, { slug: r.chart, rank: null });
  for (const slug of storyEntitySlugs(story)) {
    for (const cr of currentRanks(slug)) {
      if (!out.has(cr.chart.slug) || out.get(cr.chart.slug)?.rank === null) {
        out.set(cr.chart.slug, { slug: cr.chart.slug, rank: cr.rank, entity: getEntity(slug) });
      }
    }
  }
  return [...out.values()];
}

/** Épisodes qui commentent un classement, ceux qui parlent de la semaine demandée en premier. */
export function episodesForChart(chart: string, week?: string): Episode[] {
  return allEpisodes()
    .filter((e) => e.charts.some((c) => c.chart === chart))
    .sort((a, b) => {
      const wa = week && a.charts.some((c) => c.chart === chart && c.week === week) ? 1 : 0;
      const wb = week && b.charts.some((c) => c.chart === chart && c.week === week) ? 1 : 0;
      return wb - wa || b.number - a.number;
    });
}

/** Articles liés à un classement : relation explicite, bloc embarqué, ou entité du Top actuel. */
export function storiesForChart(chart: string): Story[] {
  const last = snapshotsOf(chart).at(-1);
  const size = allCharts().find((c) => c.slug === chart)?.size ?? 10;
  const top = new Set((last?.entries ?? []).filter((e) => e.rank <= size).map((e) => e.entity));
  return allStories()
    .map((s) => ({
      story: s,
      score:
        (s.related.some((r) => r.kind === 'chart' && r.chart === chart) ? 3 : 0) +
        (s.body.some((b) => b.type === 'chart' && b.chart === chart) ? 2 : 0) +
        (storyEntitySlugs(s).some((e) => top.has(e)) ? 1 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.story.publishedAt.localeCompare(a.story.publishedAt))
    .map((x) => x.story);
}

/** Fil chronologique : épisodes et articles mêlés, du plus récent au plus ancien. */
export type FeedItem =
  { type: 'episode'; at: string; episode: Episode } | { type: 'story'; at: string; story: Story };

export function feed(): FeedItem[] {
  const items: FeedItem[] = [
    ...allEpisodes().map((episode): FeedItem => ({
      type: 'episode',
      at: episode.publishedAt,
      episode,
    })),
    ...allStories().map((story): FeedItem => ({ type: 'story', at: story.publishedAt, story })),
  ];
  return items.sort((a, b) => b.at.localeCompare(a.at));
}

/** Date de la dernière mise à jour d'un classement, pour l'affichage « Dernière mise à jour ». */
export function lastUpdated(): { week: string; publishedAt: string; retrievedAt: string } {
  const latest = allCharts()
    .flatMap((c) => snapshotsOf(c.slug).slice(-1))
    .sort((a, b) => compareWeeks(b.week, a.week))[0];
  if (!latest) throw new Error('Aucun snapshot publié');
  return { week: latest.week, publishedAt: latest.publishedAt, retrievedAt: latest.retrievedAt };
}

export interface TopicStat {
  topic: Topic;
  stories: number;
  episodes: number;
  entities: number;
}

/** Volume de contenu par thème, pour la page d'index. */
export function topicStats(): TopicStat[] {
  return allTopics().map((topic) => ({
    topic,
    stories: allStories().filter((s) => s.topics.includes(topic.slug)).length,
    episodes: allEpisodes().filter((e) => e.topics.includes(topic.slug)).length,
    entities: allEntities().filter((e) => e.topics.includes(topic.slug)).length,
  }));
}
