import { describe, expect, it } from 'vitest';
import { computeMovements } from '../src/domain/movements.ts';
import { loadContent } from '../src/lib/load.ts';
import { validateContent } from '../src/lib/validate.ts';
import { mockConnector, mockPublishedAt } from '../src/pipeline/mock/index.ts';
import { assertAppendOnly, runWeek } from '../src/pipeline/run-week.ts';

const content = loadContent();

describe('contenu du site', () => {
  it('passe la validation : schémas, références, continuité des snapshots', () => {
    const errors = validateContent(content).filter((i) => i.level === 'error');
    expect(errors).toEqual([]);
  });

  it('contient de quoi comprendre le produit : 4 classements de 10, 3 épisodes, plusieurs articles', () => {
    expect(content.charts).toHaveLength(4);
    for (const chart of content.charts) {
      const last = content.snapshots[chart.slug]?.at(-1);
      expect(last?.week).toBe('2026-W41');
      expect(last?.entries.length).toBeGreaterThanOrEqual(chart.size);
    }
    expect(content.episodes).toHaveLength(3);
    expect(content.stories.length).toBeGreaterThanOrEqual(8);
  });

  it('montre tous les types de mouvement dans le dernier relevé', () => {
    const kinds = new Set<string>();
    for (const chart of content.charts) {
      const h = content.snapshots[chart.slug] ?? [];
      const { moves, out } = computeMovements(h, h.length - 1, chart.size);
      moves.forEach((m) => kinds.add(m.kind));
      if (out.length > 0) kinds.add('out');
    }
    for (const kind of ['up', 'down', 'stable', 'new', 're', 'out']) expect(kinds).toContain(kind);
  });

  it('marque toute donnée de démonstration comme telle', () => {
    for (const list of Object.values(content.snapshots)) {
      for (const snap of list) expect(snap.provenance).toBe('mock');
    }
  });

  it('garde les articles sans HTML brut : seuls des blocs typés sont acceptés', () => {
    for (const story of content.stories) {
      for (const block of story.body) expect(typeof block.type).toBe('string');
    }
  });
});

describe('mise à jour hebdomadaire', () => {
  const chart = content.charts.find((c) => c.slug === 'ai-models');
  const profile = content.scoring.find((p) => p.id === chart?.scoring);
  if (!chart || !profile) throw new Error('fixture');

  it('rejoue une semaine à l’identique : le snapshot publié est reproductible', async () => {
    const result = await runWeek({
      chart,
      profile,
      entities: content.entities,
      week: '2026-W41',
      connector: mockConnector,
      publishedAt: mockPublishedAt('2026-W41'),
    });
    const stored = content.snapshots['ai-models']?.find((s) => s.week === '2026-W41');
    expect(result.snapshot).toEqual(stored);
  });

  it('refuse de réécrire un snapshot déjà publié', () => {
    expect(() => {
      assertAppendOnly(['2026-W40', '2026-W41'], '2026-W41');
    }).toThrow(/ne se modifie pas/);
    expect(() => {
      assertAppendOnly(['2026-W40'], '2026-W41');
    }).not.toThrow();
  });

  it('refuse de publier un classement sans assez de candidats', async () => {
    await expect(
      runWeek({
        chart,
        profile,
        entities: [],
        week: '2026-W41',
        connector: mockConnector,
        publishedAt: mockPublishedAt('2026-W41'),
      }),
    ).rejects.toThrow(/non publiable/);
  });
});
