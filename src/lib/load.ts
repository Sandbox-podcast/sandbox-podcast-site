import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import {
  chartSchema,
  entitySchema,
  episodeSchema,
  hostSchema,
  scoringProfileSchema,
  siteSettingsSchema,
  snapshotSchema,
  sourceSchema,
  storySchema,
  takeSchema,
  topicSchema,
  type ChartDef,
  type Entity,
  type Episode,
  type Host,
  type ScoringProfile,
  type SiteSettings,
  type Snapshot,
  type Source,
  type Story,
  type Take,
  type Topic,
} from '../domain/schema.ts';
import { compareWeeks } from '../domain/weeks.ts';
import { setSiteSettingsOverride } from '../config/site.ts';

let editorialOverride: Omit<Content, 'snapshots'> | undefined;
let editorialVersion = 0;

/** Tout le contenu du site, lu depuis `content/` (éditorial) et `data/` (snapshots écrits par le pipeline). */
export interface Content {
  site: SiteSettings;
  hosts: Host[];
  topics: Topic[];
  sources: Source[];
  scoring: ScoringProfile[];
  charts: ChartDef[];
  entities: Entity[];
  takes: Take[];
  episodes: Episode[];
  stories: Story[];
  /** Snapshots par classement, triés par semaine croissante. */
  snapshots: Record<string, Snapshot[]>;
}

/** Appelée côté serveur avant le rendu ISR lorsqu'une version publiée existe. */
export function setEditorialOverride(value: Omit<Content, 'snapshots'> | undefined): void {
  if (editorialOverride === value) return;
  editorialOverride = value;
  setSiteSettingsOverride(value?.site);
  editorialVersion += 1;
}

export function contentVersion(): number {
  return editorialVersion;
}

export class ContentError extends Error {
  readonly file: string;
  readonly issues: string[];

  constructor(file: string, issues: string[]) {
    super(`${file}\n  - ${issues.join('\n  - ')}`);
    this.name = 'ContentError';
    this.file = file;
    this.issues = issues;
  }
}

function parseFile<T>(file: string, schema: z.ZodType<T>): T {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new ContentError(file, [error instanceof Error ? error.message : 'JSON illisible']);
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ContentError(
      file,
      result.error.issues.map((i) => `${i.path.join('.') || '(racine)'} : ${i.message}`),
    );
  }
  return result.data;
}

const jsonFiles = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .map((f) => join(dir, f))
    : [];

export function loadContent(root: string = process.env['SITE_ROOT'] ?? process.cwd()): Content {
  const content = join(root, 'content');
  const data = join(root, 'data', 'snapshots');

  const collect = <T>(dir: string, schema: z.ZodType<T>): T[] =>
    jsonFiles(dir).map((file) => parseFile(file, schema));
  const arrays = <T>(dir: string, schema: z.ZodType<T>): T[] =>
    jsonFiles(dir).flatMap((file) => parseFile(file, z.array(schema)));

  const charts = collect(join(content, 'charts'), chartSchema);
  const snapshots: Record<string, Snapshot[]> = {};
  for (const chart of charts) {
    const dir = join(data, chart.slug);
    snapshots[chart.slug] = collect(dir, snapshotSchema).sort((a, b) =>
      compareWeeks(a.week, b.week),
    );
  }

  const base: Omit<Content, 'snapshots'> = {
    site: parseFile(join(content, 'site.json'), siteSettingsSchema),
    hosts: parseFile(join(content, 'hosts.json'), z.array(hostSchema)),
    topics: parseFile(join(content, 'topics.json'), z.array(topicSchema)),
    sources: parseFile(join(content, 'sources.json'), z.array(sourceSchema)),
    scoring: collect(join(content, 'scoring'), scoringProfileSchema),
    charts,
    entities: arrays(join(content, 'entities'), entitySchema),
    takes: arrays(join(content, 'takes'), takeSchema),
    episodes: collect(join(content, 'episodes'), episodeSchema).sort((a, b) => b.number - a.number),
    stories: collect(join(content, 'stories'), storySchema).sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt),
    ),
  };
  return {
    ...base,
    ...(editorialOverride ?? {}),
    snapshots,
  };
}
