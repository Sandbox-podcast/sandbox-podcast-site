import { z } from 'zod';
import type { Episode } from './schema';

const httpsUrl = z.url().refine((value) => new URL(value).protocol === 'https:');

/** Socle éditorial pour un guide accompagné d'un extrait publié. Aucun guide de démonstration. */
export const guideSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(8).max(120),
    outcome: z.string().min(20).max(300),
    audience: z.string().min(3).max(120),
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    publishedAt: z.iso.date(),
    updatedAt: z.iso.date(),
    episodeNumber: z.number().int().positive(),
    youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
    steps: z.array(z.object({ title: z.string().min(3), text: z.string().min(20) })).min(1),
    resources: z.array(z.object({ label: z.string().min(2), url: httpsUrl })).min(1),
  })
  .refine(
    (guide) => guide.updatedAt >= guide.publishedAt,
    'Mise à jour antérieure à la publication.',
  );
export type Guide = z.infer<typeof guideSchema>;

export function validateGuides(input: unknown, episodes: readonly Episode[]): Guide[] {
  const guides = z.array(guideSchema).parse(input);
  const slugs = new Set<string>();
  for (const guide of guides) {
    if (slugs.has(guide.slug)) throw new Error(`Guide dupliqué : ${guide.slug}`);
    slugs.add(guide.slug);
    if (
      !episodes.some(
        (episode) =>
          episode.number === guide.episodeNumber &&
          episode.status !== 'draft' &&
          episode.platforms.youtubeId,
      )
    )
      throw new Error(`Épisode publié absent pour le guide ${guide.slug}`);
  }
  return guides;
}
