import { z } from 'zod';

/**
 * Modèle de données du site média (ADR-0015).
 *
 * Trois couches, qui ne se mélangent jamais :
 * - DATA      : métriques récupérées par les connecteurs (provenance `auto`) ou simulées (`mock`) ;
 * - ÉDITORIAL : textes écrits par l'équipe (avis, épisodes, articles) ;
 * - DÉRIVÉ    : mouvements, séries, statistiques calculés à partir des deux premières, jamais stockés.
 */

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug en minuscules, chiffres et tirets');
export const weekIdSchema = z
  .string()
  .regex(/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/, 'semaine ISO AAAA-Wnn');
export const dateTimeSchema = z.iso.datetime();
export const httpsUrlSchema = z.url().refine((u) => u.startsWith('https://'), 'URL https requise');

/** `mock` : donnée de démonstration, jamais issue d'une API. `auto` : connecteur. `editorial` : saisie humaine. */
export const provenanceSchema = z.enum(['auto', 'editorial', 'mock']);
export type Provenance = z.infer<typeof provenanceSchema>;

export const unitSchema = z.enum(['count', 'percent', 'score', 'usd', 'tokens', 'tps', 'ratio']);
export type Unit = z.infer<typeof unitSchema>;

// ---------------------------------------------------------------------------------------------
// Équipe, thèmes, sources
// ---------------------------------------------------------------------------------------------

export const hostSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1),
  handle: z.string().min(1),
  role: z.string().min(1),
  bio: z.string().min(1),
  socials: z
    .object({
      linkedin: httpsUrlSchema.optional(),
      github: httpsUrlSchema.optional(),
      x: httpsUrlSchema.optional(),
    })
    .default({}),
  /** Profil fictif de démonstration à remplacer. */
  placeholder: z.boolean().default(false),
});
export type Host = z.infer<typeof hostSchema>;

export const topicSchema = z.object({
  slug: slugSchema,
  label: z.string().min(1),
  description: z.string().min(1),
});
export type Topic = z.infer<typeof topicSchema>;

export const sourceSchema = z.object({
  id: slugSchema,
  label: z.string().min(1),
  url: httpsUrlSchema,
  kind: z.enum(['api', 'leaderboard', 'vendor', 'editorial', 'derived']),
  /** Ce que la source fournit, en une phrase. */
  provides: z.string().min(1),
  /** `connected` : un connecteur existe. `planned` : cible documentée, pas encore branchée. */
  status: z.enum(['connected', 'planned', 'manual']),
});
export type Source = z.infer<typeof sourceSchema>;

/** Texte de marque éditorialisable depuis le backoffice. */
export const siteSettingsSchema = z.object({
  name: z.string().min(1),
  wordmark: z.tuple([z.string().min(1), z.string().min(1)]),
  tagline: z.string().min(1),
  strapline: z.string().min(1),
  description: z.string().min(1),
  heroEyebrow: z.string().min(1),
  heroTitle: z.string().min(1),
  heroDek: z.string().min(1),
  platforms: z.object({
    youtube: httpsUrlSchema,
    spotify: httpsUrlSchema,
    apple: httpsUrlSchema,
  }),
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;

// ---------------------------------------------------------------------------------------------
// Entités (projets, modèles, outils)
// ---------------------------------------------------------------------------------------------

export const entityKindSchema = z.enum(['project', 'model', 'tool']);
export type EntityKind = z.infer<typeof entityKindSchema>;

export const entityLinkSchema = z.object({
  kind: z.enum(['github', 'site', 'docs', 'paper', 'huggingface', 'x', 'other']),
  label: z.string().min(1),
  url: httpsUrlSchema,
});
export type EntityLink = z.infer<typeof entityLinkSchema>;

export const entitySchema = z.object({
  slug: slugSchema,
  kind: entityKindSchema,
  name: z.string().min(1),
  org: z.string().min(1).optional(),
  tagline: z.string().min(1).max(110),
  description: z.string().min(1),
  category: z.string().min(1),
  topics: z.array(slugSchema).default([]),
  license: z.string().min(1).optional(),
  openWeights: z.boolean().optional(),
  links: z.array(entityLinkSchema).min(1),
  /** Concurrents choisis par l'équipe. Les voisins de classement sont ajoutés automatiquement. */
  alternatives: z.array(slugSchema).default([]),
  /** Identité visuelle sans image externe : monogramme et teinte (0 à 6). */
  mark: z.object({ glyph: z.string().min(1).max(3), tone: z.number().int().min(0).max(6) }),
  /** Identifiants utilisés par les connecteurs. */
  github: z.object({ repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/) }).optional(),
  huggingface: z.object({ id: z.string().min(1) }).optional(),
});
export type Entity = z.infer<typeof entitySchema>;

// ---------------------------------------------------------------------------------------------
// Classements : définition, scoring, méthodologie
// ---------------------------------------------------------------------------------------------

export const metricDefSchema = z.object({
  key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/),
  label: z.string().min(1),
  unit: unitSchema,
  decimals: z.number().int().min(0).max(2).default(0),
  source: slugSchema,
  higherIsBetter: z.boolean().default(true),
  description: z.string().optional(),
});
export type MetricDef = z.infer<typeof metricDefSchema>;

