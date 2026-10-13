import { ProjectCatalog } from '@/components/project-catalog';
import { ProjectFeature, ProjectShelf } from '@/components/project-store';
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
  const sillage = personalProjects.find((project) => project.slug === 'sillage');
  const boostback = personalProjects.find((project) => project.slug === 'boostback');
  const games = personalProjects.filter(
    (project) => project.category === 'games' || project.category === 'education',
  );
  const tools = personalProjects.filter(
    (project) =>
      project.category === 'ai' || project.category === 'music' || project.category === 'tools',
  );
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
          <Link href="/nos-projets#catalogue">
            <Text>Tout voir</Text>
          </Link>
        </header>
        <div className={styles['features']}>
          {sillage ? (
            <ProjectFeature
              project={sillage}
              eyebrow="Développer avec l'IA"
              title="Vos agents. Un même espace de travail."
              subtitle="Claude Code, Codex et OpenCode, du bureau au téléphone."
            />
          ) : null}
          {boostback ? (
            <ProjectFeature
              project={boostback}
              eyebrow="À vous les commandes"
              title="Ramenez le booster à la maison."
              subtitle="Le vol retour de Super Heavy, dans votre navigateur."
            />
          ) : null}
        </div>
        <section className={styles['collections']} aria-labelledby="project-selections-title">
          <h2 id="project-selections-title" className={styles['sectionTitle']}>
            <Text>À découvrir</Text>
          </h2>
          <div className={styles['shelves']}>
            <ProjectShelf
              eyebrow="Pour petits et grands"
              title="On fait une partie ?"
              projects={games.map(projectSummary)}
            />
            <ProjectShelf
              eyebrow="Faits par l'équipe"
              title="Des outils qui prennent forme"
              projects={tools.map(projectSummary)}
            />
          </div>
        </section>
        <ProjectCatalog projects={personalProjects.map(projectSummary)} />
        <p className={styles['catalogNote']}>
          <Text>
            Les fiches reprennent les sites, dépôts et publications publiques des créateurs. Les
            sources et la date de vérification figurent sur chaque fiche.
          </Text>{' '}
          <Link href="/about">
            <Text>Retrouver l'équipe</Text>
          </Link>
        </p>
      </div>
    </div>
  );
}
