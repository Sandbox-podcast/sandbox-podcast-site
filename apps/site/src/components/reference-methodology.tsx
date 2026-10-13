import { Text } from '@/components/localization';
import { Breadcrumbs, ExtLink } from '@/components/ui';
import { REFERENCE_PROFILES } from '@/domain/reference-profiles';
import { referenceProfileSchema, referenceWeights } from '@/domain/reference-ranking';
import type { ChartId } from '@/domain/sandbox-charts';
import { publicChartEdition } from '@/lib/charts-public';

export async function ReferenceMethodology({ chart }: { chart: ChartId }) {
  let edition: Awaited<ReturnType<typeof publicChartEdition>>;
  try {
    edition = await publicChartEdition(chart);
  } catch (error) {
    console.error(
      'Reference methodology unavailable:',
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
  const config = edition?.config['referenceRanking'];
  const frozen =
    config &&
    typeof config === 'object' &&
    'input' in config &&
    config.input &&
    typeof config.input === 'object' &&
    'profile' in config.input
      ? referenceProfileSchema.safeParse(config.input.profile)
      : null;
  const profile = frozen?.success ? frozen.data : REFERENCE_PROFILES[chart];
  const weights = referenceWeights(profile);
  const published = frozen?.success === true;
  const slug = chart === 'models' ? 'ai-models' : chart;
  return (
    <article className="wrap sc-methodology">
      <Breadcrumbs
        items={[
          { label: 'Classements', href: '/charts' },
          { label: chart, href: `/charts/${slug}` },
          { label: 'Méthode' },
        ]}
      />
      <header>
        <p className="sc-label">
          <Text>{profile.version}</Text>
        </p>
        <h1>
          <Text>{'Comment ce classement est calculé'}</Text>
        </h1>
        <p>
          <Text>{profile.objective}</Text>
        </p>
        <p>
          <Text>
            {published
              ? `Configuration figée de l'édition ${edition?.weekId ?? ''}.`
              : 'Profil v3 expérimental en préparation. Les éditions antérieures conservent leur méthode.'}
          </Text>
        </p>
      </header>
      <section>
        <h2>
          <Text>{'Les poids des familles'}</Text>
        </h2>
        <ul>
          {profile.families.map((family) => (
            <li key={family.id}>
              <Text>{`${family.label} : ${Math.round(family.weight * 100)} %`}</Text>
            </li>
          ))}
        </ul>
        <p>
          <Text>
            {
              "Les budgets sont fixes pour tous les candidats. Dans chaque famille, la puissance relative d'une source combine sa pertinence, sa rigueur, sa reproductibilité et sa résistance à la manipulation. Ce sont des choix éditoriaux à calibrer sur des éditions réelles."
            }
          </Text>
        </p>
        <p>
          <Text>
            {
              'Le score est la moyenne pondérée des familles, moins 20 % de leur déviation absolue pondérée. Un même jeu de mesures republié par un autre site ne reçoit pas une seconde voix.'
            }
          </Text>
        </p>
      </section>
      <section>
        <h2>
          <Text>{'Les sources classantes'}</Text>
        </h2>
        <ul>
          {profile.sources.map((source) => (
            <li key={source.id}>
              <h3>
                <ExtLink href={source.methodologyUrl}>
                  <Text>{source.label}</Text>
                </ExtLink>
                <Text>{` : ${((weights[source.id] ?? 0) * 100).toFixed(1)} %`}</Text>
              </h3>
              <p>
                <Text>{source.rationale}</Text>
              </p>
              <p>
                <Text>{`Pertinence ${source.relevance}, rigueur ${source.rigor}, reproductibilité ${source.reproducibility}, résistance à la manipulation ${source.manipulationResistance}. Ancienneté maximale : ${source.maximumAgeDays} jours. Échantillon minimal : ${source.minimumSampleSize}.`}</Text>
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>
          <Text>{'Données absentes et couverture'}</Text>
        </h2>
        <p>
          <Text>
            {
              "Les nouveaux candidats GitHub et Skills constituent d'abord leurs baselines sur sept jours, Rising sur deux périodes. Avant l'admission officielle, les poussées intrajournalières peuvent déjà les signaler. Une baseline encore absente après cette attente peut bloquer le classement."
            }
          </Text>
        </p>
        <p>
          <Text>
            {
              'Une source absente, trop ancienne ou insuffisamment renseignée ne vaut pas zéro. Toutes les sources du profil sont requises pour attribuer un rang. Les percentiles sont calculés dans le pool observé de chaque source avant de croiser les candidats. Les candidats incomplets conservent une borne haute : si elle peut atteindre le Top, le gel attend.'
            }
          </Text>
        </p>
        <p>
          <Text>{`Le profil exige au moins ${profile.minimumCandidates} candidats complets. Le score dépend du pool suivi et ne prouve pas une supériorité universelle. Les installations et les stars peuvent être manipulées ; les benchmarks ont des biais de tâches et de langues.`}</Text>
        </p>
        {chart === 'github' || chart === 'rising' ? (
          <p>
            <Text>
              {
                'La découverte couvre plusieurs domaines et langues, avec des partitions de recherche. Le classement exige une licence open source reconnue par notre liste publiée. GitHub Trending sert uniquement à découvrir des candidats. Les poussées intrajournalières sont des signaux distincts, fondés sur nos propres relevés.'
              }
            </Text>
          </p>
        ) : null}
      </section>
      <section>
        <h2>
          <Text>{'Vérifier et reproduire'}</Text>
        </h2>
        <p>
          <Text>
            {
              'Chaque édition v3 conserve le profil, les observations normalisées et leurs liens, les contributions, la couverture, les exclusions et une empreinte SHA-256. Les rangs de sensibilité viennent de variations de 20 % et du retrait de chaque source ou famille. Ils décrivent des scénarios, sans probabilité statistique.'
            }
          </Text>
        </p>
        {published ? (
          <p>
            <a href={`/api/charts/${chart}/${edition?.weekId ?? 'current'}/proof`} download>
              <Text>{'Télécharger la preuve JSON de cette édition'}</Text>
            </a>
          </p>
        ) : (
          <p>
            <Text>{'La preuve sera accessible après publication de la première édition v3.'}</Text>
          </p>
        )}
        <p>
          <Text>
            {
              "Les avis de l'équipe restent séparés des scores. Une correction de méthode reçoit une nouvelle version ; les éditions publiées restent immuables."
            }
          </Text>
        </p>
      </section>
    </article>
  );
}
