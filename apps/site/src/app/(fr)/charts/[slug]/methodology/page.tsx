import { Text, LocalizedElement } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
import { notFound } from 'next/navigation';
import { TimeAgo } from '@/components/client';
import { JsonLd } from '@/components/json-ld';
import { Breadcrumbs, ExtLink, SectionHead } from '@/components/ui';
import { describeDimension } from '@/domain/scoring';
import { shortWeek } from '@/domain/weeks';
import { lastUpdated } from '@/lib/graph';
import { allCharts, findChart, getProfile, getSource, snapshotsOf } from '@/lib/repository';
import { absoluteUrl, breadcrumbLd, pageMetadata } from '@/lib/seo';
import { ChartsMethodology } from '@/components/charts-methodology';
export const dynamicParams = false;
export function generateStaticParams() {
  return allCharts().map((c) => ({ slug: c.slug }));
}
interface Props {
  params: Promise<{
    slug: string;
  }>;
}
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  if (slug === 'github')
    return pageMetadata({
      title: 'SANDBOX CHARTS · Méthode GitHub Top 20',
      description: 'Sources, score, critères et limites du classement hebdomadaire GitHub.',
      path: '/charts/github/methodology',
    });
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
  if (slug === 'github') return <ChartsMethodology />;
  const chart = findChart(slug);
  if (!chart) notFound();
  const profile = getProfile(chart);
  const m = chart.methodology;
  const updated = lastUpdated();
  const history = snapshotsOf(chart.slug);
  return (
    <article className="wrap legacy-method-page pt-6">
      <Breadcrumbs
        items={[
          { label: 'Classements', href: '/charts' },
          { label: chart.short, href: `/charts/${chart.slug}` },
          { label: 'Méthode' },
        ]}
      />
      <header className="legacy-method-heading mb-10">
        <p className="label mb-3 text-ink-2">
          <Text>{'M\u00E9thodologie \u00B7 '}</Text>
          <Text>{chart.code}</Text>
        </p>
        <h1 className="display">
          <Text>{'Comment le '}</Text>
          <Text>{chart.title}</Text>
          <Text>{' est calcul\u00E9'}</Text>
        </h1>
        <p className="mt-4 max-w-3xl font-serif text-xl leading-snug md:text-2xl">
          <Text>{m.summary}</Text>
        </p>
        <p className="label mt-5 text-ink-2">
          <Text>{'Derni\u00E8re mise \u00E0 jour : '}</Text>
          <TimeAgo iso={updated.publishedAt} />
          <Text>{' \u00B7 semaine'}</Text>
          <Text> </Text>
          <Text>{shortWeek(updated.week).slice(1)}</Text>
          <Text>{' \u00B7 '}</Text>
          <Text>{history.length}</Text>
          <Text>{' semaines d\u2019historique'}</Text>
        </p>
      </header>
      <LocalizedElement
        as="nav"
        className="entity-section-nav mb-8"
        aria-label="Sommaire de la méthode"
      >
        <a className="chip" href="#sources">
          <Text>{'Sources'}</Text>
        </a>
        <a className="chip" href="#criteres">
          <Text>{'Crit\u00E8res'}</Text>
        </a>
        <a className="chip" href="#formule">
          <Text>{'Calcul du score'}</Text>
        </a>
        <a className="chip" href="#limites">
          <Text>{'Limites'}</Text>
        </a>
      </LocalizedElement>

      <div className="grid gap-x-12 gap-y-14 lg:grid-cols-[1fr_22rem]">
        <div className="grid gap-14">
          <section aria-labelledby="sources">
            <SectionHead kicker="D’où viennent les chiffres" title="Sources" id="sources" />
            <LocalizedElement
              as="div"
              className="scroll-x"
              role="region"
              aria-label="Sources du classement"
              tabIndex={0}
            >
              <table className="dtable min-w-[34rem]">
                <thead>
                  <tr>
                    <th>
                      <Text>{'Source'}</Text>
                    </th>
                    <th>
                      <Text>{'Ce qu\u2019on en tire'}</Text>
                    </th>
                    <th>
                      <Text>{'Statut'}</Text>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <Text>
                    {m.sources.map((s) => {
                      const src = getSource(s.source);
                      return (
                        <tr key={s.source}>
                          <td className="pr-4 align-top font-semibold">
                            <ExtLink href={src.url}>
                              <Text>{src.label}</Text>
                            </ExtLink>
                          </td>
                          <td className="pr-4 align-top">
                            <Text>{s.usage}</Text>
                          </td>
                          <td className="align-top">
                            <span
                              className={`chip ${src.status === 'connected' ? 'bg-up-bg text-up' : ''}`}
                            >
                              <Text>
                                {src.status === 'connected'
                                  ? 'Branchée'
                                  : src.status === 'manual'
                                    ? 'Saisie manuelle'
                                    : 'À brancher'}
                              </Text>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </Text>
                </tbody>
              </table>
            </LocalizedElement>
          </section>

          <section aria-labelledby="criteres">
            <SectionHead
              kicker="Ce qui entre dans la note"
              title="Critères et pondérations"
              id="criteres"
            />
            <ul className="m-0 grid list-none gap-6 p-0">
              <Text>
                {m.criteria.map((c) => (
                  <li key={c.label} className="border-t border-hair pt-4">
                    <h3 className="font-display text-xl font-extrabold">
                      <Text>{c.label}</Text>
                    </h3>
                    <p className="mt-1.5 max-w-3xl text-ink-2">
                      <Text>{c.detail}</Text>
                    </p>
                  </li>
                ))}
              </Text>
            </ul>
          </section>

          <section aria-labelledby="formule">
            <SectionHead
              kicker="Générée à partir du code, donc toujours à jour"
              title="La formule, ligne par ligne"
              id="formule"
            />
            <div className="grid gap-8">
              <Text>
                {profile.dimensions.map((d) => (
                  <div
                    key={d.id}
                    className={
                      d.id === profile.primary ? 'border-2 border-ink bg-hl p-4 text-on-hl' : ''
                    }
                  >
                    <h3 className="font-display text-lg font-extrabold">
                      <Text>{d.label}</Text>
                      <Text> </Text>
                      <Text>
                        {d.id === profile.primary ? (
                          <span className="tag ml-2">
                            <Text>{'Note principale'}</Text>
                          </span>
                        ) : null}
                      </Text>
                    </h3>
                    <p className="mt-1 mb-3 max-w-3xl text-sm opacity-80">
                      <Text>{d.description}</Text>
                    </p>
                    <table className="dtable">
                      <tbody>
                        <Text>
                          {describeDimension(d, profile).map((row) => (
                            <tr key={row.label}>
                              <td className="w-40 font-semibold">
                                <Text>{row.label}</Text>
                              </td>
                              <td className="num w-14">
                                <Text>{row.weightPct}</Text>
                                <Text>{' %'}</Text>
                              </td>
                              <td className="text-ink-2">
                                <Text>{row.detail}</Text>
                              </td>
                            </tr>
                          ))}
                        </Text>
                      </tbody>
                    </table>
                  </div>
                ))}
              </Text>
            </div>
          </section>

          <section aria-labelledby="limites">
            <SectionHead kicker="Ce qu’on ne sait pas faire" title="Limites" id="limites" />
            <ul className="m-0 grid list-none gap-3 p-0">
              <Text>
                {m.limits.map((l) => (
                  <li
                    key={l}
                    className="grid grid-cols-[1.5rem_1fr] gap-2 border-t border-hair pt-3"
                  >
                    <span className="font-mono font-bold" aria-hidden="true">
                      <Text>{'!'}</Text>
                    </span>
                    <p className="max-w-3xl">
                      <Text>{l}</Text>
                    </p>
                  </li>
                ))}
              </Text>
            </ul>
          </section>
        </div>

        <aside className="grid h-fit gap-8 lg:sticky lg:top-6">
          <div className="border-2 border-ink p-4">
            <p className="label mb-2 text-ink-2">
              <Text>{'Fr\u00E9quence'}</Text>
            </p>
            <p className="text-sm">
              <Text>{m.frequency}</Text>
            </p>
          </div>
          <div className="border-2 border-ink p-4">
            <p className="label mb-2 text-ink-2">
              <Text>{'Principes'}</Text>
            </p>
            <ul className="m-0 grid list-none gap-2 p-0 text-sm">
              <li>
                <Text>
                  {'Aucune donn\u00E9e invent\u00E9e : une valeur manquante reste absente.'}
                </Text>
              </li>
              <li>
                <Text>{'Chaque chiffre renvoie \u00E0 sa source.'}</Text>
              </li>
              <li>
                <Text>{'Un snapshot publi\u00E9 ne se modifie pas.'}</Text>
              </li>
              <li>
                <Text>{'Les avis (OUR TAKE) sont s\u00E9par\u00E9s et sign\u00E9s.'}</Text>
              </li>
            </ul>
          </div>
          <Text>
            {m.changelog.length > 0 ? (
              <div className="border-2 border-ink p-4">
                <p className="label mb-2 text-ink-2">
                  <Text>{'Historique de la m\u00E9thode'}</Text>
                </p>
                <ul className="m-0 grid list-none gap-2 p-0 text-sm">
                  <Text>
                    {m.changelog.map((c) => (
                      <li key={c.week}>
                        <b className="font-mono text-xs">
                          <Text>{shortWeek(c.week)}</Text>
                        </b>
                        <Text>{' \u00B7 '}</Text>
                        <Text>{c.note}</Text>
                      </li>
                    ))}
                  </Text>
                </ul>
              </div>
            ) : null}
          </Text>
          <Link href={`/charts/${chart.slug}`} className="btn btn-solid justify-between">
            <Text>{'Voir le '}</Text>
            <Text>{chart.title}</Text>{' '}
            <span aria-hidden="true">
              <Text>{'\u2192'}</Text>
            </span>
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
