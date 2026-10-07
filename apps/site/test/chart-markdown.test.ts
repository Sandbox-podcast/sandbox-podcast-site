import { describe, expect, it } from 'vitest';
import { editableContentSchema } from '../src/domain/admin-content.ts';
import { applyChartMarkdown, serializeChartMarkdown } from '../src/domain/chart-markdown.ts';
import { loadContent } from '../src/lib/load.ts';

const now = '2026-10-07T12:00:00.000Z';

function fixture() {
  const source = loadContent();
  const { snapshots, ...editorial } = source;
  const content = editableContentSchema.parse(editorial);
  const ranked = snapshots['github']?.at(-1)?.entries.map((entry) => entry.entity) ?? [];
  return { content, ranked };
}

describe('éditeur Markdown des classements', () => {
  it('regroupe classement, fiches et avis dans un document sans modifier les scores', () => {
    const { content, ranked } = fixture();
    const markdown = serializeChartMarkdown(content, 'github', ranked);
    expect(markdown).toContain('# GitHub Top 10');
    expect(markdown).toContain('### Claude Code {claude-code}');
    expect(markdown).toContain('#### Avis {gh-w41-claude-code}');
    expect(markdown).not.toContain('"entries"');

    const next = applyChartMarkdown(markdown, content, 'github', ranked, now);
    expect(next.charts[0]?.title).toBe(content.charts[0]?.title);
    expect(next.entities.length).toBe(content.entities.length);
    expect(next.takes.length).toBe(content.takes.length);
    expect(next.takes.find((take) => take.id === 'gh-w41-claude-code')?.text).toBe(
      content.takes.find((take) => take.id === 'gh-w41-claude-code')?.text,
    );
  });

  it('enregistre les textes éditoriaux depuis le Markdown', () => {
    const { content, ranked } = fixture();
    const markdown = serializeChartMarkdown(content, 'github', ranked)
      .replace('# GitHub Top 10', '# GitHub cette semaine')
      .replace('### Claude Code {claude-code}', '### Claude Code CLI {claude-code}')
      .replace('Premier #1 de Claude Code ici.', 'Notre nouveau numéro un.');
    const next = applyChartMarkdown(markdown, content, 'github', ranked, now);
    expect(next.charts.find((chart) => chart.slug === 'github')?.title).toBe(
      'GitHub cette semaine',
    );
    expect(next.entities.find((entity) => entity.slug === 'claude-code')?.name).toBe(
      'Claude Code CLI',
    );
    expect(next.takes.find((take) => take.id === 'gh-w41-claude-code')?.text).toContain(
      'Notre nouveau numéro un.',
    );
  });

  it('permet d’ajouter une fiche et un avis dans le même document', () => {
    const { content, ranked } = fixture();
    const markdown = `${serializeChartMarkdown(content, 'github', ranked).replace(
      '#### Avis {gh-w41-claude-code}',
      '#### Avis {nouveau} · 2026-W41 · lou\nNotre lecture de la semaine.\n\n#### Avis {gh-w41-claude-code}',
    )}\n### Nouveau projet {nouveau-projet}\n- Catégorie : Outil\n- Accroche : Un outil à suivre\n- Lien (site) : [Site officiel](https://example.com)\n\n**Description**\nPrésentation de ce nouveau projet.\n`;
    const next = applyChartMarkdown(markdown, content, 'github', ranked, now);
    expect(next.entities.some((entity) => entity.slug === 'nouveau-projet')).toBe(true);
    expect(next.takes.some((take) => take.id === 'avis-github-2026-w41-claude-code-lou')).toBe(
      true,
    );
  });

  it('refuse la suppression implicite d’une fiche classée ou d’un avis', () => {
    const { content, ranked } = fixture();
    const markdown = serializeChartMarkdown(content, 'github', ranked);
    const withoutEntity = markdown.replace(/### Claude Code \{claude-code\}[\s\S]*?(?=### |$)/, '');
    expect(() => applyChartMarkdown(withoutEntity, content, 'github', ranked, now)).toThrow(
      /Markdown du classement/,
    );
    const withoutTake = markdown.replace(/#### Avis \{gh-w41-claude-code\}[^\n]*\n[^\n]+/, '');
    expect(() => applyChartMarkdown(withoutTake, content, 'github', ranked, now)).toThrow(
      /avis gh-w41-claude-code manque/,
    );
  });
});
