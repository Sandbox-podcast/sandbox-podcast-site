import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EpisodePage from '../src/app/(fr)/episodes/[number]/page';
import { episodeSchema, type Episode } from '../src/domain/schema';
import { loadContent, setEditorialOverride } from '../src/lib/load';

vi.mock('../src/lib/admin-persistence', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/admin-persistence')>();
  return { ...actual, preparePublicEditorialContent: vi.fn(async () => undefined) };
});

async function renderEpisode(overrides: Partial<Episode> = {}) {
  const episode = episodeSchema.parse({
    number: 999,
    title: 'Épisode de test',
    dek: 'Le résumé court de cet épisode.',
    publishedAt: '2026-10-12T12:00:00.000Z',
    durationSec: 3600,
    description:
      'La description longue reste une source éditoriale.\n\n0:00 Introduction\n2:30 Le Build\n\n[Documentation](https://example.org/source)',
    hosts: ['lou'],
    topics: ['agents'],
    platforms: { youtubeId: 'GgSiPkADCz4' },
    cover: { tone: 0, kicker: 'Sandbox' },
    ...overrides,
  });
  setEditorialOverride({ ...loadContent(), episodes: [episode] });
  const html = renderToStaticMarkup(
    createElement('div', null, await EpisodePage({ params: Promise.resolve({ number: '999' }) })),
  );
  const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  return { html, visible };
}

afterEach(() => {
  setEditorialOverride(undefined);
});

describe("fiche publique d'un épisode", () => {
  it('affiche les chapitres et les ressources extraits sans répéter la description', async () => {
    const { html, visible } = await renderEpisode();

    expect(visible).toContain('Le résumé court de cet épisode.');
    expect(visible).not.toContain('La description longue reste une source éditoriale.');
    expect(visible).not.toContain('episode-about');
    expect(visible).not.toContain('episode-description');
    expect(visible).toContain('Introduction');
    expect(visible).toContain('Le Build');
    expect(visible).toContain('href="/episodes/999?t=150#episode-video"');
    expect(visible.match(/href="https:\/\/example\.org\/source"/g)).toHaveLength(1);
    expect(visible).toContain('id="resource-0"');
    expect(visible).not.toContain('href="/topics/');
    expect(visible).toContain('href="/podcast"');
    expect(html).toContain('La description longue reste une source éditoriale.');
  });

  it('conserve les chapitres édités, les notes, les horodatages et le lecteur audio', async () => {
    const { visible } = await renderEpisode({
      chapters: [{ at: 60, title: 'Chapitre corrigé' }],
      mentions: [
        {
          kind: 'site',
          label: 'Documentation corrigée',
          url: 'https://example.org/source',
          at: 60,
          note: 'Note de préparation',
        },
      ],
      platforms: { youtubeId: 'GgSiPkADCz4', audioUrl: 'https://example.org/audio.mp3' },
    });

    expect(visible).toContain('Chapitre corrigé');
    expect(visible).not.toContain('Le Build');
    expect(visible).toContain('Documentation corrigée');
    expect(visible).toContain('Note de préparation');
    expect(visible).toContain('href="/episodes/999?t=60#episode-video"');
    expect(visible).toContain('src="https://example.org/audio.mp3"');
    expect(visible.match(/href="https:\/\/example\.org\/source"/g)).toHaveLength(1);
  });

  it('garde des états vides lisibles pour un épisode sans vidéo, chapitre ou ressource', async () => {
    const { visible } = await renderEpisode({
      description: 'Description sans horodatage ni lien.',
      platforms: {},
      topics: [],
    });

    expect(visible).toContain('La vidéo de cet épisode n&#x27;est pas encore disponible.');
    expect(visible).toContain('Les chapitres seront ajoutés à cette fiche.');
    expect(visible).toContain('Aucune ressource n’a encore été ajoutée.');
    expect(visible).not.toContain('Description sans horodatage ni lien.');
    expect(visible).not.toContain('chapter-row');
    expect(visible).not.toContain('resource-item');
    expect(visible).not.toContain('episode-about');
  });
});
