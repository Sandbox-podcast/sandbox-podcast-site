import catalog from '../../content/personal-projects.json';
import { personalProjectCatalogSchema } from '@/domain/personal-projects';

/** Catalogue vérifié dans Git : aucune collecte réseau pendant une visite. */
export const personalProjects = personalProjectCatalogSchema.parse(catalog);

export function personalProject(slug: string) {
  return personalProjects.find((project) => project.slug === slug);
}
