import { ProjectCatalog } from '@/components/project-catalog';

import { LocalizedLink as Link, Text } from '@/components/localization';
import { projectSummary } from '@/domain/personal-projects';
import { personalProjects } from '@/lib/personal-projects';
import { pageMetadata } from '@/lib/seo';
import styles from '@/components/project-store.module.css';

export const metadata = pageMetadata({
  title: 'Nos projets',
  description:
    "Les applications, jeux et outils créés par l'équipe Sandbox. Découvrez leurs captures, leurs vidéos et les projets open source.",
  path: '/nos-projets',
  noindex: false,
});

export default function PersonalProjectsPage() {
  return (
    <div className={styles['page']}>
      <div className={styles['wrap']}>
        <header className={styles['heading']}>
          <div>
            <h1>
              <Text>Nos projets</Text>
            </h1>
            <p>
              <Text>Les applications, jeux et outils de l'équipe Sandbox.</Text>
            </p>
          </div>
        </header>
        <ProjectCatalog projects={personalProjects.map(projectSummary)} />
        <p className={styles['catalogNote']}>
          <Text>
            Les fiches reprennent les sites, dépôts et publications publiques des créateurs. Les
            sources et la date de vérification figurent sur chaque fiche.
          </Text>{' '}
          <Link href="/about" className="underline">
            <Text>Retrouver l'équipe</Text>
          </Link>
        </p>
      </div>
    </div>
  );
}
