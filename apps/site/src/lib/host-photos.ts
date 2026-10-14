import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import sharp, { type Metadata } from 'sharp';
import { getDb } from '../db/client.ts';
import { hostPhotos } from '../db/schema.ts';
import { adminStorageMode } from './admin-persistence.ts';

export const MAX_HOST_PHOTO_UPLOAD_BYTES = 8_000_000;
const MAX_HOST_PHOTO_STORED_BYTES = 500_000;
const MIN_HOST_PHOTO_SIZE = 400;
const HOST_PHOTO_SIZE = 800;
const HOST_PHOTO_DIR = join(process.cwd(), '.local', 'host-photos');
const HASH_PATTERN = /^[a-f0-9]{64}$/;

export interface HostPhoto {
  sha256: string;
  image: Buffer;
  size: number;
}

/**
 * Vérifie la vraie image, la recadre en carré au centre
 * et l'encode en WebP sans métadonnées (EXIF, GPS), sans agrandir la source.
 */
export async function prepareHostPhoto(input: Buffer): Promise<HostPhoto> {
  if (input.length === 0 || input.length > MAX_HOST_PHOTO_UPLOAD_BYTES) {
    throw new Error('La photo doit faire au plus 8 Mo.');
  }
  let metadata: Metadata;
  try {
    metadata = await sharp(input, { failOn: 'error', limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw new Error('Ce fichier image est illisible.');
  }
  if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) !== 1) {
    throw new Error('Choisissez une image JPEG, PNG ou WebP non animée.');
  }
  const side = Math.min(metadata.width, metadata.height);
  if (side < MIN_HOST_PHOTO_SIZE) {
    throw new Error('La photo doit mesurer au moins 400 × 400 pixels.');
  }
  const { data, info } = await sharp(input, { failOn: 'error', limitInputPixels: 50_000_000 })
    .rotate()
    .resize({
      width: Math.min(side, HOST_PHOTO_SIZE),
      height: Math.min(side, HOST_PHOTO_SIZE),
      fit: 'cover',
    })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true })
    .catch(() => {
      throw new Error('Ce fichier image est illisible.');
    });
  if (data.length > MAX_HOST_PHOTO_STORED_BYTES) {
    throw new Error('La photo optimisée dépasse 500 ko. Choisissez une image moins chargée.');
  }
  return {
    sha256: createHash('sha256').update(data).digest('hex'),
    image: data,
    size: info.width,
  };
}

export function hostPhotoPath(sha256: string): string {
  if (!HASH_PATTERN.test(sha256)) throw new Error('Identifiant de photo non valide.');
  return `/api/host-photos/${sha256}.webp`;
}

export async function saveHostPhoto(photo: HostPhoto): Promise<string> {
  const path = hostPhotoPath(photo.sha256);
  const mode = adminStorageMode();
  if (mode === 'unavailable') {
    throw new Error('Le stockage Postgres n’est pas encore configuré sur ce projet.');
  }
  if (mode === 'postgres') {
    await getDb()
      .insert(hostPhotos)
      .values(photo)
      .onConflictDoNothing({ target: hostPhotos.sha256 });
    return path;
  }
  await mkdir(HOST_PHOTO_DIR, { recursive: true });
  try {
    await writeFile(join(HOST_PHOTO_DIR, `${photo.sha256}.webp`), photo.image, { flag: 'wx' });
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error;
  }
  return path;
}

export async function readHostPhoto(sha256: string): Promise<Buffer | undefined> {
  if (!HASH_PATTERN.test(sha256)) return undefined;
  const mode = adminStorageMode();
  if (mode === 'unavailable') return undefined;
  if (mode === 'postgres') {
    const rows = await getDb()
      .select({ image: hostPhotos.image })
      .from(hostPhotos)
      .where(eq(hostPhotos.sha256, sha256))
      .limit(1);
    return rows[0] ? Buffer.from(rows[0].image) : undefined;
  }
  try {
    return await readFile(join(HOST_PHOTO_DIR, `${sha256}.webp`));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
    throw error;
  }
}
