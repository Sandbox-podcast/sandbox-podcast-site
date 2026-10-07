import { editableContentSchema, type EditableContent } from '../domain/admin-content.ts';

export type EditorialCollection =
  | 'site'
  | 'hosts'
  | 'topics'
  | 'sources'
  | 'scoring'
  | 'charts'
  | 'entities'
  | 'takes'
  | 'episodes'
  | 'stories';

export interface EditorialRecordRow {
  collection: EditorialCollection;
  entityKey: string;
  ordinal: number;
  payload: unknown;
}

const collectionKeys: Record<Exclude<EditorialCollection, 'site'>, keyof EditableContent> = {
  hosts: 'hosts',
  topics: 'topics',
  sources: 'sources',
  scoring: 'scoring',
  charts: 'charts',
  entities: 'entities',
  takes: 'takes',
  episodes: 'episodes',
  stories: 'stories',
};

function storyKey(item: EditableContent['stories'][number]): string {
  const record = item as Record<string, unknown>;
  const id = record['id'];
  if (typeof id === 'string' && id.length > 0) return id;
  return item.slug;
}

function entityKeyForItem(collection: Exclude<EditorialCollection, 'site'>, item: object): string {
  const record = item as Record<string, unknown>;
  switch (collection) {
    case 'hosts':
    case 'topics':
    case 'charts':
    case 'entities':
      return String(record['slug']);
    case 'sources':
    case 'scoring':
    case 'takes':
      return String(record['id']);
    case 'episodes':
      return String(record['number']);
    case 'stories':
      return storyKey(item as EditableContent['stories'][number]);
    default:
      throw new Error('Collection éditoriale inconnue.');
  }
}

/** Décompose le contenu éditable en lignes Postgres (une entité = une ligne). */
export function flattenEditableContent(content: EditableContent): EditorialRecordRow[] {
  const rows: EditorialRecordRow[] = [
    { collection: 'site', entityKey: '_', ordinal: 0, payload: content.site },
  ];
  for (const collection of Object.keys(collectionKeys) as Exclude<EditorialCollection, 'site'>[]) {
    const items = content[collectionKeys[collection]] as object[];
    items.forEach((item, index) => {
      rows.push({
        collection,
        entityKey: entityKeyForItem(collection, item),
        ordinal: index,
        payload: item,
      });
    });
  }
  return rows;
}

const emptyArrays = (): Omit<EditableContent, 'site'> => ({
  hosts: [],
  topics: [],
  sources: [],
  scoring: [],
  charts: [],
  entities: [],
  takes: [],
  episodes: [],
  stories: [],
});

/** Recompose le contenu éditable à partir des lignes d’une couche. */
export function buildEditableContent(rows: EditorialRecordRow[]): EditableContent | undefined {
  if (rows.length === 0) return undefined;
  const ordered = [...rows].sort((a, b) => {
    if (a.collection !== b.collection) return a.collection.localeCompare(b.collection);
    return a.ordinal - b.ordinal;
  });
  const base = emptyArrays();
  let site: EditableContent['site'] | undefined;
  for (const row of ordered) {
    switch (row.collection) {
      case 'site':
        site = row.payload as EditableContent['site'];
        break;
      case 'hosts':
        base.hosts.push(row.payload as EditableContent['hosts'][number]);
        break;
      case 'topics':
        base.topics.push(row.payload as EditableContent['topics'][number]);
        break;
      case 'sources':
        base.sources.push(row.payload as EditableContent['sources'][number]);
        break;
      case 'scoring':
        base.scoring.push(row.payload as EditableContent['scoring'][number]);
        break;
      case 'charts':
        base.charts.push(row.payload as EditableContent['charts'][number]);
        break;
      case 'entities':
        base.entities.push(row.payload as EditableContent['entities'][number]);
        break;
      case 'takes':
        base.takes.push(row.payload as EditableContent['takes'][number]);
        break;
      case 'episodes':
        base.episodes.push(row.payload as EditableContent['episodes'][number]);
        break;
      case 'stories':
        base.stories.push(row.payload as EditableContent['stories'][number]);
        break;
      default:
        throw new Error('Collection éditoriale inconnue.');
    }
  }
  if (!site) return undefined;
  const merged = { site, ...base };
  return editableContentSchema.parse({
    ...merged,
    episodes: merged.episodes.toSorted((a, b) => b.number - a.number),
    stories: merged.stories.toSorted((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
  });
}
