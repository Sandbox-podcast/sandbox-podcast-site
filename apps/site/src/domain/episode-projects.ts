import type { PersonalProject } from './personal-projects.ts';
import type { Episode } from './schema.ts';
import { episodeChapters } from './episode-presentation.ts';
import { episodeResources } from './episode-resources.ts';
import { resourceProject } from './project-resources.ts';

/** Un lien de source exact établit la relation ; les chapitres fournissent les instants vérifiables. */
export function episodeProjects(episode: Episode, projects: readonly PersonalProject[]) {
  const linked = new Set(
    episodeResources(episode).flatMap((resource) => {
      const project = resourceProject(resource.url, projects);
      return project ? [project.slug] : [];
    }),
  );
  return projects
    .filter((project) => linked.has(project.slug))
    .map((project) => ({
      project,
      chapters: episodeChapters(episode).filter((chapter) =>
        chapter.title.toLowerCase().includes(project.name.toLowerCase()),
      ),
      episodeNumber: episode.number,
      episodeTitle: episode.title,
    }));
}
