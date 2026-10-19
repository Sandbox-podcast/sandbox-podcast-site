import { newsFeedSchema } from './news-preview.ts';

export function verifyNewsHealth(value: unknown, now = new Date()) {
  const parsed = newsFeedSchema.safeParse(value);
  if (!parsed.success) return { ok: false, reason: 'Fil public invalide.', checkedAt: null };
  const feed = parsed.data;
  const age = feed.checkedAt ? now.getTime() - Date.parse(feed.checkedAt) : Infinity;
  if (age < -300_000 || age > 3 * 3_600_000)
    return {
      ok: false,
      reason: 'Collecte News absente ou en retard de plus de trois heures.',
      checkedAt: feed.checkedAt,
    };
  if (!feed.sources.some((source) => source.ok))
    return { ok: false, reason: 'Aucune source News lisible.', checkedAt: feed.checkedAt };
  if (!feed.items.length)
    return { ok: false, reason: 'Aucun article publié.', checkedAt: feed.checkedAt };
  return { ok: true, reason: 'Collecte récente et fil public lisible.', checkedAt: feed.checkedAt };
}
