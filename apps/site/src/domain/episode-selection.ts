import { z } from 'zod';

export const episodeSelectionSchema = z.object({
  q: z.string().max(300).catch('').default(''),
  topic: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .catch('all')
    .default('all'),
  sort: z.enum(['newest', 'oldest', 'shortest']).catch('newest').default('newest'),
});

export type EpisodeSelection = z.infer<typeof episodeSelectionSchema>;

export function episodeSelectionQuery(query: string, selection: EpisodeSelection): string {
  const params = new URLSearchParams(query);
  for (const key of ['q', 'topic', 'sort'] as const) {
    const value = selection[key];
    if (
      !value.trim() ||
      (key === 'topic' && value === 'all') ||
      (key === 'sort' && value === 'newest')
    )
      params.delete(key);
    else params.set(key, value);
  }
  return params.toString();
}
