import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui';
import { chartRows, CHART_LABELS, type ChartId } from '@/domain/sandbox-charts';
import { sandboxChartsData } from '@/lib/sandbox-charts';
import { pageMetadata } from '@/lib/seo';
import { hasIndexableChartCollection } from '@/domain/chart-seo';

export async function generateMetadata() {
  const data = await sandboxChartsData();
  return pageMetadata({
    title: 'Les archives · SANDBOX CHARTS',
    description:
      'Les éditions hebdomadaires et leurs premières places, conservées avec leur méthode de calcul.',
    path: '/charts/history',
    noindex: !hasIndexableChartCollection(data),
  });
}
export default async function Page() {
  const data = await sandboxChartsData();
  const charts: ChartId[] = ['github', 'skills', 'models', 'rising'];
  return (
    <article className="wrap sc-project">
      <Breadcrumbs items={[{ label: 'Classements', href: '/charts' }, { label: 'Archives' }]} />
      <header>
        <p className="sc-label">EVERY WEEK LEAVES A TRACE</p>
        <h1>The archives.</h1>
        <p>Chaque édition conserve ses positions, ses mesures et sa version du score.</p>
        {data.mode === 'fixtures' ? (
          <p className="sc-data-state">
            APERÇU LOCAL · Ces archives utilisent les fixtures de développement.
          </p>
        ) : null}
      </header>
      {data.weeks.length ? (
        <div
          className="sc-table-scroll"
          role="region"
          aria-label="Archives des classements par semaine"
          tabIndex={0}
        >
          <table className="dtable">
            <caption className="sr-only">
              La première place de chaque classement, par édition.
            </caption>
            <thead>
              <tr>
                <th>Édition</th>
                {charts.map((id) => (
                  <th key={id}>{CHART_LABELS[id].title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.weeks.map((week) => (
                <tr key={week}>
                  <td>
                    <Link href={`/charts/history/${week}`}>{week}</Link>
                  </td>
                  {charts.map((id) => {
                    const leader = chartRows(data, id, week)[0];
                    return (
                      <td key={id}>
                        {leader ? (
                          <Link href={`/charts/${CHART_LABELS[id].slug}/${week}`}>
                            {leader.entity.name} ↗
                          </Link>
                        ) : (
                          'Édition indisponible'
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <section>
          <h2>
            {data.mode === 'unavailable'
              ? 'Archives temporairement indisponibles'
              : 'Les premières éditions se préparent'}
          </h2>
          <p>
            Les archives apparaîtront après la publication du premier classement fondé sur les
            relevés collectés.
          </p>
        </section>
      )}
      <Link className="btn" href="/charts">
        Cette semaine ↗
      </Link>
    </article>
  );
}
