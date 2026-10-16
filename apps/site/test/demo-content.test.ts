import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { hasDemoEntityHistory, hasDemoSnapshots } from '../src/domain/demo-content.ts';
import { snapshotSchema } from '../src/domain/schema.ts';
import { EntityScreen } from '../src/components/entity-screen.tsx';
import { allEntities } from '../src/lib/repository.ts';
import ProjectPage, {
  generateMetadata as projectMetadata,
} from '../src/app/(fr)/projects/[slug]/page';
import ModelPage, { generateMetadata as modelMetadata } from '../src/app/(fr)/models/[slug]/page';
import MovePage, {
  generateMetadata as moveMetadata,
  generateStaticParams as moveParams,
} from '../src/app/(fr)/moves/[chart]/[week]/[entity]/page';

vi.mock('../src/lib/og', () => ({
  OG_SIZE: { width: 1200, height: 630 },
  OG_TYPE: 'image/png',
  demoCard: vi.fn(async (title: string) => new Response(`DEMONSTRATION ${title}`)),
  entityCard: vi.fn(),
  moveCard: vi.fn(),
}));
import ProjectImage from '../src/app/(fr)/projects/[slug]/opengraph-image';
import ModelImage from '../src/app/(fr)/models/[slug]/opengraph-image';
import MoveImage from '../src/app/(fr)/moves/[chart]/[week]/[entity]/opengraph-image';
import { entityCard, moveCard } from '../src/lib/og';

function snapshot(provenance: 'mock' | 'auto', entity = 'sample') {
  return snapshotSchema.parse({
    chart: 'github',
    week: '2026-W41',
    provenance,
    publishedAt: '2026-10-06T12:00:00Z',
    retrievedAt: '2026-10-06T11:00:00Z',
    entries: [{ entity, rank: 1, score: 95, dimensions: {}, metrics: { stars: 123456 } }],
  });
}

function expectNeutral(html: string) {
  expect(html).toContain('Ancienne page de démonstration');
  expect(html).toContain('simulés');
  expect(html).toContain('href="/charts"');
  expect(html).toContain('href="/podcast"');
  expect(html).not.toContain('<svg');
  expect(html).not.toContain('application/ld+json');
  expect(html).not.toContain('Current ranking');
  expect(html).not.toContain('Carte de partage');
  expect(html).not.toContain('twitter.com/intent');
}

describe('provenance des anciennes pages', () => {
  it('détecte aussi une ancienne mesure simulée dans un historique devenu réel', () => {
    expect(hasDemoSnapshots([snapshot('auto')])).toBe(false);
    expect(hasDemoSnapshots([snapshot('mock'), snapshot('auto')])).toBe(true);
    expect(hasDemoEntityHistory({ github: [snapshot('mock'), snapshot('auto')] }, 'sample')).toBe(
      true,
    );
    expect(
      hasDemoEntityHistory({ github: [snapshot('mock', 'other'), snapshot('auto')] }, 'sample'),
    ).toBe(false);
    expect(hasDemoEntityHistory({}, 'sample')).toBe(false);
  });

  it('neutralise toutes les fiches de fixtures au lieu de publier leurs mesures et leurs avis', async () => {
    const entities = allEntities();
    expect(entities.length).toBeGreaterThan(0);
    for (const entity of entities) {
      expectNeutral(renderToStaticMarkup(createElement(EntityScreen, { slug: entity.slug })));
      const params = Promise.resolve({ slug: entity.slug });
      if (entity.kind === 'project') {
        expectNeutral(renderToStaticMarkup(await ProjectPage({ params })));
        expect((await projectMetadata({ params })).robots).toMatchObject({ index: false });
      } else if (entity.kind === 'model') {
        expectNeutral(renderToStaticMarkup(await ModelPage({ params })));
        expect((await modelMetadata({ params })).robots).toMatchObject({ index: false });
      }
    }
  });

  it('neutralise chaque carte de mouvement de démonstration et conserve son noindex', async () => {
    const moves = moveParams();
    expect(moves.length).toBeGreaterThan(0);
    for (const move of moves) {
      const props = { params: Promise.resolve(move) };
      expectNeutral(renderToStaticMarkup(await MovePage(props)));
      expect((await moveMetadata(props)).robots).toMatchObject({ index: false });
    }
  });

  it("retire aussi les rangs des trois familles d'images de partage", async () => {
    const project = allEntities().find((entity) => entity.kind === 'project');
    const model = allEntities().find((entity) => entity.kind === 'model');
    const move = moveParams()[0];
    if (!project || !model || !move) throw new Error('Fixtures de partage manquantes');
    for (const response of [
      await ProjectImage({ params: Promise.resolve({ slug: project.slug }) }),
      await ModelImage({ params: Promise.resolve({ slug: model.slug }) }),
      await MoveImage({ params: Promise.resolve(move) }),
    ])
      expect(await response.text()).toMatch(/^DEMONSTRATION /);
    expect(entityCard).not.toHaveBeenCalled();
    expect(moveCard).not.toHaveBeenCalled();
  });
});
