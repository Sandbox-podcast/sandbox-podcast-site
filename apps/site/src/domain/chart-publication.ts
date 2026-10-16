import { z } from 'zod';
import type { Snapshot } from './schema.ts';

export const chartPublicationSchema = z.object({
  scoringVersion: z.string().min(1),
  observedAt: z.iso.datetime(),
  calculatedAt: z.iso.datetime(),
  publishedAt: z.iso.datetime().nullable(),
});
export type ChartPublication = z.infer<typeof chartPublicationSchema>;
export type PublishedSnapshot = Snapshot & { publication?: ChartPublication };

/** La description suit la version figée, jamais le profil prévu pour les prochaines éditions. */
export function chartMethodSummary(chart: string, version?: string) {
  if (version === 'github-momentum-v1+stars')
    return {
      label: 'Popularité GitHub',
      description:
        "Cette édition classe les stars cumulées. L'historique disponible ne permettait pas encore de mesurer leur progression sur sept jours.",
    };
  if (version === 'skills-installs-v1')
    return {
      label: 'Popularité Skills.sh',
      description:
        'Cette édition classe les installations cumulées de Skills.sh. Les étoiles GitHub sont un contexte, pas une seconde mesure du score.',
    };
  if (version === 'models-cross-source-v1')
    return {
      label: 'Mesures de modèles disponibles',
      description:
        'Les sources disponibles varient selon les modèles de cette édition. Un score ne garantit pas deux évaluations indépendantes ni une mesure du rapport qualité-prix.',
    };
  if (version?.endsWith('-reference-v3'))
    return {
      label: 'Score pondéré de référence',
      description:
        'Le score combine les sources du profil figé de cette édition. Les pondérations sont des choix éditoriaux ; elles ne prouvent pas une qualité universelle.',
    };
  return {
    label: 'Score de cette édition',
    description:
      chart === 'models'
        ? 'Les mesures de modèles se lisent avec leurs sources, leur couverture et leurs limites.'
        : 'Les rangs décrivent le pool observé. Les mesures de popularité et les avis de notre équipe restent distincts.',
  };
}

export function chartMethodPath(slug: string, edition?: string): string {
  const base = `/charts/${slug}/methodology`;
  return edition ? `${base}?edition=${encodeURIComponent(edition)}` : base;
}

export function hasModelMeasure(snapshot: PublishedSnapshot | undefined, view: string): boolean {
  if (!snapshot || view === 'open') return true;
  // Cette version historique publiait parfois la même note en « qualité » et « valeur » sans prix.
  if (snapshot.publication?.scoringVersion === 'models-cross-source-v1' && view === 'value')
    return false;
  return snapshot.entries.some((entry) => entry.dimensions[view] !== undefined);
}
