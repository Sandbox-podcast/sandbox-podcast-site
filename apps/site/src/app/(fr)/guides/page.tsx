import Link from 'next/link';
import { JsonLd } from '@/components/json-ld';
import { skillGuidePath, skillGuides } from '@/domain/skill-guides';
import { absoluteUrl, breadcrumbLd, pageMetadata } from '@/lib/seo';

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
    <article className="wrap localized-content" lang="fr">
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
      <header className="localized-content-heading">
        <h1>Quels skills choisir pour ton assistant IA ?</h1>
        <p>
          Pars de ta tâche et de l’outil que tu utilises. Ces guides rapprochent les sources
          officielles de cas concrets, avec les limites et les vérifications à prévoir.
        </p>
      </header>
      <ul className="localized-ranking-cards">
        {skillGuides.map((guide) => (
          <li key={guide.slug}>
            <Link href={skillGuidePath(guide.slug)}>
              <strong>{guide.heading}</strong>
              <span>{guide.description}</span>
            </Link>
          </li>
        ))}
      </ul>
      <section>
        <h2>Suivre l’adoption des skills</h2>
        <p>
          Le <Link href="/charts/skills">classement Skills</Link> suit des mesures d’adoption
          observées. Consulte sa <Link href="/charts/skills/methodology">méthodologie</Link> pour
          comprendre le score, puis utilise les guides pour préparer tes propres essais.
        </p>
      </section>
    </article>
  );
}
