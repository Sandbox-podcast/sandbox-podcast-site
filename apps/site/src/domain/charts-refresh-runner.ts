import { z } from 'zod';
import { refreshSlotId } from './chart-refresh.ts';
import { editionStart } from './weeks.ts';
import { editionIdSchema } from './schema.ts';
import { editionFromRoute } from './edition-route.ts';

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
  details: z.array(z.string()).optional(),
});

const pendingRisingSchema = z.object({
  chart: z.literal('rising'),
  status: z.literal('pending'),
  entries: z.array(z.unknown()).length(0),
  message: z.string().startsWith('Rising attend '),
});

export function chartsChecksHealthy(
  results: readonly { ok: boolean; pending?: boolean }[],
): boolean {
  return results.every((result) => result.ok || result.pending === true);
}

const currentEditionSchema = z.object({
  chart: z.enum(['github', 'skills', 'models', 'rising']),
  weekId: editionIdSchema,
  publishedAt: z.string().min(1),
  entries: z
    .array(z.object({ rank: z.number().int().positive() }))
    .min(1)
    .refine((entries) => entries.every((entry, index) => entry.rank === index + 1)),
});

/** Vérifie l'édition servie aux lecteurs, pas seulement la réussite d'un appel cron. */
export function verifyPublishedEdition(
  value: unknown,
  chart: string,
  now: Date,
  exactSlot?: string,
): { ok: boolean; edition: string | null; reason: string; pending?: boolean } {
  if (chart === 'rising' && pendingRisingSchema.safeParse(value).success)
    return {
      ok: false,
      pending: true,
      edition: null,
      reason: 'Rising attend son historique mesuré ; aucune édition publiée.',
    };
  const parsed = currentEditionSchema.safeParse(value);
  if (!parsed.success || parsed.data.chart !== chart)
    return { ok: false, edition: null, reason: 'Aucune édition publique valide.' };
  const edition = parsed.data.weekId;
  if (!editionFromRoute(edition)) return { ok: false, edition, reason: 'Date d’édition invalide.' };
  const age = now.getTime() - editionStart(edition).getTime();
  const publishedAt = Date.parse(parsed.data.publishedAt);
  if (!Number.isFinite(publishedAt) || publishedAt > now.getTime() || age < 0)
    return { ok: false, edition, reason: 'Date de publication invalide ou édition future.' };
  if (exactSlot ? edition !== exactSlot : age > 18 * 60 * 60 * 1000)
    return { ok: false, edition, reason: 'Le classement public est en retard.' };
  return { ok: true, edition, reason: 'Édition publique vérifiée.' };
}

/** Reprend seulement le créneau courant après son horaire prévu, sans attendre Rising. */
export function planChartsRecovery(
  editions: readonly { chart: string; value: unknown }[],
  now: Date,
): { needed: boolean; slot: string; missing: string[] } {
  const slot = refreshSlotId(now);
  const minutesInHalfDay = (now.getUTCHours() % 12) * 60 + now.getUTCMinutes();
  if (minutesInHalfDay < 3 * 60 + 17) return { needed: false, slot, missing: [] };
  const missing = ['github', 'skills', 'models'].filter((chart) => {
    const edition = editions.find((candidate) => candidate.chart === chart);
    return !verifyPublishedEdition(edition?.value, chart, now, slot).ok;
  });
  return { needed: missing.length > 0, slot, missing };
}

export interface RefreshTransport {
  job: (name: string) => Promise<unknown>;
  current: (chart: string) => Promise<unknown>;
  wait: () => Promise<void>;
  mayRunJob?: () => boolean;
}

/** Les trois collecteurs restent indépendants ; leurs échecs sont tous rapportés. */
export async function refreshCharts(
  transport: RefreshTransport,
  now = new Date(),
  charts: readonly string[] = ['github', 'skills', 'models'],
) {
  const slot = refreshSlotId(now);
  const grouped = await Promise.all(
    [
      ['github', 'github-daily', 'github-freeze'],
      ['skills', 'skills-daily', 'skills-freeze'],
      ['models', 'models-daily', 'models-freeze'],
    ]
      .filter(([chart]) => chart && charts.includes(chart))
      .map(async ([chart, collect, freeze]) => {
        if (!chart || !collect || !freeze) throw new Error('Chaîne de collecte invalide.');
        const statuses: string[] = [];
        const details: string[] = [];
        for (let attempt = 0; attempt < 3; attempt++) {
          if (transport.mayRunJob && !transport.mayRunJob()) {
            statuses.push('skipped');
            break;
          }
          try {
            const summary = refreshSummarySchema.parse(await transport.job(collect));
            statuses.push(summary.status);
            details.push(...(summary.details ?? []));
            if (summary.status === 'success' && !summary.remaining) break;
            if (['insufficient_history', 'awaiting_review'].includes(summary.status)) break;
          } catch {
            statuses.push('failed');
          }
          if (attempt < 2) await transport.wait();
        }
        // Même après un timeout, le serveur peut avoir persisté une collecte exploitable.
        if (!transport.mayRunJob || transport.mayRunJob()) {
          try {
            const summary = refreshSummarySchema.parse(await transport.job(freeze));
            statuses.push(summary.status);
            details.push(...(summary.details ?? []));
          } catch {
            statuses.push('failed');
          }
        } else {
          statuses.push('skipped');
        }
        return Promise.all(
          (chart === 'github' ? ['github', 'rising'] : [chart]).map(async (publicChart) => {
            try {
              return {
                chart: publicChart,
                statuses,
                details,
                ...verifyPublishedEdition(
                  await transport.current(publicChart),
                  publicChart,
                  new Date(Math.max(now.getTime(), Date.now())),
                  slot,
                ),
              };
            } catch {
              return {
                chart: publicChart,
                statuses,
                details,
                ok: false,
                edition: null,
                reason: 'Vérification publique indisponible.',
              };
            }
          }),
        );
      }),
  );
  const results = grouped.flat();
  return { ok: chartsChecksHealthy(results), slot, results };
}