/** Métrique dérivée de métriques brutes, calculée avant le scoring. */
export const derivedMetricSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('ratio'),
    key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/),
    label: z.string().min(1),
    unit: unitSchema,
    decimals: z.number().int().min(0).max(2).default(1),
    numerator: z.string(),
    denominator: z.string(),
    scale: z.number().default(1),
    higherIsBetter: z.boolean().default(true),
  }),
  z.object({
    kind: z.literal('weighted-sum'),
    key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/),
    label: z.string().min(1),
    unit: unitSchema,
    decimals: z.number().int().min(0).max(2).default(2),
    terms: z.array(z.object({ metric: z.string(), weight: z.number() })).min(1),
    divisor: z.number().default(1),
    higherIsBetter: z.boolean().default(true),
  }),
]);
export type DerivedMetricDef = z.infer<typeof derivedMetricSchema>;

/** Comment une métrique devient un sous-score de 0 à 100. */
export const scaleSchema = z.discriminatedUnion('kind', [
  /** La valeur est déjà sur 0–100. */
  z.object({ kind: z.literal('identity') }),
  /** Plancher et plafond fixes : le score ne dépend pas des autres candidats. */
  z.object({
    kind: z.literal('range'),
    min: z.number(),
    max: z.number(),
    transform: z.enum(['linear', 'log']).default('linear'),
    invert: z.boolean().default(false),
  }),
  /** Min–max sur les candidats de la semaine : mesure un rang relatif. */
  z.object({
    kind: z.literal('pool'),
    transform: z.enum(['linear', 'log']).default('linear'),
    invert: z.boolean().default(false),
  }),
]);
export type Scale = z.infer<typeof scaleSchema>;

export const componentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('metric'),
    metric: z.string(),
    weight: z.number().positive(),
    scale: scaleSchema,
  }),
  z.object({ type: z.literal('dimension'), dimension: z.string(), weight: z.number().positive() }),
]);
export type Component = z.infer<typeof componentSchema>;

export const dimensionSchema = z.object({
  id: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/),
  label: z.string().min(1),
  description: z.string().min(1),
  components: z.array(componentSchema).min(1),
});
export type Dimension = z.infer<typeof dimensionSchema>;

/** Profil de scoring partagé par plusieurs classements (content/scoring/*.json). */
export const scoringProfileSchema = z.object({
  id: slugSchema,
  metrics: z.array(metricDefSchema).min(1),
  derived: z.array(derivedMetricSchema).default([]),
  /** Les dimensions sont évaluées dans l'ordre : une dimension ne peut citer que les précédentes. */
  dimensions: z.array(dimensionSchema).min(1),
  primary: z.string(),
});
export type ScoringProfile = z.infer<typeof scoringProfileSchema>;

export const methodologySchema = z.object({
  summary: z.string().min(1),
  sources: z.array(z.object({ source: slugSchema, usage: z.string().min(1) })).min(1),
  criteria: z.array(z.object({ label: z.string().min(1), detail: z.string().min(1) })).min(1),
  frequency: z.string().min(1),
  limits: z.array(z.string().min(1)).min(1),
  changelog: z.array(z.object({ week: weekIdSchema, note: z.string().min(1) })).default([]),
});
export type Methodology = z.infer<typeof methodologySchema>;

