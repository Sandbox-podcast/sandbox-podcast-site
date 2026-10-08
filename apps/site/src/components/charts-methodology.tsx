import { Text, LocalizedElement } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
import { Breadcrumbs } from '@/components/ui';
import { DEFAULT_GITHUB_CHART_CONFIG, githubChartConfigSchema } from '@/domain/github-charts';
import { hasDatabaseConfiguration } from '@/db/client';
import { publicChartEdition } from '@/lib/charts-public';
import { readChartsConfig } from '@/lib/charts-store';
const descriptions: Record<
  string,
  {
    label: string;
    detail: string;
  }
> = {
  starVelocity: {
    label: 'Stars gagnées',
    detail: 'Différence entre le relevé du jour et celui de J−7, avec une tolérance bornée.',
  },
  relativeGrowth: {
    label: 'Croissance relative',
    detail:
      'Stars gagnées divisées par les stars du relevé précédent. Un plancher protège le score contre les très petits dénominateurs ; le pourcentage public conserve la valeur brute.',
  },
  forkVelocity: { label: 'Forks gagnés', detail: 'Différence des forks entre les deux relevés.' },
  contributorActivity: {
    label: 'Contributeurs',
    detail:
      'Évolution du nombre de contributeurs si les deux relevés existent. Cette collecte facultative n’est pas encore connectée.',
  },
  repositoryActivity: {
    label: 'Activité du dépôt',
    detail: 'Récence du dernier push : 100 × exp(−jours depuis le push / 30).',
  },
  acceleration: {
    label: 'Accélération',
    detail:
      'Évolution de la vitesse des stars sur deux périodes successives de sept jours. La période précédente doit être positive.',
  },
  freshness: { label: 'Fraîcheur', detail: 'Âge du dépôt : 100 × exp(−âge en jours / 180).' },
};
export async function ChartsMethodology({ rising = false }: { rising?: boolean }) {
  let config = DEFAULT_GITHUB_CHART_CONFIG;
  let publishedWeek: string | null = null;
  if (hasDatabaseConfiguration()) {
    try {
      const edition = await publicChartEdition(rising ? 'rising' : 'github');
      config = edition ? githubChartConfigSchema.parse(edition.config) : await readChartsConfig();
      publishedWeek = edition?.weekId ?? null;
    } catch (error) {
      console.error(
        'Charts methodology unavailable:',
        error instanceof Error ? error.name : 'unknown',
      );
    }
  }
  const title = rising ? 'RISING 20' : 'GITHUB TOP 20';
  const weights = rising ? config.rising : config.momentum;
  return (
    <article className="wrap sc-methodology">
      <Breadcrumbs
        items={[
          { label: 'Classements', href: '/charts' },
          { label: title, href: rising ? '/charts/rising' : '/charts/github' },
          { label: 'Méthode' },
        ]}
      />
      <header>
        <p className="sc-label">
          <Text>{'MEASURES, THEN OUR TAKE'}</Text>
        </p>
        <h1>
          <Text>{'Comment se construit'}</Text>
          <br />
          <Text>{'le '}</Text>
          <Text>{title}</Text>
          <Text>{'.'}</Text>
        </h1>
        <p>
          <Text>
            {rising
              ? 'Repérer les projets dont la vitesse augmente avant qu’ils deviennent massifs.'
              : 'Mesurer les projets IA qui gagnent le plus de terrain sur GitHub cette semaine.'}
          </Text>
        </p>
        <span className="sc-label">
          <Text>{rising ? config.risingVersion : config.version}</Text>
          <Text>{' \u00B7'}</Text>
          <Text> </Text>
          <Text>
            {publishedWeek
              ? `configuration de l’édition ${publishedWeek}`
              : 'configuration initiale, avant la première édition'}
          </Text>
        </span>
      </header>
      <div className="sc-method-grid">
        <div>
          <section id="method-pipeline">
            <h2>
              <Text>{'Du d\u00E9p\u00F4t \u00E0 l\u2019\u00E9dition'}</Text>
            </h2>
            <p>
              <Text>
                {
                  'La d\u00E9couverte recherche des d\u00E9p\u00F4ts publics autour des sujets IA. La qualification automatique retient les d\u00E9p\u00F4ts non archiv\u00E9s, non forks, actifs dans les'
                }
              </Text>
              <Text> </Text>
              <Text>{config.recentDays}</Text>
              <Text>{' derniers jours et ayant au moins '}</Text>
              <Text>{config.qualificationStars}</Text>
              <Text> </Text>
              <Text>
                {
                  'stars. L\u2019\u00E9quipe peut changer leur statut de suivi et leur cat\u00E9gorie.'
                }
              </Text>
            </p>
            <p>
              <Text>
                {
                  'La collecte enregistre chaque jour les compteurs GitHub, leur date et leur source. Le lundi, apr\u00E8s la collecte du jour, les scores produisent une \u00E9dition fig\u00E9e. Les textes de l\u2019\u00E9quipe se publient s\u00E9par\u00E9ment.'
                }
              </Text>
            </p>
          </section>
          <section id="method-eligibility">
            <h2>
              <Text>{'Qui peut entrer ?'}</Text>
            </h2>
            <p>
              <Text>{'Un d\u00E9p\u00F4t suivi doit avoir au moins '}</Text>
              <Text>{config.eligibilityStars}</Text>
              <Text>{' stars, ou en avoir gagn\u00E9'}</Text>
              <Text> </Text>
              <Text>{config.eligibilityVelocity}</Text>
              <Text>
                {
                  ' sur la p\u00E9riode. Il doit disposer d\u2019un relev\u00E9 \u00E0 J\u22127 (tol\u00E9rance \u00B1'
                }
              </Text>
              <Text>{config.toleranceDays}</Text>
              <Text>
                {
                  ' jour). Un d\u00E9p\u00F4t bloqu\u00E9, exclu, archiv\u00E9 ou devenu un fork reste hors du classement.'
                }
              </Text>
            </p>
            <Text>
              {rising ? (
                <p>
                  <Text>{'Rising ajoute deux conditions : au plus'}</Text>
                  <Text> </Text>
                  <Text>{config.maximumRisingStars.toLocaleString('fr-FR')}</Text>
                  <Text>
                    {
                      ' stars et une acc\u00E9l\u00E9ration positive mesur\u00E9e avec un deuxi\u00E8me relev\u00E9 \u00E0 J\u221214. Aucun historique n\u2019est extrapol\u00E9.'
                    }
                  </Text>
                </p>
              ) : null}
            </Text>
          </section>
          <section id="method-score">
            <h2>
              <Text>{rising ? 'SANDBOX Rising Score' : 'SANDBOX Momentum Score'}</Text>
            </h2>
            <LocalizedElement
              as="div"
              className="sc-table-scroll"
              role="region"
              aria-label="Composantes et poids du score"
              tabIndex={0}
            >
              <table className="ac-table">
                <thead>
                  <tr>
                    <th>
                      <Text>{'Composante'}</Text>
                    </th>
                    <th>
                      <Text>{'Poids'}</Text>
                    </th>
                    <th>
                      <Text>{'Mesure'}</Text>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <Text>
                    {Object.entries(weights).map(([key, weight]) => (
                      <tr key={key}>
                        <td>
                          <Text>{descriptions[key]?.label ?? key}</Text>
                        </td>
                        <td>
                          <Text>{Math.round(weight * 100)}</Text>
                          <Text>{' %'}</Text>
                        </td>
                        <td>
                          <Text>{descriptions[key]?.detail}</Text>
                        </td>
                      </tr>
                    ))}
                  </Text>
                </tbody>
              </table>
            </LocalizedElement>
            <p>
              <Text>
                {
                  'Les mesures de croissance deviennent des percentiles entre 0 et 100 dans le groupe \u00E9ligible. Les \u00E9galit\u00E9s re\u00E7oivent leur rang moyen. L\u2019activit\u00E9 et la fra\u00EEcheur sont d\u00E9j\u00E0 born\u00E9es \u00E0 100. Le score est la somme pond\u00E9r\u00E9e de ces composantes.'
                }
              </Text>
            </p>
            <p>
              <Text>
                {
                  'Une composante absente garde une valeur nulle dans la provenance et son poids est retir\u00E9 du calcul. Les poids disponibles sont renormalis\u00E9s. La couverture du score indique leur somme : sans mesure des contributeurs, Momentum utilise 90 % de sa pond\u00E9ration pr\u00E9vue. Le plancher de croissance vaut '
                }
              </Text>
              <Text>{config.growthFloor}</Text>
              <Text>{' stars.'}</Text>
            </p>
          </section>
          <section id="method-history">
            <h2>
              <Text>{'Mouvements et archives'}</Text>
            </h2>
            <p>
              <Text>
                {
                  '\u2191 ou \u2193 compare la position \u00E0 l\u2019\u00E9dition de la semaine pr\u00E9c\u00E9dente. NEW signifie que le projet n\u2019y figurait pas, y compris en cas de retour. Une premi\u00E8re \u00E9dition n\u2019a pas de comparaison. Les archives conservent la configuration, les composantes, les mesures brutes et la version du score.'
                }
              </Text>
            </p>
            <p>
              <Text>
                {
                  'Les vues mensuelles et sur trois mois mesurent la pr\u00E9sence aux meilleures places : moyenne de 100 / rang sur les semaines disponibles, avec z\u00E9ro point les semaines hors classement. Elles ne moyennent pas des scores normalis\u00E9s de groupes diff\u00E9rents. Une semaine appartient au mois de son lundi.'
                }
              </Text>
            </p>
          </section>
          <section id="method-limits">
            <h2>
              <Text>{'Ce que mesure ce classement'}</Text>
            </h2>
            <p>
              <Text>
                {
                  'Les stars et les forks mesurent l\u2019attention et l\u2019adoption sur GitHub. Ils ne d\u00E9montrent pas la qualit\u00E9, la s\u00E9curit\u00E9 ni l\u2019usage en production. Les changements de compteurs peuvent \u00EAtre n\u00E9gatifs. Les valeurs manquantes restent absentes et une panne de collecte ne d\u00E9truit pas l\u2019historique.'
                }
              </Text>
            </p>
            <p>
              <Text>
                {
                  'Le pipeline actuel collecte les stars, forks, watchers, issues ouvertes et commits r\u00E9cents quand ils sont disponibles. Les contributeurs et releases sont conserv\u00E9s comme absents tant que leur collecte d\u00E9di\u00E9e n\u2019est pas branch\u00E9e. Skills et Models ont leur interface, avec leurs sources r\u00E9elles \u00E0 connecter.'
                }
              </Text>
            </p>
          </section>
        </div>
        <aside>
          <LocalizedElement as="nav" className="method-outline" aria-label="Sommaire de la méthode">
            <a href="#method-pipeline">
              <Text>{"Du d\u00E9p\u00F4t \u00E0 l'\u00E9dition"}</Text>
            </a>
            <a href="#method-eligibility">
              <Text>{"Conditions d'entr\u00E9e"}</Text>
            </a>
            <a href="#method-score">
              <Text>{'Calcul du score'}</Text>
            </a>
            <a href="#method-history">
              <Text>{'Mouvements et archives'}</Text>
            </a>
            <a href="#method-limits">
              <Text>{'Ce que mesure le classement'}</Text>
            </a>
          </LocalizedElement>
          <h2>
            <Text>{'Sources et rythme'}</Text>
          </h2>
          <p>
            <a
              href="https://docs.github.com/en/rest/search/search"
              target="_blank"
              rel="noreferrer"
            >
              <Text>{'GitHub Search API \u2197'}</Text>
            </a>
            <br />
            <a
              href="https://docs.github.com/en/graphql/reference/repos"
              target="_blank"
              rel="noreferrer"
            >
              <Text>{'GitHub GraphQL Repository \u2197'}</Text>
            </a>
          </p>
          <p>
            <Text>{'D\u00E9couverte : 01:00 UTC.'}</Text>
            <br />
            <Text>{'Collecte : 02:00 UTC.'}</Text>
            <br />
            <Text>{'\u00C9dition : lundi \u00E0 03:00 UTC.'}</Text>
          </p>
          <p>
            <Text>
              {
                'Les traitements par lots respectent les quotas GitHub et consignent leurs r\u00E9sultats. La premi\u00E8re \u00E9dition attend au moins '
              }
            </Text>
            <Text>{config.minimumCandidates}</Text>
            <Text>{' projets \u00E9ligibles.'}</Text>
          </p>
          <Link className="btn btn-solid" href={rising ? '/charts/rising' : '/charts/github'}>
            <Text>{'Voir le chart \u2197'}</Text>
          </Link>
        </aside>
      </div>
    </article>
  );
}
