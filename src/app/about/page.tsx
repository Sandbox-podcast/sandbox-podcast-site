import Link from 'next/link';
import { TakeCard } from '@/components/take-card';
import { ExtLink, SectionHead } from '@/components/ui';
import { isMock, siteConfig } from '@/config/site';
import { allCharts, allHosts, chartView, content } from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'À propos : trois voix, des classements et des données sourcées',
  description:
    'Qui fait ce podcast, comment on calcule les classements, d’où viennent les données et pourquoi nos avis sont toujours séparés des chiffres.',
  path: '/about',
});

const PRINCIPLES = [
  [
    'Jamais de donnée inventée',
    'Une valeur qu’on n’a pas, on ne la remplace pas : elle reste absente et c’est écrit.',
  ],
  [
    'Chaque chiffre a sa source',
    'Un lien, une date de relevé, et la méthode qui en fait un score.',
  ],
  [
    'Les avis sont signés',
    'OUR TAKE a un auteur, une date, et son propre bloc. Jamais dans une cellule de tableau.',
  ],
  [
    'Un classement publié ne bouge plus',
    'On corrige par une note, pas en réécrivant l’histoire. Ce qui était #1 la semaine dernière le reste.',
  ],
] as const;

export default function AboutPage() {
  const takeRow = allCharts()
    .map((c) => chartView(c.slug).rows.find((r) => r.take))
    .find(Boolean);
  const sources = content().sources;
  return (
    <div className="wrap pt-6">
      <header className="mb-14">
        <p className="label mb-3 text-ink-2">À propos</p>
        <h1 className="display" style={{ fontSize: 'clamp(3.5rem, 12vw, 9rem)' }}>
          About
        </h1>
        <p className="mt-5 max-w-3xl font-serif text-2xl leading-snug md:text-3xl">
          {siteConfig.name} est un podcast tech animé par trois personnes, et les classements
          hebdomadaires qui vont avec. On parle d’IA, de dev, de GitHub et d’open source. On mesure
          ce qu’on peut mesurer, on le montre, et on dit ce qu’on en pense à part.
        </p>
      </header>

      <section aria-labelledby="voices" className="mb-20">
        <SectionHead kicker="Au micro" title="Les trois voix" id="voices" />
        <ul className="m-0 grid list-none gap-px border-2 border-ink bg-ink p-0 md:grid-cols-3">
          {allHosts().map((h) => (
            <li key={h.slug} className="flex flex-col gap-3 bg-paper p-5">
              <span className="take-who !h-14 !w-14 !text-3xl" aria-hidden="true">
                {h.name.slice(0, 1)}
              </span>
              <h3 className="display text-4xl">{h.name}</h3>
              <p className="label text-ink-2">{h.role}</p>
              <p className="text-sm">{h.bio}</p>
              {h.socials.linkedin || h.socials.github || h.socials.x ? (
                <nav
                  className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold"
                  aria-label={`Réseaux sociaux de ${h.name}`}
                >
                  {h.socials.linkedin ? (
                    <ExtLink href={h.socials.linkedin}>LinkedIn</ExtLink>
                  ) : null}
                  {h.socials.github ? <ExtLink href={h.socials.github}>GitHub</ExtLink> : null}
                  {h.socials.x ? <ExtLink href={h.socials.x}>X</ExtLink> : null}
                </nav>
              ) : null}
              {h.placeholder ? (
                <p className="label mt-auto text-accent-ink">Profil fictif, à remplacer</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="separation" id="separation" className="mb-20 scroll-mt-6">
        <SectionHead
          kicker="Notre règle numéro un"
          title="Données et avis, séparés"
          id="separation-title"
        />
        <p className="mb-8 max-w-3xl text-lg">
          Sur chaque page, ce qui est mesuré et ce que nous pensons n’ont ni la même forme, ni la
          même couleur, ni la même typographie. Vous voyez immédiatement qui parle.
        </p>
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <p className="label mb-3 flex items-center gap-2">
              <span className="bg-ink px-1.5 py-0.5 text-paper">DATA</span> Mesuré, sourcé, daté
            </p>
            <div className="data-block">
              <p className="data-title">
                <span className="label">Pourquoi ça bouge</span>
              </p>
              <p>{takeRow?.explanation?.headline ?? 'Porté par Growth : 100 (+8 pts).'}</p>
              {takeRow ? (
                <p className="mt-1">
                  Stars sur 7 jours :{' '}
                  <b className="text-ink">{String(takeRow.metrics['stars7d'] ?? '—')}</b>
                </p>
              ) : null}
            </div>
            <p className="mt-3 text-sm text-ink-2">
              Police mono, filet gris, aucune opinion. Chaque valeur renvoie à sa source.
            </p>
          </div>
          <div>
            <p className="label mb-3 flex items-center gap-2">
              <span className="take-dot" aria-hidden="true" /> OUR TAKE · Écrit, signé, assumé
            </p>
            {takeRow?.take ? <TakeCard take={takeRow.take} /> : null}
            <p className="mt-3 text-sm text-ink-2">
              Police serif italique, carte à part, nom de l’auteur. Une opinion, pas un fait.
            </p>
          </div>
        </div>
        <ul className="m-0 mt-10 grid list-none gap-px border-2 border-ink bg-ink p-0 md:grid-cols-4">
          {PRINCIPLES.map(([title, text]) => (
            <li key={title} className="bg-paper p-4">
              <h3 className="font-display text-lg font-extrabold leading-tight">{title}</h3>
              <p className="mt-1.5 text-sm text-ink-2">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="donnees" id="donnees" className="mb-20 scroll-mt-6">
        <SectionHead kicker="Transparence" title="D’où viennent les données" id="donnees-title" />
        {isMock ? (
          <aside className="mb-8 border-2 border-ink bg-hl p-5 text-on-hl" role="note">
            <p className="label mb-2">Mode démonstration</p>
            <p className="max-w-3xl">
              Ce site est une première version.{' '}
              <b>Aucune valeur affichée n’est issue d’une API ni d’un benchmark réel.</b> Les
              classements, les scores et l’historique sont produits par un générateur déterministe,
              les épisodes et les articles sont des exemples, et les trois animateurs sont des
              profils fictifs. Le bandeau en haut de chaque page le rappelle, et les moteurs de
              recherche n’indexent rien tant que ce mode est actif.
            </p>
          </aside>
        ) : null}
        <div className="scroll-x">
          <table className="dtable min-w-[36rem]">
            <thead>
              <tr>
                <th>Source</th>
                <th>Ce qu’elle apporte</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id}>
                  <td className="pr-4 align-top font-semibold">
                    <ExtLink href={s.url}>{s.label}</ExtLink>
                  </td>
                  <td className="pr-4 align-top">{s.provides}</td>
                  <td className="align-top">
                    <span className={`chip ${s.status === 'connected' ? 'bg-up-bg text-up' : ''}`}>
                      {s.status === 'connected'
                        ? 'Branchée'
                        : s.status === 'manual'
                          ? 'Manuel'
                          : 'À brancher'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 max-w-3xl text-sm text-ink-2">
          Chaque classement détaille ses sources, ses pondérations et ses limites dans sa page «
          Comment ce classement est calculé » :{' '}
          {allCharts().map((c, i) => (
            <span key={c.slug}>
              {i > 0 ? ', ' : ''}
              <Link
                href={`/charts/${c.slug}/methodology`}
                className="underline decoration-2 underline-offset-2"
              >
                {c.short}
              </Link>
            </span>
          ))}
          .
        </p>
      </section>

      <section aria-labelledby="weekly" className="mb-10">
        <SectionHead kicker="Le rythme" title="Une publication par semaine" id="weekly" />
        <p className="max-w-3xl text-lg">
          Chaque mardi, les données sont relevées, les classements recalculés puis comparés à la
          semaine précédente. On publie les mouvements, on ajoute nos avis, et on en parle dans
          l’épisode de la semaine. L’idée : que « il est combien cette semaine ? » devienne une
          question qu’on se pose.
        </p>
        <p className="mt-5 flex flex-wrap gap-2">
          <Link href="/charts" className="btn btn-solid">
            Voir les charts →
          </Link>
          <Link href="/charts/history" className="btn">
            Historique →
          </Link>
          <Link href="/episodes" className="btn">
            Épisodes →
          </Link>
        </p>
      </section>
    </div>
  );
}
