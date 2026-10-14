import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';
import { CopyButton } from '@/components/client';
import { JsonLd } from '@/components/json-ld';
import { ProjectGallery } from '@/components/project-gallery';
import { ProjectIcon, ProjectRow } from '@/components/project-store';
import { LocalizedLink as Link, LocalizedDate, Text } from '@/components/localization';
import {
  PROJECT_ACCESS_LABELS,
  PROJECT_CATEGORIES,
  PROJECT_CREATORS,
  personalProjectPath,
} from '@/domain/personal-projects';
import { personalProject, personalProjects } from '@/lib/personal-projects';
import { absoluteUrl, breadcrumbLd, pageMetadata } from '@/lib/seo';
import styles from '@/components/project-store.module.css';

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return personalProjects.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = personalProject(slug);
  if (!project) notFound();
  const metadata = pageMetadata({
    title: `${project.name} : ${project.tagline}`,
    description: project.description[0] ?? project.tagline,
    path: personalProjectPath(slug),
    noindex: false,
  });
  const cover = project.cover ?? project.images[0] ?? project.icon;
  if (cover) {
    const image = { url: absoluteUrl(cover.src), alt: cover.alt };
    metadata.openGraph = { ...metadata.openGraph, images: [image] };
    metadata.twitter = { ...metadata.twitter, card: 'summary_large_image', images: [image] };
  }
  return metadata;
}

export default async function PersonalProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = personalProject(slug);
  if (!project) notFound();
  const creator = PROJECT_CREATORS[project.creator];
  const related = personalProjects
    .filter((item) => item.slug !== slug && item.creator === project.creator)
    .slice(0, 6);
  const codeOnly = project.access === 'source';
  return (
    <article className={styles['page']}>
      <JsonLd
        data={breadcrumbLd([
          { name: 'Nos projets', path: '/nos-projets' },
          { name: project.name, path: personalProjectPath(slug) },
        ])}
      />
      <div className={styles['wrap']}>
        <Link href="/nos-projets" className={styles['back']}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="m15 5-7 7 7 7" />
          </svg>
          <Text>Nos projets</Text>
        </Link>
      </div>
      <header
        className={styles['detailHero']}
        style={{ '--project-color': project.color } as CSSProperties}
      >
        {project.cover ? (
          <span className={styles['heroBackdrop']}>
            <Image src={project.cover.src} alt="" fill sizes="100vw" />
          </span>
        ) : null}
        <div className={`${styles['wrap']} ${styles['heroInner']}`}>
          <ProjectIcon project={project} large />
          <div className={styles['heroIdentity']}>
            <h1>{project.name}</h1>
            <p>
              <Text>{project.tagline}</Text>
            </p>
            <a
              href={creator.url}
              className={styles['creatorLine']}
              target="_blank"
              rel="noopener noreferrer"
            >
              {creator.name} / {creator.handle}
            </a>
            <div className={styles['heroActions']}>
              <a
                href={project.url}
                className={styles['pill']}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Text>
                  {codeOnly
                    ? 'Voir le code'
                    : project.access === 'archived'
                      ? 'Voir la présentation'
                      : project.access === 'desktop' || project.access === 'extension'
                        ? 'Télécharger'
                        : project.access === 'self-hosted'
                          ? 'Découvrir'
                          : project.access === 'preview'
                            ? 'Découvrir le projet'
                            : 'Ouvrir'}
                </Text>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M7 17 17 7M7 7h10v10" />
                </svg>
              </a>
              <span className={styles['share']}>
                <CopyButton text={personalProjectPath(slug)} label="Partager" />
              </span>
            </div>
          </div>
        </div>
      </header>
      <div className={styles['wrap']}>
        <dl className={styles['facts']}>
          <div>
            <dt>
              <Text>Catégorie</Text>
            </dt>
            <dd>
              <Text>{PROJECT_CATEGORIES[project.category]}</Text>
            </dd>
          </div>
          <div>
            <dt>
              <Text>Création</Text>
            </dt>
            <dd>
              {creator.name}
              <small>{creator.handle}</small>
            </dd>
          </div>
          <div>
            <dt>
              <Text>Plateforme</Text>
            </dt>
            <dd>
              <Text>{project.platforms[0]}</Text>
              {project.platforms.length > 1 ? (
                <small>
                  <Text>{project.platforms.slice(1).join(', ')}</Text>
                </small>
              ) : null}
            </dd>
          </div>
          <div>
            <dt>
              <Text>Disponibilité</Text>
            </dt>
            <dd>
              <Text>{PROJECT_ACCESS_LABELS[project.access]}</Text>
            </dd>
          </div>
          <div>
            <dt>
              <Text>Projet</Text>
            </dt>
            <dd>
              <Text>{project.repository ? 'Code public' : 'Site web'}</Text>
            </dd>
          </div>
        </dl>
        <ProjectGallery name={project.name} images={project.images} videos={project.videos} />
        <div className={styles['descriptionLayout']}>
          <section className={styles['description']} aria-labelledby="project-description-title">
            <h2 id="project-description-title">
              <Text>À propos de cette application</Text>
            </h2>
            {project.description.map((paragraph) => (
              <p key={paragraph}>
                <Text>{paragraph}</Text>
              </p>
            ))}
            <h3>
              <Text>Ce que vous pouvez faire</Text>
            </h3>
            <ul>
              {project.features.map((feature) => (
                <li key={feature}>
                  <Text>{feature}</Text>
                </li>
              ))}
            </ul>
          </section>
          <aside className={styles['information']} aria-labelledby="project-information-title">
            <h2 id="project-information-title">
              <Text>Informations</Text>
            </h2>
            <dl>
              <div>
                <dt>
                  <Text>Créateur</Text>
                </dt>
                <dd>
                  <a href={creator.url} target="_blank" rel="noopener noreferrer">
                    {creator.name} / {creator.handle}
                  </a>
                </dd>
              </div>
              <div>
                <dt>
                  <Text>Plateformes</Text>
                </dt>
                <dd>
                  <Text>{project.platforms.join(', ')}</Text>
                </dd>
              </div>
              <div>
                <dt>
                  <Text>Site du projet</Text>
                </dt>
                <dd>
                  <a href={project.url} target="_blank" rel="noopener noreferrer">
                    {new URL(project.url).hostname}
                  </a>
                </dd>
              </div>
              {project.repository ? (
                <div>
                  <dt>
                    <Text>Code source</Text>
                  </dt>
                  <dd>
                    <a href={project.repository} target="_blank" rel="noopener noreferrer">
                      GitHub
                    </a>
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>
                  <Text>Dernière vérification</Text>
                </dt>
                <dd>
                  <LocalizedDate iso={project.verifiedAt} />
                </dd>
              </div>
            </dl>
            <details className={styles['sources']}>
              <summary>
                <Text>Sources de cette fiche</Text>
              </summary>
              <ul>
                {project.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      <Text>{source.label}</Text>
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          </aside>
        </div>
        {related.length ? (
          <section className={styles['related']} aria-labelledby="project-related-title">
            <h2 id="project-related-title" className={styles['sectionTitle']}>
              <Text>Du même créateur</Text>
            </h2>
            <ul className={styles['relatedList']}>
              {related.map((item) => (
                <ProjectRow key={item.slug} project={item} />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </article>
  );
}
