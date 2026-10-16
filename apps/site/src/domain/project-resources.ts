import type { PersonalProject } from './personal-projects.ts';

export function resourceProject(url: string | undefined, projects: readonly PersonalProject[]) {
  if (!url) return undefined;
  const normalize = (value: string) => value.replace(/\/$/, '').toLowerCase();
  return projects.find((project) =>
    [project.url, project.repository].some(
      (candidate) => candidate && normalize(candidate) === normalize(url),
    ),
  );
}
