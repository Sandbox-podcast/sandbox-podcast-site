import { createHash } from 'node:crypto';
import type { EditableContent } from './admin-content.ts';
import { parseInline, type InlineNode } from './markup.ts';
import type { ChartEdition } from './schema.ts';
import {
  translatedBundleSchema,
  type TranslationSourcePack,
  type TranslatedBundle,
} from './content-translation-schema.ts';
export {
  TRANSLATION_LOCALES,
  translationSourcePackSchema,
  translatedBundleSchema,
} from './content-translation-schema.ts';
export type { TranslationSourcePack, TranslatedBundle } from './content-translation-schema.ts';
import { normalizeTranslationKey, type TranslationDictionary } from '../i18n/translation.ts';

export interface TranslationSource {
  source: string;
  context: string;
}

export function translationHash(source: string): string {
  return createHash('sha256').update(normalizeTranslationKey(source)).digest('hex');
}
function collector() {
  const sources = new Map<string, TranslationSource>();
  const add = (value: string | undefined, context: string): void => {
    if (!value) return;
    const source = normalizeTranslationKey(value);
    if (!source || !/\p{L}/u.test(source) || /^(?:https?:\/\/|\/episode-artwork\/)/.test(source))
      return;
    sources.set(source, { source, context });
  };
  const nodes = (items: InlineNode[], context: string): void => {
    for (const node of items) {
      if (node.t === 'text') add(node.v, context);
      if ('c' in node) nodes(node.c, context);
    }
  };
  const prose = (value: string | undefined, context: string): void => {
    add(value, context);
    if (value) nodes(parseInline(value), context);
  };
  return { sources, add, prose };
}

/** Seuls les champs éditoriaux passent au moteur : identités, médias, URLs et mesures restent communs. */
export function editorialTranslationSources(content: EditableContent): TranslationSource[] {
  const { sources, add, prose } = collector();
  for (const field of [
    'tagline',
    'strapline',
    'description',
    'heroEyebrow',
    'heroTitle',
    'heroDek',
    'aboutEyebrow',
    'aboutTitle',
    'aboutIntro',
  ] as const)
    add(content.site[field], `site.${field}`);
  for (const host of content.hosts) {
    add(host.role, `hosts.${host.slug}.role`);
    prose(host.bio, `hosts.${host.slug}.bio`);
  }
  for (const topic of content.topics) {
    add(topic.label, `topics.${topic.slug}.label`);
    prose(topic.description, `topics.${topic.slug}.description`);
  }
  for (const source of content.sources) {
    add(source.label, `sources.${source.id}.label`);
    prose(source.provides, `sources.${source.id}.provides`);
  }
  for (const profile of content.scoring) {
    for (const item of [...profile.metrics, ...profile.derived, ...profile.dimensions]) {
      add(item.label, `scoring.${profile.id}`);
      if ('description' in item) prose(item.description, `scoring.${profile.id}`);
    }
  }
  for (const chart of content.charts) {
    const context = `charts.${chart.slug}`;
    for (const field of ['title', 'short', 'tagline', 'description'] as const)
      prose(chart[field], `${context}.${field}`);
    for (const view of chart.views) add(view.label, `${context}.views`);
    prose(chart.seo.title, `${context}.seo.title`);
    prose(chart.seo.description, `${context}.seo.description`);
    prose(chart.methodology.summary, `${context}.methodology`);
    add(chart.methodology.frequency, `${context}.frequency`);
    for (const source of chart.methodology.sources) prose(source.usage, `${context}.sources`);
    for (const criterion of chart.methodology.criteria) {
      add(criterion.label, context);
      prose(criterion.detail, context);
    }
    for (const limit of chart.methodology.limits) prose(limit, `${context}.limits`);
    for (const change of chart.methodology.changelog) prose(change.note, `${context}.changelog`);
    for (const edition of chart.editions)
      for (const item of chartEditionTranslationSources(edition, context))
        sources.set(item.source, item);
  }
  for (const entity of content.entities) {
    for (const field of ['tagline', 'description', 'category'] as const)
      prose(entity[field], `entities.${entity.slug}.${field}`);
    for (const link of entity.links) add(link.label, `entities.${entity.slug}.links`);
  }
  for (const take of content.takes) prose(take.text, `takes.${take.id}`);
  for (const episode of content.episodes.filter((item) => item.status === 'published')) {
    const context = `episodes.${String(episode.number)}`;
    for (const field of ['title', 'dek', 'description'] as const)
      prose(episode[field], `${context}.${field}`);
    add(episode.cover.kicker, `${context}.cover`);
    for (const guest of episode.guests) add(guest.role, `${context}.guests`);
    for (const chapter of episode.chapters) add(chapter.title, `${context}.chapters`);
    for (const mention of episode.mentions) {
      add(mention.label, `${context}.mentions`);
      prose(mention.note, `${context}.mentions`);
    }
    for (const source of episode.sources) add(source.label, `${context}.sources`);
  }
  for (const story of content.stories) {
    const context = `stories.${story.id ?? story.slug}`;
    prose(story.title, context);
    prose(story.dek, context);
    for (const block of story.body) {
      if ('text' in block) prose(block.text, context);
      if ('title' in block) add(block.title, context);
      if ('cite' in block) add(block.cite, context);
      if (block.type === 'list') for (const item of block.items) prose(item, context);
      if (block.type === 'stat') for (const item of block.items) add(item.label, context);
    }
    for (const source of story.sources) add(source.label, `${context}.sources`);
  }
  return [...sources.values()];
}

