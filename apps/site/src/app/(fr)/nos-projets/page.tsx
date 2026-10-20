import { ProjectCatalog } from '@/components/project-catalog';

import { LocalizedLink as Link, Text } from '@/components/localization';
import { projectSummary } from '@/domain/personal-projects';
import { personalProjects } from '@/lib/personal-projects';
import { pageMetadata } from '@/lib/seo';
import styles from '@/components/project-store.module.css';

export const metadata = pageMetadata({
  title: 'Projets IA, jeux et outils de l’équipe Sandbox',
  description:
    "Découvre les projets de Lou, Nicolas et Loïc : applications, outils d'IA, jeux et open source. Leur fonctionnement, leurs sources et les liens pour les essayer.",
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
              <Text>Ce que nous construisons.</Text>
            </h1>
            <p>
              <Text>
                Découvre les projets de Lou, Nicolas et Loïc, leur fonctionnement et les liens pour
                les essayer.
              </Text>
            </p>
          </div>
        </header>
        <ProjectCatalog projects={personalProjects.map(projectSummary)} />
        <p className={styles['catalogNote']}>
          <Text>
            Les fiches s'appuient sur les sites, dépôts et publications publiques des créateurs.
            Chaque fiche indique ses sources et sa date de vérification.
          </Text>{' '}
          <Link href="/about" className="underline">
            <Text>Retrouver l'équipe</Text>
          </Link>
        </p>
      </div>
    </div>
  );
}
