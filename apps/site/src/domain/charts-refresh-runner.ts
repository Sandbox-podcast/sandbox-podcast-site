import { z } from 'zod';
import { refreshSlotId } from './chart-refresh.ts';
import { editionStart } from './weeks.ts';
import { editionIdSchema } from './schema.ts';

export const refreshSummarySchema = z.object({
  status: z.enum([
    'success',
    'partial',
    'failed',
    'skipped',
    'insufficient_history',
    'awaiting_review',
  ]),
  processed: z.number().int().nonnegative(),
  succeeded: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  snapshotsCreated: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative().optional(),
});

const currentEditionSchema = z.object({
  chart: z.enum(['github', 'skills', 'models', 'rising']),
  weekId: editionIdSchema,
  publishedAt: z.string().min(1),
  entries: z.array(z.object({ rank: z.number().int().positive() })).min(1),
});

/** Vérifie l'édition servie aux lecteurs, pas seulement la réussite d'un appel cron. */
export function verifyPublishedEdition(
  value: unknown,
  chart: string,
  now: Date,
  exactSlot?: string,
): { ok: boolean; edition: string | null; reason: string } {
  const parsed = currentEditionSchema.safeParse(value);
  if (!parsed.success || parsed.data.chart !== chart)
    return { ok: false, edition: null, reason: 'Aucune édition publique valide.' };
  const edition = parsed.data.weekId;
  const age = now.getTime() - editionStart(edition).getTime();
  if (!Number.isFinite(Date.parse(parsed.data.publishedAt)) || age < 0)
    return { ok: false, edition, reason: 'Date de publication invalide ou édition future.' };
  if (exactSlot ? edition !== exactSlot : age > 18 * 60 * 60 * 1000)
    return { ok: false, edition, reason: 'Le classement public est en retard.' };
  return { ok: true, edition, reason: 'Édition publique vérifiée.' };
}

export interface RefreshTransport {
  job: (name: string) => Promise<unknown>;
  current: (chart: string) => Promise<unknown>;
  wait: () => Promise<void>;
}

/** Les trois collecteurs restent indépendants ; leurs échecs sont tous rapportés. */
export async function refreshCharts(transport: RefreshTransport, now = new Date()) {
  const slot = refreshSlotId(now);
  const results = await Promise.all(
    [
      ['github', 'github-daily', 'github-freeze'],
      ['skills', 'skills-daily', 'skills-freeze'],
      ['models', 'models-daily', 'models-freeze'],
    ].map(async ([chart, collect, freeze]) => {
      if (!chart || !collect || !freeze) throw new Error('Chaîne de collecte invalide.');
      const statuses: string[] = [];
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const summary = refreshSummarySchema.parse(await transport.job(collect));
          statuses.push(summary.status);
          if (summary.status === 'success' && !summary.remaining) break;
          if (['insufficient_history', 'awaiting_review'].includes(summary.status)) break;
        } catch {
          statuses.push('failed');
        }
        if (attempt < 2) await transport.wait();
      }
      // Même après un timeout, le serveur peut avoir persisté une collecte exploitable.
      try {
        const summary = refreshSummarySchema.parse(await transport.job(freeze));
        statuses.push(summary.status);
      } catch {
        statuses.push('failed');
      }
      try {
        return {
          chart,
          statuses,
          ...verifyPublishedEdition(
            await transport.current(chart),
            chart,
            new Date(Math.max(now.getTime(), Date.now())),
            slot,
          ),
        };
      } catch {
        return {
          chart,
          statuses,
          ok: false,
          edition: null,
          reason: 'Vérification publique indisponible.',
        };
      }
    }),
  );
  return { ok: results.every((result) => result.ok), slot, results };
}
