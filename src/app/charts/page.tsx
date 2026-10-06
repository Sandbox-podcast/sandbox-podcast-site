import Link from 'next/link';
import { MiniChart } from '@/components/cards';
import { TimeAgo } from '@/components/client';
import { JsonLd } from '@/components/json-ld';
import { SectionHead } from '@/components/ui';
import { siteConfig } from '@/config/site';
import { shortWeek } from '@/domain/weeks';
import { lastUpdated } from '@/lib/graph';
import { allCharts, latestWeek, weeksOf } from '@/lib/repository';
import { absoluteUrl, breadcrumbLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Charts : les classements hebdomadaires tech et IA',
  description:
    'Quatre classements mis à jour chaque semaine : projets GitHub, skills et agents, modèles IA, modèles open source. Historique, méthodologie ouverte et avis de l’équipe.',
  path: '/charts',
});

const UPCOMING = [
  'AI Coding Tools',
  'MCP Servers',
  'AI Agents',
  'Developer Tools',
  'AI Image Models',
  'AI Video Models',
  'Voice Models',
  'Frameworks',
  'Python libraries',
  'Databases',
];

const STEPS = [
  [
    '01',
    'Récupérer',
    'Les connecteurs relèvent les métriques à la source : API GitHub, Hugging Face, leaderboards publics.',
  ],
  [
    '02',
    'Calculer',
    'Les scores et les rangs sont recalculés par une fonction déterministe, avec des pondérations publiées.',
  ],
  [
    '03',
    'Comparer',
    'Le snapshot est figé, puis comparé à la semaine précédente : UP, DOWN, NEW, OUT.',
  ],
  [
    '04',
    'Commenter',
    'L’équipe ajoute ses avis, signés et séparés des données, puis en parle dans l’épisode.',
  ],
] as const;

export default function ChartsPage() {
  const week = latestWeek();
  const updated = lastUpdated();
  const charts = allCharts();
  return (
    <div className="wrap pt-6">
      <header className="mb-10">
        <p className="label mb-3 text-ink-2">
          Semaine {shortWeek(week).slice(1)} · mis à jour <TimeAgo iso={updated.publishedAt} />
        </p>
        <h1 className="display" style={{ fontSize: 'clamp(3.5rem, 12vw, 9rem)' }}>
          The charts
        </h1>
        <p className="mt-4 max-w-3xl font-serif text-xl leading-snug md:text-2xl">
          Des classements qui vivent. Chaque mardi, on recalcule, on compare avec la semaine
          précédente et on commente ce qui bouge. La question qu’on veut vous voir poser : « il est
          combien cette semaine ? »
        </p>
      </header>

      <section aria-label="Les classements">
        <div className="grid gap-x-8 gap-y-14 md:grid-cols-2">
          {charts.map((c) => (
            <div key={c.slug} className="flex flex-col gap-4">
              <MiniChart chart={c.slug} week={week} top={5} heading="h2" />
              <p className="max-w-xl text-sm text-ink-2">{c.description}</p>
              <p className="label flex flex-wrap gap-x-5 gap-y-1 text-ink-3">
                <span>{weeksOf(c.slug).length} semaines d’historique</span>
                <Link
                  href={`/charts/${c.slug}/methodology`}
                  className="underline decoration-2 underline-offset-4 hover:bg-hl hover:text-on-hl"
                >
                  Méthodologie
                </Link>
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20" aria-labelledby="how">
        <SectionHead kicker="La mécanique hebdomadaire" title="Comment ça marche" id="how" />
        <ol className="m-0 grid list-none gap-px border-2 border-ink bg-ink p-0 md:grid-cols-4">
          {STEPS.map(([n, title, text]) => (
            <li key={n} className="bg-paper p-4">
              <p
                className="display text-5xl"
                style={{ WebkitTextStroke: '2px var(--ink)', color: 'transparent' }}
              >
                {n}
              </p>
              <h3 className="mt-3 font-display text-xl font-extrabold">{title}</h3>
              <p className="mt-1.5 text-sm text-ink-2">{text}</p>
            </li>
          ))}
        </ol>
        <p className="label mt-4 flex flex-wrap gap-x-6 gap-y-1">
          <Link
            href="/charts/history"
            className="underline decoration-2 underline-offset-4 hover:bg-hl hover:text-on-hl"
          >
            Voir l’historique semaine par semaine →
          </Link>
          <Link
            href="/about#separation"
            className="underline decoration-2 underline-offset-4 hover:bg-hl hover:text-on-hl"
          >
            Données et avis : pourquoi on les sépare →
          </Link>
        </p>
      </section>

      <section className="mt-20" aria-labelledby="soon">
        <SectionHead kicker="L’architecture est prête" title="Prochains classements" id="soon" />
        <p className="mb-4 max-w-2xl text-sm text-ink-2">
          Ajouter un classement, c’est un fichier de définition et un jeu de données : aucun
          composant à écrire. Pistes envisagées, pas encore engagées :
        </p>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {UPCOMING.map((u) => (
            <li key={u} className="chip border-dashed text-ink-2">
              {u}
            </li>
          ))}
        </ul>
      </section>

      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Charts',
            description: siteConfig.description,
            url: absoluteUrl('/charts'),
            hasPart: charts.map((c) => ({
              '@type': 'ItemList',
              name: c.title,
              url: absoluteUrl(`/charts/${c.slug}`),
            })),
          },
          breadcrumbLd([
            { name: 'Accueil', path: '/' },
            { name: 'Charts', path: '/charts' },
          ]),
        ]}
      />
    </div>
  );
}