export const chartSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1),
  /** Étiquette courte pour les en-têtes et les cartes. */
  short: z.string().min(1),
  /** Code court affiché dans les pastilles (GH, AI…). */
  code: z.string().min(1).max(4),
  entityKind: entityKindSchema,
  scoring: slugSchema,
  /** Nombre de places du classement officiel. */
  size: z.number().int().min(3).max(25).default(10),
  /** Filtre de pool pour les entités : `all` ou `openWeights`. */
  pool: z.enum(['all', 'openWeights']).default('all'),
  tone: z.number().int().min(0).max(6),
  tagline: z.string().min(1),
  description: z.string().min(1),
  /** Dimensions affichées en pastilles dans chaque ligne. */
  highlights: z.array(z.string()).min(1).max(4),
  /** Vues de tri proposées sur la page (la première est le classement officiel). */
  views: z.array(z.object({ id: z.string(), label: z.string() })).min(1),
  /** Métriques secondaires affichées dans la fiche détaillée de chaque entrée. */
  detailMetrics: z.array(z.string()).min(1),
  /** Métrique dont l'historique est tracé sur les fiches (étoiles, prix…). */
  trackedMetric: z.string(),
  /** Départage à score égal. */
  tiebreak: z.string(),
  methodology: methodologySchema,
  seo: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    keywords: z.array(z.string()).default([]),
  }),
});
export type ChartDef = z.infer<typeof chartSchema>;

// ---------------------------------------------------------------------------------------------
// Snapshots hebdomadaires (immuables, écrits par le pipeline)
// ---------------------------------------------------------------------------------------------

export const snapshotEntrySchema = z.object({
  entity: slugSchema,
  rank: z.number().int().min(1),
  score: z.number(),
  dimensions: z.record(z.string(), z.number()),
  metrics: z.record(z.string(), z.number()),
});
export type SnapshotEntry = z.infer<typeof snapshotEntrySchema>;

export const snapshotSchema = z
  .object({
    chart: slugSchema,
    week: weekIdSchema,
    publishedAt: dateTimeSchema,
    retrievedAt: dateTimeSchema,
    provenance: provenanceSchema,
    entries: z.array(snapshotEntrySchema).min(1),
  })
  .superRefine((snap, ctx) => {
    snap.entries.forEach((entry, i) => {
      if (entry.rank !== i + 1) {
        ctx.addIssue({
          code: 'custom',
          message: `rang ${String(entry.rank)} inattendu à la position ${String(i + 1)}`,
          path: ['entries', i, 'rank'],
        });
      }
      const next = snap.entries[i + 1];
      if (next && next.score > entry.score) {
        ctx.addIssue({
          code: 'custom',
          message: 'scores non décroissants',
          path: ['entries', i + 1, 'score'],
        });
      }
    });
    const seen = new Set<string>();
    snap.entries.forEach((entry, i) => {
      if (seen.has(entry.entity)) {
        ctx.addIssue({
          code: 'custom',
          message: 'entité en double',
          path: ['entries', i, 'entity'],
        });
      }
      seen.add(entry.entity);
    });
  });
export type Snapshot = z.infer<typeof snapshotSchema>;

// ---------------------------------------------------------------------------------------------
// Éditorial : avis, épisodes, articles
// ---------------------------------------------------------------------------------------------

/** OUR TAKE. Jamais mélangé aux données : composant et styles distincts. */
export const takeSchema = z.object({
  id: slugSchema,
  entity: slugSchema,
  /** Si renseignés, l'avis s'attache à une entrée de classement précise. */
  chart: slugSchema.optional(),
  week: weekIdSchema.optional(),
  host: slugSchema,
  text: z.string().min(1).max(320),
  publishedAt: dateTimeSchema,
});
export type Take = z.infer<typeof takeSchema>;

export const mentionKindSchema = z.enum([
  'repo',
  'model',
  'article',
  'tweet',
  'video',
  'product',
  'tool',
  'paper',
  'site',
  'benchmark',
]);
export type MentionKind = z.infer<typeof mentionKindSchema>;

export const mentionSchema = z.object({
  kind: mentionKindSchema,
  label: z.string().min(1),
  /** Absent : lien à compléter (signalé par la page d'administration, jamais inventé). */
  url: httpsUrlSchema.optional(),
  entity: slugSchema.optional(),
  /** Seconde dans l'épisode où le sujet est évoqué. */
  at: z.number().int().min(0).optional(),
  note: z.string().optional(),
});
export type Mention = z.infer<typeof mentionSchema>;

