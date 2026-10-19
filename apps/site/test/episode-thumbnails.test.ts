import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { episodeThumbnails } from '../src/db/schema.ts';
import { episodeThumbnailPath, prepareEpisodeThumbnail } from '../src/lib/episode-thumbnails.ts';
import { bestYouTubeThumbnail } from '../src/lib/youtube-thumbnail.ts';

describe('import d’une miniature haute définition', () => {
  const database = new PGlite();
  // Le chargement WASM est une préparation d'intégration ; les assertions gardent 5 s.
  beforeAll(async () => {
    await database.waitReady;
  }, 30_000);
  afterAll(async () => {
    await database.close();
  }, 30_000);

  it('vérifie les pixels et produit une image WebP immuable', async () => {
    const input = await sharp({
      create: { width: 1280, height: 720, channels: 3, background: '#02c9df' },
    })
      .png()
      .toBuffer();
    const result = await prepareEpisodeThumbnail(input);
    expect(result.width).toBe(1280);
    expect(result.height).toBe(720);
    expect((await sharp(result.image).metadata()).format).toBe('webp');
    expect(episodeThumbnailPath(result.sha256)).toMatch(
      /^\/api\/episode-thumbnails\/[a-f0-9]{64}\.webp$/,
    );
    expect((await prepareEpisodeThumbnail(input)).sha256).toBe(result.sha256);
  });

  it('refuse une petite image et un faux fichier', async () => {
    const small = await sharp({
      create: { width: 640, height: 360, channels: 3, background: '#000000' },
    })
      .png()
      .toBuffer();
    await expect(prepareEpisodeThumbnail(small)).rejects.toThrow(/1280/);
    await expect(prepareEpisodeThumbnail(Buffer.from('not an image'))).rejects.toThrow(/illisible/);
  });

  it('enregistre le WebP dans la migration Postgres additive', async () => {
    await database.exec(
      readFileSync(join(process.cwd(), 'drizzle/0008_episode_thumbnails.sql'), 'utf8'),
    );
    const db = drizzle(database);
    const image = await prepareEpisodeThumbnail(
      await sharp({
        create: { width: 1280, height: 720, channels: 3, background: '#02c9df' },
      })
        .png()
        .toBuffer(),
    );
    await db.insert(episodeThumbnails).values(image);
    const rows = await db.select().from(episodeThumbnails);
    expect(rows).toHaveLength(1);
    const stored = rows[0];
    if (!stored) throw new Error('Image non enregistrée.');
    expect(Buffer.from(stored.image)).toEqual(image.image);
  });
});

describe('amélioration des anciennes miniatures YouTube', () => {
  it('utilise maxres quand il est réellement disponible', async () => {
    const large = await sharp({
      create: { width: 1280, height: 720, channels: 3, background: '#02c9df' },
    })
      .jpeg()
      .toBuffer();
    const fetchMock = vi.fn(
      async () =>
        new Response(new Uint8Array(large), { headers: { 'Content-Type': 'image/jpeg' } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    try {
      expect(await bestYouTubeThumbnail('dQw4w9WgXcQ')).toEqual(large);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('maxresdefault.jpg'),
        expect.any(Object),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('écarte un faux maxres de petite taille et descend à la variante suivante', async () => {
    const small = await sharp({
      create: { width: 120, height: 90, channels: 3, background: '#000000' },
    })
      .jpeg()
      .toBuffer();
    const standard = await sharp({
      create: { width: 640, height: 480, channels: 3, background: '#02c9df' },
    })
      .jpeg()
      .toBuffer();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(new Uint8Array(small), { headers: { 'Content-Type': 'image/jpeg' } }),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array(standard), { headers: { 'Content-Type': 'image/jpeg' } }),
      );
    vi.stubGlobal('fetch', fetchMock);
    try {
      expect(await bestYouTubeThumbnail('dQw4w9WgXcQ')).toEqual(standard);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
