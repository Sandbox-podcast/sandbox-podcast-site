import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as schema from '../src/db/schema.ts';
import { NEWS_MEDIA } from '../src/domain/news-media.ts';
import { newsFeedSchema } from '../src/domain/news-preview.ts';
import type { NewsIngestionRequest } from '../src/domain/news-publishing.ts';
import {
  knownNewsUrls,
  latestNewsPublicationTime,
  publishNewsBatch,
  readPublishedNews,
} from '../src/lib/news-store.ts';

const pg = new PGlite();
const db = drizzle(pg, { schema });
vi.mock('../src/db/client.ts', () => ({ getDb: () => db, hasDatabaseConfiguration: () => true }));

function ingestion(): NewsIngestionRequest {
  const now = new Date().toISOString();
  const source = NEWS_MEDIA[1];
  return {
    checkedAt: now,
    sources: NEWS_MEDIA.map((media) => ({
      id: media.id,
      name: media.name,
      url: media.url,
      ok: media.id !== 'taaft',
      ...(media.id === 'taaft' ? { reason: 'Accès indisponible' } : {}),
    })),
    items: [
      {
        item: {
          id: `${source.id}:/articles/automated-item-test`,
          project: source.name,
          repository: new URL(source.url).hostname,
          version: 'article',
          url: `${source.url}articles/automated-item-test`,
          publishedAt: now,
          category: 'models',
          prerelease: false,
          kind: 'article',
          headline: 'A new open model is available',
          titles: {
            'fr-FR': 'Un nouveau modèle ouvert est disponible.',
            en: 'A new open model is available.',
            'es-ES': 'Ya está disponible un nuevo modelo abierto.',
            'de-DE': 'Ein neues offenes Modell ist verfügbar.',
          },
          synopses: {
            'fr-FR': [
              'Le laboratoire publie un nouveau modèle ouvert.',
              'Le modèle accepte les images et le texte.',
              'Les poids sont disponibles sous licence Apache 2.0.',
            ],
            en: [
              'The lab releases a new open model.',
              'The model accepts images and text.',
              'The weights are available under the Apache 2.0 license.',
            ],
            'es-ES': [
              'El laboratorio publica un nuevo modelo abierto.',
              'El modelo acepta imágenes y texto.',
              'Los pesos están disponibles con licencia Apache 2.0.',
            ],
            'de-DE': [
              'Das Labor veröffentlicht ein neues offenes Modell.',
              'Das Modell verarbeitet Bilder und Text.',
              'Die Gewichte stehen unter der Apache-2.0-Lizenz bereit.',
            ],
          },
          editorialSourceHash: 'a'.repeat(64),
        },
        sourceExcerptHash: 'b'.repeat(64),
      },
    ],
  };
}

beforeAll(async () => {
  const migration = readFileSync(
    join(process.cwd(), 'drizzle/0016_sandbox_news_autopublishing.sql'),
    'utf8',
  );
  for (const statement of migration
    .split('--> statement-breakpoint')
    .map((part) => part.trim())
    .filter(Boolean)) {
    await pg.exec(statement);
  }
});

afterEach(async () => {
  await db.delete(schema.newsItems);
  await db.delete(schema.newsSourceStatus);
});

afterAll(async () => {
  await pg.close();
});

describe('publication automatique SANDBOX News', () => {
  it('conserve les articles au-delà de quatorze jours pour le fil historique', async () => {
    await publishNewsBatch(ingestion());
    const later = new Date(Date.now() + 45 * 86_400_000);
    expect((await readPublishedNews(later)).items).toHaveLength(1);
  });

  it('parcourt plus de 200 articles sans doublon avec des dates identiques', async () => {
    const base = ingestion().items[0]?.item;
    if (!base) throw new Error('Fixture absente');
    await db.insert(schema.newsItems).values(
      Array.from({ length: 215 }, (_, index) => {
        const id = `rundown:/articles/page-${String(index).padStart(3, '0')}`;
        const url = `https://www.therundown.ai/articles/page-${String(index).padStart(3, '0')}`;
        return {
          id,
          canonicalUrl: url,
          sourceId: 'rundown',
          sourceName: base.project,
          publishedAt: base.publishedAt,
          category: base.category,
          payload: { ...base, id, url },
        };
      }),
    );
    const seen: string[] = [];
    let page = await readPublishedNews();
    while (page.items.length > 0) {
      seen.push(...page.items.map((item) => item.id));
      if (!page.nextCursor) break;
      page = await readPublishedNews(new Date(), page.nextCursor);
    }
    expect(seen).toHaveLength(215);
    expect(new Set(seen).size).toBe(215);
    expect(page.nextCursor).toBeNull();
  });
  it('enregistre une fiche traduite, évite les doublons et expose le flux complet', async () => {
    const payload = ingestion();
    expect(await publishNewsBatch(payload)).toEqual({ inserted: 1 });
    expect(await publishNewsBatch(payload)).toEqual({ inserted: 0 });

    const itemUrl = payload.items[0]?.item.url;
    if (!itemUrl) throw new Error('URL de test absente.');
    expect(await knownNewsUrls()).toContain(itemUrl);
    const feed = await readPublishedNews();
    expect(newsFeedSchema.safeParse(feed).success).toBe(true);
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0]?.titles?.['es-ES']).toBe('Ya está disponible un nuevo modelo abierto.');
    expect(feed.items[0]?.synopses?.['de-DE']).toHaveLength(3);
    expect(feed.sources).toHaveLength(NEWS_MEDIA.length);
    expect(feed.sources.find((source) => source.name === "There's An AI For That")?.ok).toBe(false);
    expect(Date.parse(feed.checkedAt ?? '')).toBe(Date.parse(payload.checkedAt));
    expect(await latestNewsPublicationTime()).toBe(payload.items[0]?.item.publishedAt);
  });

  it('refuse une fiche sans les quatre traductions et les dates hors fenêtre', async () => {
    const missingLocale = ingestion();
    const item = missingLocale.items[0]?.item;
    if (!item) throw new Error('Fiche de test absente.');
    item.titles.en = '';
    await expect(publishNewsBatch(missingLocale)).rejects.toThrow('Lot SANDBOX News invalide');

    const stale = ingestion();
    const staleItem = stale.items[0]?.item;
    if (!staleItem) throw new Error('Fiche de test absente.');
    staleItem.publishedAt = new Date(Date.now() - 15 * 86_400_000).toISOString();
    await expect(publishNewsBatch(stale)).rejects.toThrow('fenêtre de fraîcheur');
  });

  it('refuse une URL externe attribuée à un média autorisé', async () => {
    const payload = ingestion();
    const item = payload.items[0]?.item;
    if (!item) throw new Error('Fiche de test absente.');
    const alternateSource = NEWS_MEDIA[5];
    item.url = new URL('/articles/automated-item-test', alternateSource.url).href;
    await expect(publishNewsBatch(payload)).rejects.toThrow('Source de fiche SANDBOX News absente');
  });
});
