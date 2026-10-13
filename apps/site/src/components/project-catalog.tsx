'use client';

import { useState } from 'react';
import {
  filterPersonalProjects,
  PROJECT_CATEGORIES,
  PROJECT_CREATORS,
  type ProjectSummary,
} from '@/domain/personal-projects';
import { useLocalization } from './localization';
import { ProjectRow } from './project-store';
import styles from './project-store.module.css';

export function ProjectCatalog({ projects }: { projects: readonly ProjectSummary[] }) {
  const { t } = useLocalization();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [creator, setCreator] = useState('');
  const filtered = filterPersonalProjects(projects, { query, category, creator });
  return (
    <section id="catalogue" className={styles['catalog']} aria-labelledby="project-catalog-title">
      <div className={styles['sectionHeading']}>
        <div>
          <h2 id="project-catalog-title">{t('Toutes les applications')}</h2>
          <p role="status">
            {filtered.length} {t(filtered.length === 1 ? 'projet' : 'projets')}
          </p>
        </div>
        <div className={styles['filters']}>
          <label className={styles['search']}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <span className="sr-only">{t('Rechercher un projet')}</span>
            <input
              type="search"
              placeholder={t('Rechercher un projet')}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
            />
          </label>
          <label className={styles['creatorSelect']}>
            <span className="sr-only">{t('Créateur')}</span>
            <select
              value={creator}
              onChange={(event) => {
                setCreator(event.target.value);
              }}
            >
              <option value="">{t("Toute l'équipe")}</option>
              {Object.entries(PROJECT_CREATORS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className={styles['categories']} role="group" aria-label={t('Catégories de projets')}>
        <button
          type="button"
          aria-pressed={!category}
          onClick={() => {
            setCategory('');
          }}
        >
          {t('Tout')}
        </button>
        {Object.entries(PROJECT_CATEGORIES)
          .filter(([key]) => projects.some((project) => project.category === key))
          .map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={category === key}
              onClick={() => {
                setCategory(key);
              }}
            >
              {t(label)}
            </button>
          ))}
      </div>
      {filtered.length ? (
        <ul className={styles['catalogGrid']}>
          {filtered.map((project) => (
            <ProjectRow key={project.slug} project={project} />
          ))}
        </ul>
      ) : (
        <div className={styles['empty']}>
          <h3>{t('Aucun projet trouvé')}</h3>
          <p>{t('Essayez un autre nom ou retirez un filtre.')}</p>
          <button
            type="button"
            className={styles['pill']}
            onClick={() => {
              setQuery('');
              setCategory('');
              setCreator('');
            }}
          >
            {t('Afficher tous les projets')}
          </button>
        </div>
      )}
    </section>
  );
}
