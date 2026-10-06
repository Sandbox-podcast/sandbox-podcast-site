import { z } from 'zod';
import {
  chartSchema,
  entitySchema,
  episodeSchema,
  hostSchema,
  scoringProfileSchema,
  siteSettingsSchema,
  sourceSchema,
  storySchema,
  takeSchema,
  topicSchema,
} from './schema.ts';

/** Contenu modifiable. Les snapshots restent dans Git et ne passent jamais par le backoffice. */
export const editableContentSchema = z
  .object({
    site: siteSettingsSchema,
    hosts: z.array(hostSchema),
    topics: z.array(topicSchema),
    sources: z.array(sourceSchema),
    scoring: z.array(scoringProfileSchema),
    charts: z.array(chartSchema),
    entities: z.array(entitySchema),
    takes: z.array(takeSchema),
    episodes: z.array(episodeSchema),
    stories: z.array(storySchema),
  })
  .strict();

export type EditableContent = z.infer<typeof editableContentSchema>;

const stableIdentifiers = {
  hosts: 'slug',
  topics: 'slug',
  sources: 'id',
  scoring: 'id',
  charts: 'slug',
  entities: 'slug',
  takes: 'id',
  episodes: 'number',
  stories: 'id',
} as const;

/** Refuse la suppression d’une entrée existante ; le backoffice ne réécrit pas les snapshots. */
export function assertNoEditorialRemovals(current: EditableContent, next: EditableContent): void {
  for (const key of Object.keys(stableIdentifiers) as (keyof typeof stableIdentifiers)[]) {
    const field = stableIdentifiers[key];
    const identity = (item: object): string => {
      const record = item as Record<string, unknown>;
      const value = key === 'stories' ? (record['id'] ?? record['slug']) : record[field];
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return value.toString();
      return 'undefined';
    };
    const incoming = new Set(next[key].map(identity));
    const removed = current[key].filter((item) => !incoming.has(identity(item)));
    if (removed.length > 0) {
      throw new Error(`Suppression refusée dans « ${key} » : le contenu existant est conservé.`);
    }
  }
}

export const adminWriteSchema = z.object({
  action: z.enum(['draft', 'publish']),
  content: editableContentSchema,
  expectedDraftEtag: z.string().nullable(),
});