export function chartEditionTranslationSources(
  edition: ChartEdition,
  context = `edition.${edition.week}`,
): TranslationSource[] {
  const { sources, prose, add } = collector();
  prose(edition.headline, context);
  prose(edition.monthlyHeadline, context);
  for (const item of edition.watchlist) prose(item.reason, `${context}.watchlist.${item.entity}`);
  for (const item of edition.insights) {
    for (const field of ['whatItIs', 'whyTrending', 'whyMatters', 'sandboxTake'] as const)
      prose(item[field], `${context}.${item.entity}.${field}`);
    for (const label of item.bestFor) add(label, `${context}.${item.entity}.bestFor`);
  }
  return [...sources.values()];
}

export function changedTranslationSources(
  previous: TranslationSource[],
  next: TranslationSource[],
): TranslationSource[] {
  const existing = new Set(previous.map((item) => item.source));
  return next.filter((item) => !existing.has(item.source));
}

export function translationSourcePack(sources: TranslationSource[]): TranslationSourcePack {
  const unique = new Map(sources.map((item) => [normalizeTranslationKey(item.source), item]));
  return {
    version: 1,
    sourceLocale: 'fr-FR',
    sources: [...unique.values()].map((item) => ({
      ...item,
      source: normalizeTranslationKey(item.source),
      sourceHash: translationHash(item.source),
    })),
  };
}

export function missingTranslationSources(
  pack: TranslationSourcePack,
  dictionary: TranslationDictionary,
): TranslationSourcePack['sources'] {
  return pack.sources.filter((item) => {
    const value = Object.hasOwn(dictionary, item.source) ? dictionary[item.source] : undefined;
    return typeof value !== 'string' || !value.trim();
  });
}

function protectedTokens(text: string): string[] {
  return (
    text.match(
      /\{[a-zA-Z][a-zA-Z0-9]*\}|\[\[(?:entity|chart|episode|story):[^\]]+\]\]|`[^`]+`|https:\/\/[^\s)]+|\]\(\/[^)]+\)|\d+/g,
    ) ?? []
  ).sort();
}

export function validateTranslatedBundle(
  pack: TranslationSourcePack,
  value: unknown,
): TranslatedBundle {
  const parsed = translatedBundleSchema.parse(value);
  const sources = new Map(pack.sources.map((item) => [item.sourceHash, item.source]));
  const output: Record<string, string> = {};
  for (const item of parsed.translations) {
    const source = normalizeTranslationKey(item.source);
    if (translationHash(source) !== item.sourceHash || sources.get(item.sourceHash) !== source)
      throw new Error(
        'Un texte source a changé ou est inconnu. Exportez à nouveau les textes depuis l’admin.',
      );
    if (output[item.sourceHash] !== undefined)
      throw new Error('Texte source répété dans le fichier.');
    if (JSON.stringify(protectedTokens(source)) !== JSON.stringify(protectedTokens(item.text)))
      throw new Error('Une traduction a modifié un nombre, un lien ou une référence.');
    if (/<\/?[a-z][^>]*>/i.test(item.text) && !/<\/?[a-z][^>]*>/i.test(source))
      throw new Error('La réponse contient du HTML inattendu.');
    output[item.sourceHash] = item.text;
  }
  return parsed;
}

export function bundleDictionary(bundle: TranslatedBundle): TranslationDictionary {
  return Object.fromEntries(
    bundle.translations.map((item) => [normalizeTranslationKey(item.source), item.text]),
  );
}
