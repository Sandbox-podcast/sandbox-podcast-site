import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { afterEach, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { hostPhotos } from '../src/db/schema.ts';
import { hostPhotoPath, prepareHostPhoto } from '../src/lib/host-photos.ts';
import { loadContent, setEditorialOverride } from '../src/lib/load.ts';

function solid(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#02c9df' } })
    .jpeg()
    .toBuffer();
}

describe('import d’une photo d’animateur', () => {
  it('recadre en carré WebP sans agrandir et donne un chemin stable', async () => {
    const input = await solid(1200, 1600);
    const result = await prepareHostPhoto(input);
    const metadata = await sharp(result.image).metadata();
    expect(metadata.format).toBe('webp');
    expect([metadata.width, metadata.height]).toEqual([800, 800]);
    expect(result.size).toBe(800);
    expect(hostPhotoPath(result.sha256)).toMatch(/^\/api\/host-photos\/[a-f0-9]{64}\.webp$/);
    expect((await prepareHostPhoto(input)).sha256).toBe(result.sha256);

    const medium = await prepareHostPhoto(await solid(500, 640));
    expect(medium.size).toBe(500);
  });

  it('retire les métadonnées EXIF', async () => {
    const input = await sharp(await solid(600, 600))
      .withExif({ IFD0: { Copyright: 'secret' } })
      .jpeg()
      .toBuffer();
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const result = await prepareHostPhoto(input);
    expect((await sharp(result.image).metadata()).exif).toBeUndefined();
  });

  it('refuse une image trop petite et un faux fichier', async () => {
    await expect(prepareHostPhoto(await solid(1200, 300))).rejects.toThrow(/400/);
    await expect(prepareHostPhoto(Buffer.from('not an image'))).rejects.toThrow(/illisible/);
    expect(() => hostPhotoPath('../etc')).toThrow();
  });

  it('enregistre le WebP dans la migration Postgres additive', async () => {
    const database = new PGlite();
    try {
      await database.exec(
        readFileSync(join(process.cwd(), 'drizzle/0011_host_photos.sql'), 'utf8'),
      );
      const db = drizzle(database);
      const photo = await prepareHostPhoto(await solid(640, 640));
      await db.insert(hostPhotos).values(photo);
      const rows = await db.select().from(hostPhotos);
      expect(rows).toHaveLength(1);
      expect(Buffer.from(rows[0]?.image ?? [])).toEqual(photo.image);
    } finally {
      await database.close();
    }
  });
});

describe('priorité de la photo importée', () => {
  afterEach(() => {
    setEditorialOverride(undefined);
  });

  it('remplace la photo versionnée de Lou, puis la retrouve une fois retirée', () => {
    const content = loadContent();
    const uploaded = `/api/host-photos/${'b'.repeat(64)}.webp`;
    const withPhoto = (photo: string | undefined) =>
      content.hosts.map((host) => (host.slug === 'lou' ? { ...host, photo } : host));
    setEditorialOverride({ ...content, hosts: withPhoto(uploaded) });
    expect(loadContent().hosts.find((host) => host.slug === 'lou')?.photo).toBe(uploaded);
    setEditorialOverride({ ...content, hosts: withPhoto(undefined) });
    expect(loadContent().hosts.find((host) => host.slug === 'lou')?.photo).toBe('/team/lou.png');
  });
});
