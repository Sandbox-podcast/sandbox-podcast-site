import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui';
import { JsonLd } from '@/components/json-ld';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { z } from 'zod';
import { formatCompact } from '@/domain/format';
import { slugSchema } from '@/domain/schema';
import { githubProjectDetail } from '@/lib/charts-public';
import { readChartsEditorial } from '@/lib/charts-editorial';
import { absoluteUrl, pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!slugSchema.safeParse(slug).success) return {};

  let result: Awaited<ReturnType<typeof githubProjectDetail>> = null;
  try {
    result = await githubProjectDetail(slug);
  } catch (error) {
    console.error(
      'SANDBOX project metadata unavailable:',
      error instanceof Error ? error.name : 'unknown',
    );
  }

  const ranked = result?.weekly.some((item) => item.chart === 'github') ?? false;
  const projectName = result?.project.name ?? slug;
  const projectDescription = result?.project.description?.trim();
  const description = [
    projectDescription,
    `Rangs hebdomadaires et mesures GitHub observées pour ${result?.project.fullName ?? slug}.`,
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 160)
    .trimEnd();

  return pageMetadata({
    title: `${projectName} · GitHub Top 20 · SANDBOX CHARTS`,
    description,
    path: `/charts/project/${slug}`,
    noindex: !ranked,
    ownImage: true,
  });
}

