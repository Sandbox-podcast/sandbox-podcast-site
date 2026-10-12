import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import sharp, { type Metadata } from 'sharp';
import { getDb } from '../db/client.ts';
import { episodeThumbnails } from '../db/schema.ts';
import { adminStorageMode } from './admin-persistence.ts';

export const MAX_THUMBNAIL_UPLOAD_BYTES = 5_000_000;
const MAX_THUMBNAIL_STORED_BYTES = 1_500_000;
const THUMBNAIL_DIR = join(process.cwd(), '.local', 'episode-thumbnails');
const HASH_PATTERN = /^[a-f0-9]{64}$/;

export interface EpisodeThumbnail {
  sha256: string;
  image: Buffer;
  width: number;
  height: number;
}

/** Vérifie la vraie image et l'encode une seule fois, sans agrandir la source. */
export async function prepareEpisodeThumbnail(input: Buffer): Promise<EpisodeThumbnail> {
  if (input.length === 0 || input.length > MAX_THUMBNAIL_UPLOAD_BYTES) {
    throw new Error('La miniature doit faire au plus 5 Mo.');
  }
  let metadata: Metadata;
  try {
    metadata = await sharp(input, { failOn: 'error', limitInputPixels: 40_000_000 }).metadata();
  } catch {
    throw new Error('Ce fichier image est illisible.');
  }
  if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) !== 1) {
    throw new Error('Choisissez une image JPEG, PNG ou WebP non animée.');
  }
  const rotated = (metadata.orientation ?? 1) >= 5 && (metadata.orientation ?? 1) <= 8;
  const width = rotated ? metadata.height : metadata.width;
  const height = rotated ? metadata.width : metadata.height;
  if (!width || !height || width < 1280 || height < 720) {
    throw new Error('La miniature doit mesurer au moins 1280 × 720 pixels.');
  }
  if (Math.abs(width / height - 16 / 9) > 0.08) {
    throw new Error('Choisissez une miniature au format 16:9.');
  }
  const { data, info } = await sharp(input, { failOn: 'error', limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true })
    .catch(() => {
      throw new Error('Ce fichier image est illisible.');
    });
  if (data.length > MAX_THUMBNAIL_STORED_BYTES) {
    throw new Error('La miniature optimisée dépasse 1,5 Mo. Choisissez une image moins lourde.');
  }
  return {
    sha256: createHash('sha256').update(data).digest('hex'),
    image: data,
    width: info.width,
    height: info.height,
  };
}

export function episodeThumbnailPath(sha256: string): string {
  if (!HASH_PATTERN.test(sha256)) throw new Error('Identifiant de miniature non valide.');
  return `/api/episode-thumbnails/${sha256}.webp`;
}

export async function saveEpisodeThumbnail(thumbnail: EpisodeThumbnail): Promise<string> {
  const path = episodeThumbnailPath(thumbnail.sha256);
  const mode = adminStorageMode();
  if (mode === 'unavailable') {
    throw new Error('Le stockage Postgres n’est pas encore configuré sur ce projet.');
  }
  if (mode === 'postgres') {
    await getDb()
      .insert(episodeThumbnails)
      .values(thumbnail)
      .onConflictDoNothing({ target: episodeThumbnails.sha256 });
    return path;
  }
  await mkdir(THUMBNAIL_DIR, { recursive: true });
  try {
    await writeFile(join(THUMBNAIL_DIR, `${thumbnail.sha256}.webp`), thumbnail.image, {
      flag: 'wx',
    });
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error;
  }
  return path;
}

export async function readEpisodeThumbnail(sha256: string): Promise<Buffer | undefined> {
  if (!HASH_PATTERN.test(sha256)) return undefined;
  const mode = adminStorageMode();
  if (mode === 'unavailable') return undefined;
  if (mode === 'postgres') {
    const rows = await getDb()
      .select({ image: episodeThumbnails.image })
      .from(episodeThumbnails)
      .where(eq(episodeThumbnails.sha256, sha256))
      .limit(1);
    return rows[0] ? Buffer.from(rows[0].image) : undefined;
  }
  try {
    return await readFile(join(THUMBNAIL_DIR, `${sha256}.webp`));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
    throw error;
  }
}
