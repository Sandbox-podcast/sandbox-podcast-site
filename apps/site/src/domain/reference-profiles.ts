import {
  referenceProfileSchema,
  type ReferenceProfile,
  type ReferenceSource,
} from './reference-ranking.ts';

function source(
  value: Pick<
    ReferenceSource,
    'id' | 'family' | 'upstream' | 'dataset' | 'label' | 'methodologyUrl' | 'rationale'
  > &
    Partial<ReferenceSource>,
): ReferenceSource {
  return {
    relevance: 1,
    rigor: 0.8,
    reproducibility: 0.8,
    manipulationResistance: 0.6,
    maximumAgeDays: 0,
    minimumSampleSize: 0,
    ...value,
  };
}
const github = source({
  id: 'github-momentum',
  family: 'attention',
  upstream: 'github',
  dataset: 'repository-momentum',
  label: 'GitHub',
  methodologyUrl: 'https://docs.github.com/en/rest/repos/repos#get-a-repository',
  rationale:
    "L'activité et la croissance mesurent l'attention des développeurs. Les stars restent manipulables et ne mesurent pas une qualité universelle.",
});
const scorecard = source({
  id: 'openssf-practices',
  family: 'engineering',
  upstream: 'openssf',
  dataset: 'scorecard-practices',
  label: 'OpenSSF Scorecard',
  methodologyUrl: 'https://github.com/ossf/scorecard/blob/main/docs/checks.md',
  maximumAgeDays: 14,
  rigor: 0.85,
  reproducibility: 1,
  manipulationResistance: 0.8,
  rationale:
    'Neuf contrôles de pratiques, dont six renseignés au minimum. Ce signal ne constitue pas un audit de sécurité du code.',
});
const base = {
  status: 'experimental' as const,
  disagreementPenalty: 0.2,
  sensitivityVariation: 0.2,
  size: 20,
  minimumCandidates: 20,
};
export const REFERENCE_PROFILES: Record<
  'github' | 'rising' | 'skills' | 'models',
  ReferenceProfile
> = {
  github: referenceProfileSchema.parse({
    ...base,
    version: 'github-reference-v3',
    chart: 'github',
    objective:
      "Progression sur sept jours des dépôts open source suivis, corroborée par leurs pratiques d'ingénierie.",
    families: [
      { id: 'attention', label: 'Dynamique GitHub', weight: 0.7 },
      { id: 'engineering', label: "Pratiques d'ingénierie", weight: 0.3 },
    ],
    sources: [github, scorecard],
  }),
  rising: referenceProfileSchema.parse({
    ...base,
    version: 'rising-reference-v3',
    chart: 'rising',
    objective:
      "Accélération sur sept jours des jeunes projets suivis, avec contrôle des pratiques d'ingénierie.",
    families: [
      { id: 'attention', label: 'Accélération GitHub', weight: 0.85 },
      { id: 'engineering', label: "Pratiques d'ingénierie", weight: 0.15 },
    ],
    sources: [{ ...github, id: 'github-rising', dataset: 'repository-rising' }, scorecard],
  }),
  skills: referenceProfileSchema.parse({
    ...base,
    version: 'skills-reference-v3',
    chart: 'skills',
    objective:
      'Adoption des skills sur sept jours, corroborée par la dynamique du dépôt GitHub qui les distribue.',
    families: [
      { id: 'adoption', label: 'Installations de skills', weight: 0.7 },
      { id: 'maintenance', label: 'Dynamique du dépôt', weight: 0.3 },
    ],
    sources: [
      source({
        id: 'skills-installs',
        family: 'adoption',
        upstream: 'skills-sh',
        dataset: 'cli-installs',
        label: 'Skills.sh',
        methodologyUrl: 'https://www.skills.sh/docs/api',
        rationale:
          'Installations mesurées par la télémétrie du CLI. Les installations ne prouvent ni exécution, ni réussite du skill.',
      }),
      {
        ...github,
        id: 'skill-repository',
        family: 'maintenance',
        rationale:
          'Stars gagnées et récence du dépôt. Plusieurs skills peuvent partager ce signal, qui ne décrit pas leur qualité individuelle.',
      },
    ],
  }),
  models: referenceProfileSchema.parse({
    ...base,
    version: 'models-reference-v3',
    chart: 'models',
    objective:
      'Capacités générales des variantes de modèles exactement identifiées, selon préférences humaines et évaluations standardisées.',
    families: [
      { id: 'evaluation', label: 'Évaluations standardisées', weight: 0.6 },
      { id: 'preference', label: 'Préférences humaines', weight: 0.4 },
    ],
    sources: [
      source({
        id: 'artificial-analysis',
        family: 'evaluation',
        upstream: 'artificial-analysis',
        dataset: 'intelligence-index',
        label: 'Artificial Analysis',
        methodologyUrl: 'https://artificialanalysis.ai/methodology/intelligence-benchmarking',
        maximumAgeDays: 14,
        rigor: 0.9,
        reproducibility: 0.7,
        manipulationResistance: 0.8,
        rationale:
          'Suite structurée de tâches, majoritairement textuelles et anglophones. La version du benchmark et la configuration du modèle doivent être contrôlées.',
      }),
      source({
        id: 'arena-text',
        family: 'preference',
        upstream: 'arena',
        dataset: 'text-style-control',
        label: 'Arena',
        methodologyUrl: 'https://arena.ai/faq',
        maximumAgeDays: 14,
        minimumSampleSize: 1000,
        rigor: 0.8,
        reproducibility: 0.8,
        manipulationResistance: 0.6,
        rationale:
          'Comparaisons humaines avec contrôle du style et au moins 1000 votes. Le recrutement des votants et la sélection des variantes peuvent créer un biais.',
      }),
    ],
  }),
};
