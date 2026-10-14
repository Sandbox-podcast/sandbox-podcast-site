import Image from 'next/image';
import type { CSSProperties } from 'react';
import { LocalizedLink as Link, Text } from './localization';
import {
  PROJECT_CATEGORIES,
  PROJECT_CREATORS,
  personalProjectPath,
  type PersonalProject,
  type ProjectSummary,
} from '@/domain/personal-projects';
import styles from './project-store.module.css';

export function ProjectIcon({
  project,
  large = false,
}: {
  project: ProjectSummary;
  large?: boolean;
}) {
  return (
    <span
      className={`${styles['icon']} ${large ? styles['largeIcon'] : ''}`}
      style={{ backgroundColor: project.color }}
      aria-hidden="true"
    >
      {project.icon ? (
        <Image src={project.icon.src} alt="" width={large ? 192 : 72} height={large ? 192 : 72} />
      ) : (
        <span>
          {project.name
            .split(/[\s-]+/)
            .slice(0, 2)
            .map((word) => word[0])
            .join('')}
        </span>
      )}
    </span>
  );
}

export function ProjectRow({ project }: { project: ProjectSummary }) {
  return (
    <li>
      <Link href={personalProjectPath(project.slug)} className={styles['appRow']}>
        <ProjectIcon project={project} />
        <span className={styles['appIdentity']}>
          <strong>{project.name}</strong>
          <span>
            <Text>{project.tagline}</Text>
          </span>
        </span>
        <span className={styles['showButton']}>
          <Text>Afficher</Text>
        </span>
      </Link>
    </li>
  );
}

export function ProjectFeature({
  project,
  eyebrow,
  title,
  subtitle,
}: {
  project: PersonalProject;
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={personalProjectPath(project.slug)}
      className={styles['feature']}
      style={{ '--project-color': project.color } as CSSProperties}
      aria-label={`Afficher ${project.name}`}
    >
      {project.cover ? (
        <Image
          src={project.cover.src}
          alt=""
          fill
          sizes="(max-width: 700px) 100vw, 70vw"
          preload
          className={styles['featureImage']}
        />
      ) : null}
      <span className={styles['featureShade']} />
      <span className={styles['featureCopy']}>
        <span className={styles['eyebrow']}>
          <Text>{eyebrow}</Text>
        </span>
        <strong>
          <Text>{title}</Text>
        </strong>
        <span>
          <Text>{subtitle}</Text>
        </span>
      </span>
      <span className={styles['featureFooter']}>
        <ProjectIcon project={project} />
        <span className={styles['appIdentity']}>
          <strong>{project.name}</strong>
          <span>
            <Text>{PROJECT_CATEGORIES[project.category]}</Text>
            {' · '}
            {PROJECT_CREATORS[project.creator].name}
          </span>
        </span>
        <span className={styles['showButton']}>
          <Text>Afficher</Text>
        </span>
      </span>
    </Link>
  );
}

export function ProjectShelf({
  eyebrow,
  title,
  projects,
}: {
  eyebrow: string;
  title: string;
  projects: readonly ProjectSummary[];
}) {
  return (
    <section className={styles['shelf']}>
      <p className={styles['eyebrow']}>
        <Text>{eyebrow}</Text>
      </p>
      <h3>
        <Text>{title}</Text>
      </h3>
      <ul className={styles['shelfList']} aria-label={title}>
        {projects.map((project) => (
          <ProjectRow key={project.slug} project={project} />
        ))}
      </ul>
    </section>
  );
}
