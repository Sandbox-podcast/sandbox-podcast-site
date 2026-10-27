import Link from 'next/link';
import { JsonLd } from '@/components/json-ld';
import { skillGuidePath, skillGuides } from '@/domain/skill-guides';
import { absoluteUrl, breadcrumbLd, pageMetadata } from '@/lib/seo';
import styles from '@/components/skill-guide.module.css';

export const metadata = pageMetadata({
  title: 'Guides des skills IA : Claude, ChatGPT et OpenAI',
  description:
    'Choisis tes skills pour Claude, ChatGPT et Codex. Guides par usage avec sources officielles, limites, installation et vérifications à effectuer.',
  path: '/guides',
  locale: 'fr-FR',
  noindex: false,
  localizedAlternates: [],
});

export default function GuidesPage() {
  return (
    <article className={`wrap ${styles['hub']}`} lang="fr">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: 'Accueil', path: '/' },
            { name: 'Guides des skills IA', path: '/guides' },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Guides des skills IA',
            url: absoluteUrl('/guides'),
            inLanguage: 'fr-FR',
            hasPart: skillGuides.map((guide) => ({
              '@type': 'Article',
              headline: guide.heading,
              url: absoluteUrl(skillGuidePath(guide.slug)),
            })),
          },
        ]}
      />
      <header className={styles['heading']}>
        <p className={styles['eyebrow']}>Les guides Sandbox</p>
        <h1>Des skills pour ton travail de tous les jours.</h1>
        <p>
          Un document à préparer, des chiffres à remettre en ordre, du code à corriger. Choisis
          l’outil que tu utilises pour trouver un skill adapté et une première demande à essayer.
        </p>
      </header>
      <section className={styles['definition']} aria-labelledby="skill-definition">
        <h2 id="skill-definition">Un skill, c’est quoi ?</h2>
        <p>
          C’est une méthode de travail que tu donnes à ton assistant IA pour qu’il puisse la
          réutiliser. Elle rassemble des consignes, parfois des exemples et des outils. Par exemple,
          un skill de compte rendu peut demander de séparer les décisions des propositions à chaque
          réunion.
        </p>
      </section>
      <ul className={styles['guideList']} aria-label="Choisir un guide">
        {skillGuides.map((guide) => (
          <li key={guide.slug}>
            <span className={styles['tool']}>{guide.tool}</span>
            <div>
              <h2>
                <Link href={skillGuidePath(guide.slug)}>{guide.heading}</Link>
              </h2>
              <p>{guide.description}</p>
              <span className={styles['guideType']}>
                {guide.kind === 'recipes'
                  ? 'Quatre recettes à créer'
                  : `${guide.options.length} skills expliqués`}{' '}
                · Exemples et mode d’emploi
              </span>
            </div>
          </li>
        ))}
      </ul>
      <section className={styles['related']}>
        <h2>Tu cherches d’autres skills ?</h2>
        <p>
          Consulte le <Link href="/charts/skills">classement Skills</Link> pour suivre les
          ressources qui gagnent en adoption. Les guides t’aident ensuite à choisir selon ta tâche.
        </p>
      </section>
    </article>
  );
}
