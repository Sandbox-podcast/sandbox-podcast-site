import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TimeAgo } from '@/components/client';
import { JsonLd } from '@/components/json-ld';
import { ExtLink, SectionHead } from '@/components/ui';
import { describeDimension } from '@/domain/scoring';
import { shortWeek } from '@/domain/weeks';
import { lastUpdated } from '@/lib/graph';
import { allCharts, findChart, getProfile, getSource, snapshotsOf } from '@/lib/repository';
import { absoluteUrl, breadcrumbLd, pageMetadata } from '@/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return allCharts().map((c) => ({ slug: c.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const chart = findChart(slug);
  if (!chart) return {};
  return pageMetadata({
    title: `Comment le ${chart.title} est calculé : sources, critères, limites`,
    description: `Sources, pondérations, fréquence de mise à jour et limites du classement ${chart.title}. Aucune donnée inventée : chaque chiffre renvoie à sa source.`,
    path: `/charts/${chart.slug}/methodology`,
  });
}

export default async function MethodologyPage({ params }: Props) {
  const { slug } = await params;
  const chart = findChart(slug);
  if (!chart) notFound();
  const profile = getProfile(chart);
  const m = chart.methodology;
  const updated = lastUpdated();
  const history = snapshotsOf(chart.slug);

  return (
    <article className="wrap pt-6">
      <nav aria-label="Fil d’Ariane" className="label mb-5 text-ink-2">
        <Link href="/charts" className="underline decoration-2 underline-offset-4">
          Charts
        </Link>{' '}
        /{' '}
        <Link href={`/charts/${chart.slug}`} className="underline decoration-2 underline-offset-4">
          {chart.short}
        </Link>{' '}
        / Méthodologie
      </nav>
      <header className="mb-10">
        <p className="label mb-3 text-ink-2">Méthodologie · {chart.code}</p>
        <h1 className="display" style={{ fontSize: 'clamp(2.75rem, 8.5vw, 6.5rem)' }}>
          Comment le {chart.title} est calculé
        </h1>
        <p className="mt-4 max-w-3xl font-serif text-xl leading-snug md:text-2xl">{m.summary}</p>
        <p className="label mt-5 text-ink-2">
          Dernière mise à jour : <TimeAgo iso={updated.publishedAt} /> · semaine{' '}
          {shortWeek(updated.week).slice(1)} · {history.length} semaines d’historique
        </p>
      </header>

      <div className="grid gap-x-12 gap-y-14 lg:grid-cols-[1fr_22rem]">
        <div className="grid gap-14">
          <section aria-labelledby="sources">
            <SectionHead kicker="D’où viennent les chiffres" title="Sources" id="sources" />
            <div className="scroll-x">
              <table className="dtable min-w-[34rem]">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Ce qu’on en tire</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {m.sources.map((s) => {
                    const src = getSource(s.source);
                    return (
                      <tr key={s.source}>
                        <td className="pr-4 align-top font-semibold">
                          <ExtLink href={src.url}>{src.label}</ExtLink>
                        </td>
                        <td className="pr-4 align-top">{s.usage}</td>
                        <td className="align-top">
                          <span
                            className={`chip ${src.status === 'connected' ? 'bg-up-bg text-up' : ''}`}
                          >
                            {src.status === 'connected'
                              ? 'Branchée'
                              : src.status === 'manual'
                                ? 'Saisie manuelle'
                                : 'À brancher'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="criteres">
            <SectionHead
              kicker="Ce qui entre dans la note"
              title="Critères et pondérations"
              id="criteres"
            />
            <ul className="m-0 grid list-none gap-6 p-0">
              {m.criteria.map((c) => (
                <li key={c.label} className="border-t border-hair pt-4">
                  <h3 className="font-display text-xl font-extrabold">{c.label}</h3>
                  <p className="mt-1.5 max-w-3xl text-ink-2">{c.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="formule">
            <SectionHead
              kicker="Générée à partir du code, donc toujours à jour"
              title="La formule, ligne par ligne"
              id="formule"
            />
            <div className="grid gap-8">
              {profile.dimensions.map((d) => (
                <div
                  key={d.id}
                  className={
                    d.id === profile.primary ? 'border-2 border-ink bg-hl p-4 text-on-hl' : ''
                  }
                >
                  <h3 className="font-display text-lg font-extrabold">
                    {d.label}{' '}
                    {d.id === profile.primary ? (
                      <span className="tag ml-2">Note principale</span>
                    ) : null}
                  </h3>
                  <p className="mt-1 mb-3 max-w-3xl text-sm opacity-80">{d.description}</p>
                  <table className="dtable">
                    <tbody>
                      {describeDimension(d, profile).map((row) => (
                        <tr key={row.label}>
                          <td className="w-40 font-semibold">{row.label}</td>
                          <td className="num w-14">{row.weightPct} %</td>
                          <td className="text-ink-2">{row.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="limites">
            <SectionHead kicker="Ce qu’on ne sait pas faire" title="Limites" id="limites" />
            <ul className="m-0 grid list-none gap-3 p-0">
              {m.limits.map((l) => (
                <li key={l} className="grid grid-cols-[1.5rem_1fr] gap-2 border-t border-hair pt-3">
                  <span className="font-mono font-bold" aria-hidden="true">
                    !
                  </span>
                  <p className="max-w-3xl">{l}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="grid h-fit gap-8 lg:sticky lg:top-6">
          <div className="border-2 border-ink p-4">
            <p className="label mb-2 text-ink-2">Fréquence</p>
            <p className="text-sm">{m.frequency}</p>
          </div>
          <div className="border-2 border-ink p-4">
            <p className="label mb-2 text-ink-2">Principes</p>
            <ul className="m-0 grid list-none gap-2 p-0 text-sm">
              <li>Aucune donnée inventée : une valeur manquante reste absente.</li>
              <li>Chaque chiffre renvoie à sa source.</li>
              <li>Un snapshot publié ne se modifie pas.</li>
              <li>Les avis (OUR TAKE) sont séparés et signés.</li>
            </ul>
          </div>
          {m.changelog.length > 0 ? (
            <div className="border-2 border-ink p-4">
              <p className="label mb-2 text-ink-2">Historique de la méthode</p>
              <ul className="m-0 grid list-none gap-2 p-0 text-sm">
                {m.changelog.map((c) => (
                  <li key={c.week}>
                    <b className="font-mono text-xs">{shortWeek(c.week)}</b> · {c.note}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Link href={`/charts/${chart.slug}`} className="btn btn-solid justify-between">
            Voir le {chart.title} <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </div>

      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'TechArticle',
            headline: `Comment le ${chart.title} est calculé`,
            description: m.summary,
            url: absoluteUrl(`/charts/${chart.slug}/methodology`),
            dateModified: updated.publishedAt,
          },
          breadcrumbLd([
            { name: 'Accueil', path: '/' },
            { name: 'Charts', path: '/charts' },
            { name: chart.title, path: `/charts/${chart.slug}` },
            { name: 'Méthodologie', path: `/charts/${chart.slug}/methodology` },
          ]),
        ]}
      />
    </article>
  );
}
