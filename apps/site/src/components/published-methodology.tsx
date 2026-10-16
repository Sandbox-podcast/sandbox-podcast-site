import { notFound } from 'next/navigation';
import { z } from 'zod';
import { Text, LocalizedLink as Link, LocalizedElement } from '@/components/localization';
import { Breadcrumbs, ExtLink } from '@/components/ui';
import { chartMethodSummary } from '@/domain/chart-publication';
import { CHART_LABELS, type ChartId } from '@/domain/sandbox-charts';
import { publicChartEdition } from '@/lib/charts-public';
import { ChartPublication } from './chart-publication';
import { ReferenceMethodology } from './reference-methodology';

const weightsSchema = z.record(z.string(), z.number());

export async function PublishedMethodology({
  chart,
  editionId,
}: {
  chart: ChartId;
  editionId?: string | undefined;
}) {
  let edition: Awaited<ReturnType<typeof publicChartEdition>>;
  try {
    edition = await publicChartEdition(chart, editionId);
  } catch (error) {
    console.error(
      'Published methodology unavailable:',
      error instanceof Error ? error.name : 'unknown',
    );
    return (
      <article className="wrap sc-methodology">
        <h1>
          <Text>{'Méthode du classement'}</Text>
        </h1>
        <p>
          <Text>
            {
              'La configuration publiée est momentanément indisponible. Réessayez après le rétablissement des données.'
            }
          </Text>
        </p>
      </article>
    );
  }
  if (!edition && editionId) notFound();
  if (!edition || edition.scoringVersion.endsWith('-reference-v3'))
    return <ReferenceMethodology chart={chart} edition={edition} />;
  const meta = CHART_LABELS[chart];
  const method = chartMethodSummary(chart, edition.scoringVersion);
  return (
    <article className="wrap sc-methodology">
      <Breadcrumbs
        items={[
          { label: 'Classements', href: '/charts' },
          { label: meta.title, href: `/charts/${meta.slug}` },
          { label: 'Méthode' },
        ]}
      />
      <header>
        <p className="sc-label">
          <Text>{"Méthode de l'édition"}</Text> {edition.weekId}
        </p>
        <h1>
          <Text>{method.label}</Text>
        </h1>
        <p>
          <Text>{method.description}</Text>
        </p>
        <ChartPublication publication={edition.publication} />
        <p>
          <Link href={`/charts/${meta.slug}/${edition.weekId}`}>
            <Text>{'Voir cette édition'}</Text>
          </Link>
        </p>
      </header>
      <section>
        <h2>
          <Text>{'Ce que les chiffres permettent de dire'}</Text>
        </h2>
        <p>
          <Text>
            {
              'Une popularité cumulée ne mesure pas une progression récente. Une mesure de benchmark dépend de ses tâches, de sa date et des modèles couverts. Les scores sont relatifs au pool observé.'
            }
          </Text>
        </p>
        <p>
          <Text>
            {
              "Les avis de l'équipe sont signés et séparés du calcul. Une recommandation dans le podcast ne modifie pas un rang."
            }
          </Text>
        </p>
        <p>
          <Text>
            {
              'Cette archive conserve sa version historique. La méthode v3 et sa calibration sont suivies séparément ; elles ne sont pas appliquées rétroactivement.'
            }
          </Text>
        </p>
      </section>
      <section>
        <h2>
          <Text>{'Mesures et sources conservées'}</Text>
        </h2>
        <p>
          <Text>
            {
              "Les mesures ci-dessous sont celles de l'édition. Une métrique affichée en contexte ne contribue pas nécessairement au score. Les poids effectifs ne sont indiqués que lorsqu'ils ont été conservés."
            }
          </Text>
        </p>
        <LocalizedElement
          as="div"
          className="scroll-x"
          role="region"
          aria-label="Preuves de cette édition"
          tabIndex={0}
        >
          <table className="dtable">
            <thead>
              <tr>
                <th>
                  <Text>{'Rang'}</Text>
                </th>
                <th>
                  <Text>{'Nom et sources'}</Text>
                </th>
                <th>
                  <Text>{'Mesures conservées'}</Text>
                </th>
                <th>
                  <Text>{'Poids effectifs conservés'}</Text>
                </th>
              </tr>
            </thead>
            <tbody>
              {edition.entries.map((entry) => {
                const weights = weightsSchema.safeParse(entry.provenance['weights']);
                return (
                  <tr key={entry.slug}>
                    <td>{entry.rank}</td>
                    <td>
                      {entry.name}
                      <ul>
                        {entry.sources.length ? (
                          entry.sources.map((source, index) => (
                            <li key={`${source.url}-${index}`}>
                              <ExtLink href={source.url}>{source.label}</ExtLink>
                            </li>
                          ))
                        ) : entry.sourceUrl ? (
                          <li>
                            <ExtLink href={entry.sourceUrl}>
                              <Text>{'Source'}</Text>
                            </ExtLink>
                          </li>
                        ) : (
                          <li>
                            <Text>{'Non renseignée'}</Text>
                          </li>
                        )}
                      </ul>
                    </td>
                    <td>
                      <ul>
                        {Object.entries(entry.metrics).map(([key, value]) => (
                          <li key={key}>
                            <code>{key}</code>
                            {' : '}
                            {value}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      {weights.success ? (
                        Object.entries(weights.data).map(([key, value]) => (
                          <p key={key}>
                            <code>{key}</code>
                            {' : '}
                            {value * 100} %
                          </p>
                        ))
                      ) : (
                        <Text>{'Non renseignés dans cette archive'}</Text>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </LocalizedElement>
      </section>
      <section>
        <h2>
          <Text>{'Configuration historique'}</Text>
        </h2>
        <p>
          <Text>
            {
              'Les paramètres ci-dessous ont été figés lors du calcul. Ils peuvent contenir des dimensions prévues mais absentes de certaines lignes. Ils ne remplacent pas les mesures et les poids effectifs conservés.'
            }
          </Text>
        </p>
        <details>
          <summary>
            <Text>{'Lire la configuration JSON'}</Text>
          </summary>
          <pre className="scroll-x">{JSON.stringify(edition.config, null, 2)}</pre>
        </details>
        <p>
          <ExtLink href={`/api/charts/${chart}/${encodeURIComponent(edition.weekId)}`}>
            <Text>{'Ouvrir les données JSON de cette édition'}</Text>
          </ExtLink>
        </p>
      </section>
      <section>
        <h2>
          <Text>{'Relevé, calcul et publication'}</Text>
        </h2>
        <p>
          <Text>
            {
              'Le relevé date une observation chez une source. Le calcul fige le score avec les observations disponibles. La publication rend cette édition accessible. Ces trois dates peuvent être différentes ; une nouvelle collecte ne republie pas automatiquement un classement.'
            }
          </Text>
        </p>
        <p>
          <Text>
            {
              "Les créneaux de calcul prévus à 03:17 et 15:17 UTC ne garantissent pas une nouvelle édition : la couverture, les baselines et la validation peuvent la retarder. La date affichée reste celle de l'édition effectivement publiée."
            }
          </Text>
        </p>
      </section>
    </article>
  );
}