export const episodeSchema = z.object({
  number: z.number().int().min(1),
  title: z.string().min(1),
  dek: z.string().min(1),
  publishedAt: dateTimeSchema,
  durationSec: z.number().int().min(60),
  description: z.string().min(1),
  hosts: z.array(slugSchema).min(1),
  guests: z.array(z.object({ name: z.string(), role: z.string() })).default([]),
  topics: z.array(slugSchema).default([]),
  chapters: z.array(z.object({ at: z.number().int().min(0), title: z.string().min(1) })).min(1),
  mentions: z.array(mentionSchema).default([]),
  /** Sources utilisées pour préparer l'épisode. */
  sources: z
    .array(
      z.object({
        kind: mentionKindSchema,
        label: z.string().min(1),
        url: httpsUrlSchema,
        publisher: z.string().optional(),
      }),
    )
    .default([]),
  platforms: z
    .object({
      youtubeId: z.string().optional(),
      youtubeUrl: httpsUrlSchema.optional(),
      spotifyUrl: httpsUrlSchema.optional(),
      appleUrl: httpsUrlSchema.optional(),
      audioUrl: httpsUrlSchema.optional(),
    })
    .default({}),
  /** Classements commentés dans l'épisode. */
  charts: z.array(z.object({ chart: slugSchema, week: weekIdSchema })).default([]),
  cover: z.object({ tone: z.number().int().min(0).max(6), kicker: z.string().min(1) }),
});
export type Episode = z.infer<typeof episodeSchema>;

export const storyTypeSchema = z.enum([
  'news',
  'analysis',
  'experiment',
  'benchmark',
  'guide',
  'opinion',
  'recap',
]);
export type StoryType = z.infer<typeof storyTypeSchema>;

/**
 * Corps d'un article : blocs structurés, jamais de HTML brut (AGENTS.md : tout HTML utilisateur est isolé,
 * donc on n'en accepte pas). Le texte en ligne accepte un balisage minimal, voir `markup.ts`.
 */
export const blockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('p'), text: z.string().min(1) }),
  z.object({ type: z.literal('h2'), text: z.string().min(1) }),
  z.object({ type: z.literal('h3'), text: z.string().min(1) }),
  z.object({ type: z.literal('quote'), text: z.string().min(1), cite: z.string().optional() }),
  z.object({
    type: z.literal('list'),
    ordered: z.boolean().default(false),
    items: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal('callout'),
    tone: z.enum(['note', 'warning']).default('note'),
    title: z.string().optional(),
    text: z.string().min(1),
  }),
  z.object({
    type: z.literal('stat'),
    items: z
      .array(z.object({ value: z.string().min(1), label: z.string().min(1) }))
      .min(1)
      .max(4),
  }),
  z.object({ type: z.literal('code'), language: z.string().optional(), code: z.string().min(1) }),
  z.object({
    type: z.literal('chart'),
    chart: slugSchema,
    week: weekIdSchema.optional(),
    top: z.number().int().min(3).max(10).default(5),
  }),
  z.object({ type: z.literal('entity'), entity: slugSchema }),
]);
export type Block = z.infer<typeof blockSchema>;

export const relationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('episode'), number: z.number().int() }),
  z.object({ kind: z.literal('chart'), chart: slugSchema, week: weekIdSchema.optional() }),
  z.object({ kind: z.literal('entity'), entity: slugSchema }),
  z.object({ kind: z.literal('story'), slug: slugSchema }),
]);
export type Relation = z.infer<typeof relationSchema>;

export const storySchema = z.object({
  /** Identifiant stable conservé si le slug public change. */
  id: slugSchema.optional(),
  slug: slugSchema,
  type: storyTypeSchema,
  title: z.string().min(1),
  dek: z.string().min(1),
  publishedAt: dateTimeSchema,
  updatedAt: dateTimeSchema.optional(),
  author: slugSchema,
  topics: z.array(slugSchema).default([]),
  featured: z.boolean().default(false),
  related: z.array(relationSchema).default([]),
  body: z.array(blockSchema).min(1),
  /** Sources citées dans l'article. */
  sources: z.array(z.object({ label: z.string().min(1), url: httpsUrlSchema })).default([]),
});
export type Story = z.infer<typeof storySchema>;

// ---------------------------------------------------------------------------------------------
// Dérivés (jamais stockés)
// ---------------------------------------------------------------------------------------------

export type MovementKind = 'up' | 'down' | 'stable' | 'new' | 're';

export interface Movement {
  entity: string;
  kind: MovementKind;
  rank: number;
  previousRank: number | null;
  /** Positions gagnées (positif) ou perdues (négatif) ; 0 si stable, nouveau ou retour. */
  delta: number;
}

export interface OutMovement {
  entity: string;
  previousRank: number;
  /** Rang actuel dans le pool si l'entité y est encore (« bubbling under »). */
  currentRank: number | null;
}
