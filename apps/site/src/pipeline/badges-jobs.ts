import { assignClosedRisingStars } from '../lib/badges-store.ts';
import { beginChartsJob, finishChartsJob } from '../lib/charts-store.ts';
import { assignClosedAwards } from '../lib/awards-store.ts';
import type { AwardType } from '../domain/awards.ts';

export async function runRisingStarAwards(options: { week?: string } = {}) {
  const id = await beginChartsJob('rising_star_awards');
  const summary = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    snapshotsCreated: 0,
    status: 'skipped',
    details: [] as string[],
  };
  if (!id) return summary;
  try {
    const result = await assignClosedRisingStars(options);
    summary.processed = result.considered;
    summary.succeeded = result.created;
    summary.snapshotsCreated = result.created;
    summary.status = result.created || result.existing ? 'success' : 'insufficient_history';
    summary.details.push(
      `Rising Star : ${result.created} attribution(s), ${result.existing} déjà conservée(s), ${result.considered} dimanche(s) examiné(s).`,
    );
  } catch (error) {
    summary.status = 'failed';
    summary.failed = 1;
    // Les messages SQL peuvent contenir des données de connexion : seul le type est journalisé.
    summary.details.push(
      `Rising Star indisponible : ${error instanceof Error ? error.name : 'unknown'}.`,
    );
  }
  await finishChartsJob(id, summary);
  return summary;
}

/** Réutilise le gel quotidien et le verrou opérateur existants, sans nouveau cron. */
export async function runAllBadgeAwards(
  options: { type?: AwardType; period?: string; scope?: string } = {},
) {
  const id = await beginChartsJob('badge_awards');
  const summary = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    snapshotsCreated: 0,
    status: 'skipped',
    details: [] as string[],
  };
  if (!id) return summary;
  let retained = 0;
  if (!options.type || options.type === 'rising-star') {
    try {
      const result = await assignClosedRisingStars(options.period ? { week: options.period } : {});
      summary.processed += result.considered;
      summary.succeeded += result.created;
      retained += result.existing;
      summary.details.push(
        `Rising Star : ${result.created} attribution(s), ${result.existing} déjà conservée(s).`,
      );
    } catch (error) {
      summary.failed++;
      summary.details.push(
        `Rising Star indisponible : ${error instanceof Error ? error.name : 'unknown'}.`,
      );
    }
  }
  if (options.type !== 'rising-star') {
    try {
      const result = await assignClosedAwards(options);
      summary.processed += result.considered;
      summary.succeeded += result.created;
      retained += result.existing;
      summary.failed += result.failed;
      summary.details.push(
        `Awards : ${result.created} attribution(s), ${result.existing} déjà conservée(s), ${result.failed} échec(s).`,
      );
    } catch (error) {
      summary.failed++;
      summary.details.push(
        `Awards indisponibles : ${error instanceof Error ? error.name : 'unknown'}.`,
      );
    }
  }
  summary.snapshotsCreated = summary.succeeded;
  summary.status = summary.failed
    ? 'failed'
    : summary.succeeded || retained
      ? 'success'
      : 'insufficient_history';
  await finishChartsJob(id, summary);
  return summary;
}
