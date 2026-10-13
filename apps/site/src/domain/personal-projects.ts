import { z } from 'zod';
import { httpsUrlSchema, slugSchema } from './schema';

export const PROJECT_CREATORS = {
  nicolas: { name: 'Nicolas', handle: 'MarlBurroW', url: 'https://github.com/MarlBurroW' },
  loic: { name: 'Loïc', handle: 'azerothl', url: 'https://github.com/azerothl' },
  lou: { name: 'Lou', handle: 'loukan42', url: 'https://github.com/loukan42' },
} as const;

export const PROJECT_CATEGORIES = {
  ai: 'IA et agents',
  games: 'Jeux',
  education: 'Éducation',
  tools: 'Outils',
  science: 'Sciences',
  culture: 'Culture et société',
  music: 'Musique',
} as const;

const localAssetSchema = z
  .string()
  .regex(/^\/nos-projets\/[a-z0-9-]+\/(?:[a-z0-9-]+\.(?:webp|png|jpg|svg|mp4|webm))$/);

export const projectImageSchema = z.object({
  src: localAssetSchema.refine((src) => /\.(?:webp|png|jpg|svg)$/.test(src), 'Image requise'),
  alt: z.string().min(1),
  sourceUrl: httpsUrlSchema,
  kind: z.enum(['screenshot', 'artwork', 'logo']),
});

export const personalProjectSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1),
  tagline: z.string().min(1),
  creator: z.enum(['nicolas', 'loic', 'lou']),
  category: z.enum(['ai', 'games', 'education', 'tools', 'science', 'culture', 'music']),
  url: httpsUrlSchema,
  repository: httpsUrlSchema.optional(),
  access: z.enum([
    'website',
    'self-hosted',
    'desktop',
    'extension',
    'source',
    'preview',
    'archived',
  ]),
  platforms: z.array(z.string().min(1)).min(1),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  icon: projectImageSchema.optional(),
  cover: projectImageSchema.optional(),
  images: z.array(projectImageSchema).default([]),
  videos: z
    .array(
      z.object({
        title: z.string().min(1),
        src: z.union([
          localAssetSchema.refine((src) => /\.(?:mp4|webm)$/.test(src), 'Vidéo requise'),
          httpsUrlSchema.refine((src) => {
            const url = new URL(src);
            return (
              ['marlburrow.github.io', 'raw.githubusercontent.com'].includes(url.hostname) &&
              /\.(?:mp4|webm)$/.test(url.pathname)
            );
          }, 'Origine vidéo non autorisée'),
        ]),
        poster: localAssetSchema,
        sourceUrl: httpsUrlSchema,
        kind: z.enum(['demo', 'presentation']),
      }),
    )
    .default([]),
  description: z.array(z.string().min(1)).min(2),
  features: z.array(z.string().min(1)).min(1),
  sources: z.array(z.object({ label: z.string().min(1), url: httpsUrlSchema })).min(1),
  verifiedAt: z.iso.date(),
});

export type ProjectImage = z.infer<typeof projectImageSchema>;
export type PersonalProject = z.infer<typeof personalProjectSchema>;
export type ProjectCategory = PersonalProject['category'];
export type ProjectCreator = PersonalProject['creator'];
export type ProjectSummary = Pick<
  PersonalProject,
  'slug' | 'name' | 'tagline' | 'creator' | 'category' | 'color' | 'icon' | 'access'
>;

export const personalProjectCatalogSchema = z
  .array(personalProjectSchema)
  .superRefine((projects, ctx) => {
    const seen = new Set<string>();
    for (const [index, project] of projects.entries()) {
      if (seen.has(project.slug))
        ctx.addIssue({ code: 'custom', path: [index, 'slug'], message: 'Projet en double' });
      seen.add(project.slug);
    }
  });

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr-FR');
}

/** Les filtres se combinent, la recherche ignore les accents et reste indépendante des I/O. */
export function filterPersonalProjects<T extends ProjectSummary>(
  projects: readonly T[],
  filters: { query?: string; category?: string; creator?: string } = {},
): T[] {
  const words = normalizeSearch(filters.query?.trim() ?? '')
    .split(/\s+/)
    .filter(Boolean);
  return projects.filter((project) => {
    if (filters.category && project.category !== filters.category) return false;
    if (filters.creator && project.creator !== filters.creator) return false;
    const creator = PROJECT_CREATORS[project.creator];
    const haystack = normalizeSearch(
      `${project.name} ${project.tagline} ${PROJECT_CATEGORIES[project.category]} ${creator.name} ${creator.handle}`,
    );
    return words.every((word) => haystack.includes(word));
  });
}

export function projectSummary(project: PersonalProject): ProjectSummary {
  const { slug, name, tagline, creator, category, color, icon, access } = project;
  return { slug, name, tagline, creator, category, color, icon, access };
}

export const personalProjectPath = (slug: string): string => `/nos-projets/${slug}`;

export const PROJECT_ACCESS_LABELS = {
  website: 'En ligne',
  'self-hosted': 'À héberger',
  desktop: 'À installer',
  extension: 'Extension',
  source: 'Code source',
  preview: 'En préparation',
  archived: 'Archivé',
} as const;
