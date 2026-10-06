import {
  chartSchema,
  entitySchema,
  episodeSchema,
  storySchema,
  takeSchema,
  type ChartDef,
  type Entity,
  type EntityKind,
  type Episode,
  type Story,
  type StoryType,
  type Take,
} from '../domain/schema.ts';

/**
 * Squelettes de contenu pour `scripts/content-new.ts`. Chaque squelette est validé par le schéma avant d'être écrit :
 * on ne peut pas créer un fichier que `content:check` refuserait. Les textes « À compléter » sont volontairement
 * visibles pour que rien ne parte en production sans avoir été relu.
 */
export const TODO = 'À compléter';

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function newEpisode(
  existing: readonly Episode[],
  now: Date,
  hosts: readonly string[],
): Episode {
  const number = existing.reduce((max, e) => Math.max(max, e.number), 0) + 1;
  return episodeSchema.parse({
    number,
    title: TODO,
    dek: TODO,
    publishedAt: now.toISOString(),
    durationSec: 3600,
    description: TODO,
    hosts: [...hosts],
    chapters: [{ at: 0, title: 'Intro' }],
    mentions: [],
    sources: [],
    platforms: {},
    charts: [],
    cover: { tone: number % 7, kicker: `Épisode ${String(number)}` },
  });
}

export function newStory(type: StoryType, title: string, author: string, now: Date): Story {
  const slug = slugify(title);
  if (!slug) throw new Error('Titre vide : impossible de fabriquer un slug.');
  return storySchema.parse({
    slug,
    type,
    title,
    dek: TODO,
    publishedAt: now.toISOString(),
    author,
    topics: [],
    featured: false,
    related: [],
    body: [{ type: 'p', text: TODO }],
    sources: [],
  });
}

export function newEntity(kind: EntityKind, slug: string, name: string, url: string): Entity {
  const github = /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/?$/.exec(url);
  return entitySchema.parse({
    slug,
    kind,
    name,
    tagline: TODO,
    description: TODO,
    category: TODO,
    topics: [],
    links: [{ kind: github ? 'github' : 'site', label: github?.[1] ?? name, url }],
    alternatives: [],
    mark: { glyph: name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || 'XX', tone: 0 },
    ...(github?.[1] ? { github: { repo: github[1] } } : {}),
    ...(kind === 'model' ? { openWeights: false } : {}),
  });
}

export function newTake(input: {
  chart: string;
  week: string;
  entity: string;
  host: string;
  text: string;
  now: Date;
}): Take {
  return takeSchema.parse({
    id: slugify(`${input.chart}-${input.week}-${input.entity}-${input.host}`),
    entity: input.entity,
    chart: input.chart,
    week: input.week,
    host: input.host,
    text: input.text,
    publishedAt: input.now.toISOString(),
  });
}

/** Un nouveau classement part d'un classement existant : on change l'identité, on garde la structure. */
export function newChart(template: ChartDef, slug: string, title: string): ChartDef {
  return chartSchema.parse({
    ...template,
    slug,
    title,
    short: title.replace(/\s*Top\s*\d+\s*$/i, '') || title,
    code: slug.slice(0, 2).toUpperCase(),
    tagline: TODO,
    description: TODO,
    seo: { title, description: TODO, keywords: [] },
    methodology: {
      ...template.methodology,
      summary: TODO,
      changelog: [],
    },
  });
}
