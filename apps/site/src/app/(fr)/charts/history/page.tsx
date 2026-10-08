import { Text, LocalizedElement } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
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
        <p className="sc-label">
          <Text>{'EVERY WEEK LEAVES A TRACE'}</Text>
        </p>
        <h1>
          <Text>{'The archives.'}</Text>
        </h1>
        <p>
          <Text>
            {'Chaque \u00E9dition conserve ses positions, ses mesures et sa version du score.'}
          </Text>
        </p>
        <Text>
          {data.mode === 'fixtures' ? (
            <p className="sc-data-state">
              <Text>
                {
                  'APER\u00C7U LOCAL \u00B7 Ces archives utilisent les fixtures de d\u00E9veloppement.'
                }
              </Text>
            </p>
          ) : null}
        </Text>
      </header>
      <Text>
        {data.weeks.length ? (
          <LocalizedElement
            as="div"
            className="sc-table-scroll"
            role="region"
            aria-label="Archives des classements par semaine"
            tabIndex={0}
          >
            <table className="dtable">
              <caption className="sr-only">
                <Text>{'La premi\u00E8re place de chaque classement, par \u00E9dition.'}</Text>
              </caption>
              <thead>
                <tr>
                  <th>
                    <Text>{'\u00C9dition'}</Text>
                  </th>
                  <Text>
                    {charts.map((id) => (
                      <th key={id}>
                        <Text>{CHART_LABELS[id].title}</Text>
                      </th>
                    ))}
                  </Text>
                </tr>
              </thead>
              <tbody>
                <Text>
                  {data.weeks.map((week) => (
                    <tr key={week}>
                      <td>
                        <Link href={`/charts/history/${week}`}>
                          <Text>{week}</Text>
                        </Link>
                      </td>
                      <Text>
                        {charts.map((id) => {
                          const leader = chartRows(data, id, week)[0];
                          return (
                            <td key={id}>
                              <Text>
                                {leader ? (
                                  <Link href={`/charts/${CHART_LABELS[id].slug}/${week}`}>
                                    <Text>{leader.entity.name}</Text>
                                    <Text>{' \u2197'}</Text>
                                  </Link>
                                ) : (
                                  'Édition indisponible'
                                )}
                              </Text>
                            </td>
                          );
                        })}
                      </Text>
                    </tr>
                  ))}
                </Text>
              </tbody>
            </table>
          </LocalizedElement>
        ) : (
          <section>
            <h2>
              <Text>
                {data.mode === 'unavailable'
                  ? 'Archives temporairement indisponibles'
                  : 'Les premières éditions se préparent'}
              </Text>
            </h2>
            <p>
              <Text>
                {
                  'Les archives appara\u00EEtront apr\u00E8s la publication du premier classement fond\u00E9 sur les relev\u00E9s collect\u00E9s.'
                }
              </Text>
            </p>
          </section>
        )}
      </Text>
      <Link className="btn" href="/charts">
        <Text>{'Cette semaine \u2197'}</Text>
      </Link>
    </article>
  );
}
