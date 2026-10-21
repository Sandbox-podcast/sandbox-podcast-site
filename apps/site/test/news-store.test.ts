import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as schema from '../src/db/schema.ts';
import { NEWS_MEDIA } from '../src/domain/news-media.ts';
import { newsFeedSchema } from '../src/domain/news-preview.ts';
import type { NewsIngestionRequest } from '../src/domain/news-publishing.ts';
import { newsIngestionRequestSchema } from '../src/domain/news-publishing.ts';
import {
  readNewsTranslationBacklog,
  completeNewsTranslations,
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
  it('accepte un titre traduit plus long sans élargir la borne française', async () => {
    const payload = ingestion();
    const item = payload.items[0]?.item;
    if (!item) throw new Error('Fixture absente');
    item.titles.en = 'Translated title '.repeat(16).trim();
    expect(item.titles.en.length).toBeGreaterThan(200);
    expect(await publishNewsBatch(payload)).toEqual({ inserted: 1 });
    item.titles['fr-FR'] = 'Titre français '.repeat(16).trim();
    await expect(publishNewsBatch(payload)).rejects.toThrow('Lot SANDBOX News invalide');
  });
  it('publie une brève française, complète les langues et protège le texte déjà publié', async () => {
    const payload = ingestion();
    const original = payload.items[0]?.item;
    if (!original) throw new Error('Fixture absente');
    const french = {
      ...original,
      titles: { 'fr-FR': original.titles['fr-FR'] },
      synopses: { 'fr-FR': original.synopses['fr-FR'].slice(0, 1) },
    };
    payload.items = [{ item: french }];
    expect(await publishNewsBatch(payload)).toEqual({ inserted: 1 });
    const before = await readPublishedNews();
    expect(before.items[0]?.synopses?.['fr-FR']).toHaveLength(1);
    expect((await readNewsTranslationBacklog()).items).toHaveLength(1);
    const translated = {
      ...french,
      titles: original.titles,
      synopses: Object.fromEntries(
        Object.entries(original.synopses).map(([locale, texts]) => [locale, texts?.slice(0, 1)]),
      ),
    };
    expect(
      await completeNewsTranslations([{ ...translated, editorialSourceHash: 'c'.repeat(64) }]),
    ).toEqual({ updated: 0 });
    expect(
      await completeNewsTranslations([
        { ...translated, titles: { ...translated.titles, 'fr-FR': 'Un autre titre.' } },
      ]),
    ).toEqual({ updated: 0 });
    expect(await completeNewsTranslations([translated])).toEqual({ updated: 1 });
    expect(await completeNewsTranslations([translated])).toEqual({ updated: 0 });
    expect((await readNewsTranslationBacklog()).items).toEqual([]);
    const after = await readPublishedNews();
    expect(after.items[0]?.titles?.['en']).toBe(original.titles.en);
    expect(after.lastPublishedAt).toBe(before.lastPublishedAt);
    expect(after.items[0]?.synopses?.['fr-FR']).toEqual(french.synopses['fr-FR']);
  });
  it('conserve les articles anglais visibles après plus de trente publications françaises', async () => {
    const payload = ingestion();
    const item = payload.items[0]?.item;
    if (!item) throw new Error('Fixture absente');
    item.publishedAt = new Date(Date.now() - 60_000).toISOString();
    await publishNewsBatch(payload);
    await db.insert(schema.newsItems).values(
      Array.from({ length: 35 }, (_, index) => {
        const id = `rundown:/articles/fr-only-${index}`;
        const url = `https://www.therundown.ai/articles/fr-only-${index}`;
        return {
          id,
          canonicalUrl: url,
          sourceId: 'rundown',
          sourceName: item.project,
          publishedAt: new Date().toISOString(),
          category: item.category,
          payload: {
            ...item,
            id,
            url,
            publishedAt: new Date().toISOString(),
            titles: { 'fr-FR': item.titles['fr-FR'] },
            synopses: { 'fr-FR': item.synopses['fr-FR'] },
          },
        };
      }),
    );
    expect((await readPublishedNews()).items).toHaveLength(30);
    const english = await readPublishedNews(new Date(), undefined, 'en');
    expect(english.items.map((entry) => entry.id)).toEqual([item.id]);
    expect(english.nextCursor).toBeNull();
  });
  it('reprend les traductions par pages sans répéter une fiche en échec', async () => {
    const item = ingestion().items[0]?.item;
    if (!item) throw new Error('Fixture absente');
    await db.insert(schema.newsItems).values(
      Array.from({ length: 23 }, (_, index) => {
        const id = `rundown:/articles/translation-${String(index).padStart(2, '0')}`;
        const url = `https://www.therundown.ai/articles/translation-${index}`;
        return {
          id,
          canonicalUrl: url,
          sourceId: 'rundown',
          sourceName: item.project,
          publishedAt: item.publishedAt,
          category: item.category,
          payload: {
            ...item,
            id,
            url,
            titles: { 'fr-FR': item.titles['fr-FR'] },
            synopses: { 'fr-FR': item.synopses['fr-FR'] },
          },
        };
      }),
    );
    const first = await readNewsTranslationBacklog();
    expect(first.items).toHaveLength(20);
    const second = await readNewsTranslationBacklog(first.next ?? undefined);
    expect(second.items).toHaveLength(3);
    expect(second.next).toBeNull();
    expect(new Set([...first.items, ...second.items].map((item) => item.id)).size).toBe(23);
  });

  it('accepte le registre précédent pendant le déploiement et refuse une source répétée', () => {
    const request = ingestion();
    expect(
      newsIngestionRequestSchema.safeParse({ ...request, sources: request.sources.slice(0, 10) })
        .success,
    ).toBe(true);
    expect(
      newsIngestionRequestSchema.safeParse({
        ...request,
        sources: [...request.sources.slice(0, 10), request.sources[0]],
      }).success,
    ).toBe(false);
  });
  it('conserve les articles au-delà de quatorze jours pour le fil historique', async () => {
    await publishNewsBatch(ingestion());
    const later = new Date(Date.now() + 45 * 86_400_000);
    expect((await readPublishedNews(later)).items).toHaveLength(1);
  });

  it('conserve la collecte la plus récente quand un ancien lot termine après elle', async () => {
    const earlier = ingestion();
    earlier.checkedAt = new Date(Date.now() - 3_600_000).toISOString();
    const item = earlier.items[0]?.item;
    if (!item) throw new Error('Fiche de test absente.');
    item.publishedAt = earlier.checkedAt;
    const latest = ingestion();
    latest.items = [];
    latest.sources = latest.sources.map((source) => ({
      ...source,
      ok: false,
      reason: 'HTTP 503',
    }));
    await publishNewsBatch(latest);
    expect(await publishNewsBatch(earlier)).toEqual({ inserted: 1 });
    const feed = await readPublishedNews();
    expect(feed.checkedAt).toBe(latest.checkedAt);
    expect(feed.sources.every((source) => !source.ok && source.reason === 'HTTP 503')).toBe(true);
    expect(feed.items).toHaveLength(1);
  });

  it('date la publication sur le site indépendamment du média, de la collecte et de la page', async () => {
    expect((await readPublishedNews()).lastPublishedAt).toBeNull();
    const payload = ingestion();
    const item = payload.items[0]?.item;
    if (!item) throw new Error('Fiche de test absente.');
    item.publishedAt = new Date(Date.now() - 2 * 86_400_000).toISOString();
    await publishNewsBatch(payload);
    const before = await readPublishedNews();
    const insertedAt = before.lastPublishedAt;
    expect(insertedAt).toBeTruthy();
    expect(Date.parse(insertedAt ?? '')).toBeGreaterThan(Date.parse(item.publishedAt));

    const laterCollection = { ...payload, checkedAt: new Date().toISOString(), items: [] };
    await publishNewsBatch(laterCollection);
    await publishNewsBatch(payload);
    const page = await readPublishedNews(new Date(), {
      publishedAt: '2000-01-01',
      id: 'before-all-items',
    });
    expect(page.items).toEqual([]);
    expect(page.lastPublishedAt).toBe(insertedAt);
    expect(page.checkedAt).toBe(laterCollection.checkedAt);
    expect(newsFeedSchema.safeParse(page).success).toBe(true);
  });

  it.each(['2026-10-18', '2026-10-18T10:00:00Z', '2026-10-18T10:00:00.000Z'])(
    'parcourt plus de 200 articles sans doublon avec des dates identiques (%s)',
    async (publishedAt) => {
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
            publishedAt,
            category: base.category,
            payload: { ...base, id, url, publishedAt },
          };
        }),
      );
      const seen: string[] = [];
      let page = await readPublishedNews();
      expect(page.nextCursor?.publishedAt).toBe(publishedAt);
      for (let pageNumber = 0; pageNumber < 10 && page.items.length > 0; pageNumber += 1) {
        seen.push(...page.items.map((item) => item.id));
        if (!page.nextCursor) break;
        page = await readPublishedNews(new Date(), page.nextCursor);
      }
      expect(seen).toHaveLength(215);
      expect(new Set(seen).size).toBe(215);
      expect(page.nextCursor).toBeNull();
    },
  );
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
