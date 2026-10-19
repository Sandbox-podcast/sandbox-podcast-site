/** Vide plusieurs lots sans dépasser la durée réservée au traitement horaire. */
export async function drainNewsQueue(
  processBatch: () => Promise<{ candidates: number; published: number; skipped: number }>,
  options: {
    budgetMs?: number;
    maxBatches?: number;
    now?: () => number;
    onError?: (error: unknown) => void;
  } = {},
) {
  const now = options.now ?? Date.now;
  const deadline = now() + (options.budgetMs ?? 22 * 60_000);
  const report = {
    batches: 0,
    candidates: 0,
    published: 0,
    skipped: 0,
    failures: 0,
    drained: false,
  };
  let consecutiveFailures = 0;
  while (report.batches < (options.maxBatches ?? 30) && now() < deadline) {
    try {
      const batch = await processBatch();
      consecutiveFailures = 0;
      if (!batch.candidates) {
        report.drained = true;
        break;
      }
      report.candidates += batch.candidates;
      report.published += batch.published;
      report.skipped += batch.skipped;
    } catch (error) {
      options.onError?.(error);
      report.failures++;
      consecutiveFailures++;
    }
    report.batches++;
    if (consecutiveFailures >= 3) break;
    // Huit minutes pour la génération et deux pour chacune des trois langues.
    if (deadline - now() < 14 * 60_000) break;
  }
  return report;
}
