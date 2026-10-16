'use client';

import Image from 'next/image';
import {
  PROJECT_ACCESS_LABELS,
  PROJECT_CATEGORIES,
  PROJECT_CREATORS,
  personalProjectPath,
  type PersonalProject,
} from '@/domain/personal-projects';
import { ProjectGallery } from './project-gallery';
import styles from './video-club.module.css';

export function VideoClubDossier({ project }: { project: PersonalProject }) {
  const creator = PROJECT_CREATORS[project.creator];
  return (
    <article className={styles['dossier']}>
      <header className={styles['dossierHero']}>
        {project.icon ? <Image src={project.icon.src} alt="" width={86} height={86} /> : null}
        <div>
          <p className={styles['eyebrow']}>La fiche dans la boîte</p>
          <h2 id="video-club-project-title" tabIndex={-1}>
            {project.name}
          </h2>
          <p>{project.tagline}</p>
        </div>
      </header>
      <div className={styles['facts']}>
        <span>{creator.name}</span>
        <span>{PROJECT_CATEGORIES[project.category]}</span>
        <span>{PROJECT_ACCESS_LABELS[project.access]}</span>
      </div>
      <div className={styles['dossierActions']}>
        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles['primary']}
        >
          {project.access === 'source' ? 'Voir le code' : 'Découvrir le projet'}
        </a>
        <a href={personalProjectPath(project.slug)}>Ouvrir la fiche complète</a>
      </div>
      <ProjectGallery name={project.name} images={project.images} videos={project.videos} />
      <div className={styles['dossierColumns']}>
        <section aria-label="Présentation du projet">
          <h3>À propos du projet</h3>
          {project.description.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <h3>Ce que vous pouvez faire</h3>
          <ul>
            {project.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </section>
        <aside>
          <h3>Informations</h3>
          <dl>
            <dt>Création</dt>
            <dd>
              <a href={creator.url} target="_blank" rel="noopener noreferrer">
                {creator.name} / {creator.handle}
              </a>
            </dd>
            <dt>Plateformes</dt>
            <dd>{project.platforms.join(', ')}</dd>
            <dt>Disponibilité</dt>
            <dd>{PROJECT_ACCESS_LABELS[project.access]}</dd>
            {project.repository ? (
              <>
                <dt>Code source</dt>
                <dd>
                  <a href={project.repository} target="_blank" rel="noopener noreferrer">
                    GitHub
                  </a>
                </dd>
              </>
            ) : null}
            <dt>Fiche vérifiée le</dt>
            <dd>
              {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' }).format(
                new Date(`${project.verifiedAt}T12:00:00Z`),
              )}
            </dd>
          </dl>
          <details>
            <summary>Sources de cette fiche</summary>
            <ul>
              {project.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </aside>
      </div>
    </article>
  );
}
