import sharp from 'sharp';
import { readLimitedBody } from './limited-body.ts';

const MAX_YOUTUBE_IMAGE_BYTES = 3_000_000;
const VARIANTS = [
  { name: 'maxresdefault', minWidth: 1280 },
  { name: 'sddefault', minWidth: 640 },
  { name: 'hqdefault', minWidth: 480 },
] as const;

/** Cherche une source réellement disponible, sans agrandir un JPEG de 480 px. */
export async function bestYouTubeThumbnail(videoId: string): Promise<Buffer | undefined> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return undefined;
  for (const variant of VARIANTS) {
    try {
      const response = await fetch(`https://i.ytimg.com/vi/${videoId}/${variant.name}.jpg`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3500),
      });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) continue;
      const image = await readLimitedBody(response.body, MAX_YOUTUBE_IMAGE_BYTES);
      if (!image) continue;
      const metadata = await sharp(image, { failOn: 'error' }).metadata();
      if (metadata.format === 'jpeg' && metadata.width >= variant.minWidth) return image;
    } catch {
      // Une variante absente ou inaccessible laisse la suivante prendre le relais.
    }
  }
  return undefined;
}
