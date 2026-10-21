import { newsFeedSchema } from './news-preview.ts';

export function verifyNewsHealth(value: unknown, now = new Date(), publicationSince?: string) {
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
  const latestArticleAt = new Date(
    Math.max(...feed.items.map((item) => Date.parse(item.publishedAt))),
  ).toISOString();
  const articleAge = now.getTime() - Date.parse(latestArticleAt);
  if (articleAge < -300_000 || articleAge > 36 * 3_600_000)
    return {
      ok: false,
      reason: 'Dernier article daté de plus de 36 heures ou dans le futur.',
      checkedAt: feed.checkedAt,
      latestArticleAt,
    };
  if (publicationSince !== undefined) {
    const since = Date.parse(publicationSince);
    const insertedAt = feed.lastPublishedAt ? Date.parse(feed.lastPublishedAt) : NaN;
    if (
      !Number.isFinite(since) ||
      since > now.getTime() ||
      !Number.isFinite(insertedAt) ||
      insertedAt < since ||
      insertedAt > now.getTime() + 300_000
    )
      return {
        ok: false,
        reason: 'Aucune nouvelle publication confirmée pendant le traitement parallèle.',
        checkedAt: feed.checkedAt,
        latestArticleAt,
      };
  }
  return {
    ok: true,
    reason: 'Collecte récente et article de moins de 36 heures publié.',
    checkedAt: feed.checkedAt,
    latestArticleAt,
  };
}