const breakdownSchema = z.object({
  components: z.record(z.string(), z.number().nullable()),
  weights: z.record(z.string(), z.number()),
  coverage: z.number(),
  source: z.string(),
});
const number = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : formatCompact(value);

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slugSchema.safeParse(slug).success) notFound();
  let result: Awaited<ReturnType<typeof githubProjectDetail>> = null;
  let failed = false;
  let take: { text: string; author: string } | null = null;
  try {
    result = await githubProjectDetail(slug);
    if (result) {
      const notes = await readChartsEditorial();
      const insight = notes
        .filter((note) => note.chart === 'github')
        .toSorted((a, b) => b.payload.week.localeCompare(a.payload.week))
        .flatMap((note) => note.payload.insights)
        .find((item) => item.entity === slug && item.sandboxTake);
      if (insight) take = { text: insight.sandboxTake, author: insight.author };
    }
  } catch (error) {
    failed = true;
    console.error('SANDBOX project unavailable:', error instanceof Error ? error.name : 'unknown');
  }
  if (failed)
    return (
      <article className="wrap sc-project">
        <h1>Données temporairement indisponibles</h1>
        <p>La fiche sera accessible lorsque la connexion à la base sera rétablie.</p>
        <Link href="/charts">Retour aux charts</Link>
      </article>
    );
  if (!result) notFound();
  const { project, metrics } = result;
  const latest = result.weekly.filter((item) => item.chart === 'github').at(-1);
  const breakdown = breakdownSchema.safeParse(latest?.metadata).data;
  const recent = result.daily.slice(-90);
  const first = recent[0];
  const last = recent.at(-1);
  const low = recent.length ? Math.min(...recent.map((item) => item.stars)) : 0;
  const high = recent.length ? Math.max(...recent.map((item) => item.stars)) : 0;
  const timeSpan =
    first && last ? Math.max(86400000, Date.parse(last.date) - Date.parse(first.date)) : 1;
  const paths: string[] = [];
  recent.forEach((item, index) => {
    const previous = recent[index - 1];
    const x =
      20 + ((Date.parse(item.date) - Date.parse(first?.date ?? item.date)) / timeSpan) * 740;
    const y = 175 - ((item.stars - low) / Math.max(1, high - low)) * 150;
    const point = `${x.toFixed(2)},${y.toFixed(2)}`;
    const lastPath = paths.at(-1);
    if (
      !previous ||
      Date.parse(item.date) - Date.parse(previous.date) > 2 * 86400000 ||
      lastPath === undefined
    )
      paths.push(`M${point}`);
    else paths[paths.length - 1] = `${lastPath} L${point}`;
  });
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareSourceCode',
          name: project.fullName,
          description: project.description ?? project.name,
          codeRepository: result.githubUrl,
          sameAs: [result.githubUrl],
          url: absoluteUrl(`/charts/project/${slug}`),
          ...(project.language ? { programmingLanguage: project.language } : {}),
        }}
      />
      <article className="wrap sc-project">
        <Breadcrumbs
          items={[
            { label: 'Classements', href: '/charts' },
            { label: 'GitHub', href: '/charts/github' },
            { label: project.name },
          ]}
        />
        <header>
          <p className="sc-label">
            {project.fullName} · {project.category}
          </p>
          <h1>{project.name}</h1>
          <p>{project.description}</p>
          <a className="btn" href={result.githubUrl} target="_blank" rel="noreferrer">
            Voir le dépôt GitHub ↗
          </a>
        </header>
        <div className="sc-project-ranks">
          {[
            [
              'CURRENT RANK',
              result.currentRank === null ? 'Hors du top' : `#${result.currentRank}`,
            ],
            ['PREVIOUS RANK', result.previousRank === null ? '—' : `#${result.previousRank}`],
            ['BEST RANK', result.bestRank === null ? '—' : `#${result.bestRank}`],
            ['WEEKS IN TOP 20', String(result.weeksInTop20)],
          ].map(([label, value]) => (
            <div key={label}>
              <span className="sc-label">{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <section>
          <h2>Le mouvement en chiffres</h2>
          <div className="sc-project-metrics">
            {[
              ['STARS', number(metrics?.stars)],
              ['7 DAYS', number(metrics?.stars7d)],
              ['30 DAYS', number(result.growth30d)],
              ['90 DAYS', number(result.growth90d)],
              ['FORKS', number(metrics?.forks)],
              [
                'GROWTH 7D',
                metrics?.growthPercentage === null || metrics?.growthPercentage === undefined
                  ? '—'
                  : `${metrics.growthPercentage.toFixed(1)} %`,
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="sc-label">{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <p className="sc-label">
            SOURCE GITHUB ·{' '}
            {metrics
              ? `COLLECTÉ LE ${metrics.collectedAt.replace('T', ' ').slice(0, 19)} UTC · COMPARAISON ${metrics.baselineDate ?? 'INDISPONIBLE'}`
              : 'HISTORIQUE EN COURS DE COLLECTE'}
          </p>
        </section>
        <section>
          <h2>Stars · relevés quotidiens</h2>
          {recent.length > 1 ? (
            <figure className="sc-daily-curve">
              <svg
                viewBox="0 0 800 210"
                role="img"
                aria-label={`Évolution observée entre ${first?.date} et ${last?.date}, de ${low} à ${high} stars`}
              >
                <line x1="20" y1="175" x2="760" y2="175" stroke="currentColor" opacity=".2" />
                {paths.map((path, index) => (
                  <path key={index} d={path} fill="none" stroke="var(--hl)" strokeWidth="3" />
                ))}
                <text x="20" y="205" fill="currentColor" fontSize="12">
                  {first?.date}
                </text>
                <text x="760" y="205" fill="currentColor" fontSize="12" textAnchor="end">
                  {last?.date}
                </text>
                <text x="790" y="28" fill="currentColor" fontSize="11" textAnchor="end">
                  {formatCompact(high)}
                </text>
                <text x="790" y="175" fill="currentColor" fontSize="11" textAnchor="end">
                  {formatCompact(low)}
                </text>
              </svg>
              <figcaption>
                Les interruptions de collecte restent visibles. {recent.length} relevés réels.
              </figcaption>
            </figure>
          ) : (
            <p>La courbe apparaîtra après plusieurs collectes. Aucun point ne sera extrapolé.</p>
          )}
        </section>
        {take ? (
          <section className="sc-project-take">
            <span className="sc-label">SANDBOX TAKE</span>
            <p>{take.text}</p>
            <span className="sc-label">{take.author || 'SANDBOX'}</span>
          </section>
        ) : null}
        <section>
          <h2>Historique des classements</h2>
          <div className="sc-table-scroll">
            <table className="dtable">
              <thead>
                <tr>
                  <th>Édition</th>
                  <th>Chart</th>
                  <th>Position</th>
                  <th>Mouvement</th>
                  <th>Score</th>
                  <th>Version</th>
                </tr>
              </thead>
              <tbody>
                {result.weekly.toReversed().map((item) => (
                  <tr key={`${item.chart}:${item.week}`}>
                    <td>
                      <Link href={`/charts/${item.chart}/${item.week}`}>{item.week}</Link>
                    </td>
                    <td>{item.chart === 'github' ? 'GitHub' : 'Rising'}</td>
                    <td>#{item.rank}</td>
                    <td>
                      {item.status === 'new'
                        ? 'NEW'
                        : item.rankChange > 0
                          ? `↑${item.rankChange}`
                          : item.rankChange < 0
                            ? `↓${Math.abs(item.rankChange)}`
                            : '='}
                    </td>
                    <td>{item.score.toFixed(1)}</td>
                    <td>{item.scoringVersion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!result.weekly.length ? (
            <p>Ce projet n’a pas encore figuré dans une édition publiée.</p>
          ) : null}
        </section>
        {breakdown ? (
          <section>
            <h2>Comment se calcule son score ?</h2>
            <p>
              Composantes figées de l’édition {latest?.week}. Couverture :{' '}
              {Math.round(breakdown.coverage * 100)} %.
            </p>
            <table className="dtable">
              <thead>
                <tr>
                  <th>Composante</th>
                  <th>Valeur / 100</th>
                  <th>Poids prévu</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(breakdown.weights).map(([key, weight]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{breakdown.components[key]?.toFixed(1) ?? 'Indisponible'}</td>
                    <td>{Math.round(weight * 100)} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Link className="btn" href="/charts/github/methodology">
              Lire la méthode complète ↗
            </Link>
          </section>
        ) : null}
      </article>
    </>
  );
}
