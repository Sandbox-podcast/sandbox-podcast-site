import { describe, expect, it } from 'vitest';
import { editableContentSchema } from '../src/domain/admin-content.ts';
import { loadContent } from '../src/lib/load.ts';
import { buildEditableContent, flattenEditableContent } from '../src/lib/editorial-records.ts';

function editableFixture() {
  const content = loadContent();
  return editableContentSchema.parse({
    site: content.site,
    hosts: content.hosts,
    topics: content.topics,
    sources: content.sources,
    scoring: content.scoring,
    charts: content.charts,
    entities: content.entities,
    takes: content.takes,
    episodes: content.episodes,
    stories: content.stories,
  });
}

describe('lignes éditoriales Postgres', () => {
  it('décompose et recompose le contenu sans perte', () => {
    const content = editableFixture();
    const rows = flattenEditableContent(content);
    const storyRows = rows.filter((row) => row.collection === 'stories');
    expect(storyRows.length).toBe(content.stories.length);
    const rebuilt = buildEditableContent(rows);
    expect(rebuilt).toEqual(content);
  });

  it('utilise l’identifiant stable des articles pour la clé', () => {
    const content = editableFixture();
    const first = content.stories[0];
    if (!first) throw new Error('fixture');
    const withId = {
      ...content,
      stories: [
        { ...first, id: 'story-stable-id', slug: `${first.slug}-revise` },
        ...content.stories.slice(1),
      ],
    };
    const rows = flattenEditableContent(withId);
    expect(
      rows.some((row) => row.collection === 'stories' && row.entityKey === 'story-stable-id'),
    ).toBe(true);
  });
});
