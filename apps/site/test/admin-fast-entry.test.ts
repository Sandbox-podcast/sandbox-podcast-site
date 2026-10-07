import { describe, expect, it } from 'vitest';
import {
  appendChartEntity,
  insertChartTake,
  nameFromProjectUrl,
  slugFromLabel,
  sourceFromFields,
  topicFromFields,
} from '../src/domain/admin-fast-entry.ts';
import { editableContentSchema } from '../src/domain/admin-content.ts';
import { applyChartMarkdown, serializeChartMarkdown } from '../src/domain/chart-markdown.ts';
import { loadContent } from '../src/lib/load.ts';

const now = '2026-10-07T12:00:00.000Z';

function fixture() {
  const source = loadContent();
  const { snapshots, ...editorial } = source;
  return {
    content: editableContentSchema.parse(editorial),
    ranked: snapshots['github']?.at(-1)?.entries.map((entry) => entry.entity) ?? [],
  };
}

describe('saisie rapide du backoffice', () => {
  it('génère un identifiant stable sans demander du JSON', () => {
    expect(slugFromLabel('IA & Développement')).toBe('ia-developpement');
    expect(nameFromProjectUrl('https://github.com/acme/nouveau-projet')).toBe('Nouveau projet');
    expect(
      topicFromFields({ label: 'IA & Développement', description: 'Outils et usages.' }),
    ).toMatchObject({ slug: 'ia-developpement', label: 'IA & Développement' });
    expect(
      sourceFromFields({
        label: 'Site de référence',
        url: 'https://example.com',
        provides: 'Documentation publique',
        kind: 'editorial',
        status: 'manual',
      }),
    ).toMatchObject({ id: 'site-de-reference', status: 'manual' });
  });

  it('insère un avis au bon endroit et permet de sauver le document', () => {
    const { content, ranked } = fixture();
    const markdown = serializeChartMarkdown(content, 'github', ranked);
    const updated = insertChartTake(markdown, {
      entity: 'claude-code',
      week: '2026-W41',
      host: 'lou',
      text: 'Un nouvel avis signé.',
    });
    expect(updated.indexOf('Un nouvel avis signé.')).toBeLessThan(updated.indexOf('### vLLM'));
    const next = applyChartMarkdown(updated, content, 'github', ranked, now);
    expect(next.takes.some((take) => take.text === 'Un nouvel avis signé.')).toBe(true);
  });

  it('crée une fiche à partir de son lien et refuse les doublons', () => {
    const { content, ranked } = fixture();
    const markdown = serializeChartMarkdown(content, 'github', ranked);
    const input = {
      name: 'Nouveau Projet',
      category: 'Outil de dev',
      tagline: 'Un outil à suivre cette semaine',
      url: 'https://github.com/acme/nouveau-projet',
    };
    const created = appendChartEntity(markdown, input);
    expect(created.slug).toBe('nouveau-projet');
    const next = applyChartMarkdown(created.markdown, content, 'github', ranked, now);
    expect(next.entities.find((entity) => entity.slug === 'nouveau-projet')).toMatchObject({
      org: 'acme',
      tagline: input.tagline,
      editorialCharts: ['github'],
    });
    expect(serializeChartMarkdown(next, 'github', ranked)).toContain(
      '### Nouveau Projet {nouveau-projet}',
    );
    expect(() => appendChartEntity(created.markdown, input)).toThrow(/déjà/);
    expect(() => appendChartEntity(markdown, { ...input, url: 'http://example.com' })).toThrow();
  });
});
