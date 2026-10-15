import type { Snapshot } from './schema.ts';

export const DEMO_CONTENT_DESCRIPTION =
  "Les chiffres, classements et avis simulés de cette page ont été retirés de l'affichage public.";

/** Une seule mesure simulée suffit à rendre tout l'historique impropre à la publication. */
export function hasDemoSnapshots(snapshots: readonly Snapshot[]): boolean {
  return snapshots.some((snapshot) => snapshot.provenance === 'mock');
}

export function hasDemoEntityHistory(
  snapshots: Readonly<Record<string, readonly Snapshot[]>>,
  slug: string,
): boolean {
  return Object.values(snapshots).some((history) =>
    history.some(
      (snapshot) =>
        snapshot.provenance === 'mock' && snapshot.entries.some((entry) => entry.entity === slug),
    ),
  );
}
