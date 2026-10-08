import Link from 'next/link';
import { Breadcrumbs } from '@/components/ui';
import { DEFAULT_GITHUB_CHART_CONFIG, githubChartConfigSchema } from '@/domain/github-charts';
import { hasDatabaseConfiguration } from '@/db/client';
import { publicChartEdition } from '@/lib/charts-public';
import { readChartsConfig } from '@/lib/charts-store';

const descriptions: Record<string, { label: string; detail: string }> = {
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
        <p className="sc-label">MEASURES, THEN OUR TAKE</p>
        <h1>
          Comment se construit
          <br />
          le {title}.
        </h1>
        <p>
          {rising
            ? 'Repérer les projets dont la vitesse augmente avant qu’ils deviennent massifs.'
            : 'Mesurer les projets IA qui gagnent le plus de terrain sur GitHub cette semaine.'}
        </p>
        <span className="sc-label">
          {rising ? config.risingVersion : config.version} ·{' '}
          {publishedWeek
            ? `configuration de l’édition ${publishedWeek}`
            : 'configuration initiale, avant la première édition'}
        </span>
      </header>
      <div className="sc-method-grid">
        <div>
          <section id="method-pipeline">
            <h2>Du dépôt à l’édition</h2>
            <p>
              La découverte recherche des dépôts publics autour des sujets IA. La qualification
              automatique retient les dépôts non archivés, non forks, actifs dans les{' '}
              {config.recentDays} derniers jours et ayant au moins {config.qualificationStars}{' '}
              stars. L’équipe peut changer leur statut de suivi et leur catégorie.
            </p>
            <p>
              La collecte enregistre chaque jour les compteurs GitHub, leur date et leur source. Le
              lundi, après la collecte du jour, les scores produisent une édition figée. Les textes
              de l’équipe se publient séparément.
            </p>
          </section>
          <section id="method-eligibility">
            <h2>Qui peut entrer ?</h2>
            <p>
              Un dépôt suivi doit avoir au moins {config.eligibilityStars} stars, ou en avoir gagné{' '}
              {config.eligibilityVelocity} sur la période. Il doit disposer d’un relevé à J−7
              (tolérance ±{config.toleranceDays} jour). Un dépôt bloqué, exclu, archivé ou devenu un
              fork reste hors du classement.
            </p>
            {rising ? (
              <p>
                Rising ajoute deux conditions : au plus{' '}
                {config.maximumRisingStars.toLocaleString('fr-FR')} stars et une accélération
                positive mesurée avec un deuxième relevé à J−14. Aucun historique n’est extrapolé.
              </p>
            ) : null}
          </section>
          <section id="method-score">
            <h2>{rising ? 'SANDBOX Rising Score' : 'SANDBOX Momentum Score'}</h2>
            <div
              className="sc-table-scroll"
              role="region"
              aria-label="Composantes et poids du score"
              tabIndex={0}
            >
              <table className="ac-table">
                <thead>
                  <tr>
                    <th>Composante</th>
                    <th>Poids</th>
                    <th>Mesure</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(weights).map(([key, weight]) => (
                    <tr key={key}>
                      <td>{descriptions[key]?.label ?? key}</td>
                      <td>{Math.round(weight * 100)} %</td>
                      <td>{descriptions[key]?.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Les mesures de croissance deviennent des percentiles entre 0 et 100 dans le groupe
              éligible. Les égalités reçoivent leur rang moyen. L’activité et la fraîcheur sont déjà
              bornées à 100. Le score est la somme pondérée de ces composantes.
            </p>
            <p>
              Une composante absente garde une valeur nulle dans la provenance et son poids est
              retiré du calcul. Les poids disponibles sont renormalisés. La couverture du score
              indique leur somme : sans mesure des contributeurs, Momentum utilise 90 % de sa
              pondération prévue. Le plancher de croissance vaut {config.growthFloor} stars.
            </p>
          </section>
          <section id="method-history">
            <h2>Mouvements et archives</h2>
            <p>
              ↑ ou ↓ compare la position à l’édition de la semaine précédente. NEW signifie que le
              projet n’y figurait pas, y compris en cas de retour. Une première édition n’a pas de
              comparaison. Les archives conservent la configuration, les composantes, les mesures
              brutes et la version du score.
            </p>
            <p>
              Les vues mensuelles et sur trois mois mesurent la présence aux meilleures places :
              moyenne de 100 / rang sur les semaines disponibles, avec zéro point les semaines hors
              classement. Elles ne moyennent pas des scores normalisés de groupes différents. Une
              semaine appartient au mois de son lundi.
            </p>
          </section>
          <section id="method-limits">
            <h2>Ce que mesure ce classement</h2>
            <p>
              Les stars et les forks mesurent l’attention et l’adoption sur GitHub. Ils ne
              démontrent pas la qualité, la sécurité ni l’usage en production. Les changements de
              compteurs peuvent être négatifs. Les valeurs manquantes restent absentes et une panne
              de collecte ne détruit pas l’historique.
            </p>
            <p>
              Le pipeline actuel collecte les stars, forks, watchers, issues ouvertes et commits
              récents quand ils sont disponibles. Les contributeurs et releases sont conservés comme
              absents tant que leur collecte dédiée n’est pas branchée. Skills et Models ont leur
              interface, avec leurs sources réelles à connecter.
            </p>
          </section>
        </div>
        <aside>
          <nav className="method-outline" aria-label="Sommaire de la méthode">
            <a href="#method-pipeline">Du dépôt à l'édition</a>
            <a href="#method-eligibility">Conditions d'entrée</a>
            <a href="#method-score">Calcul du score</a>
            <a href="#method-history">Mouvements et archives</a>
            <a href="#method-limits">Ce que mesure le classement</a>
          </nav>
          <h2>Sources et rythme</h2>
          <p>
            <a
              href="https://docs.github.com/en/rest/search/search"
              target="_blank"
              rel="noreferrer"
            >
              GitHub Search API ↗
            </a>
            <br />
            <a
              href="https://docs.github.com/en/graphql/reference/repos"
              target="_blank"
              rel="noreferrer"
            >
              GitHub GraphQL Repository ↗
            </a>
          </p>
          <p>
            Découverte : 01:00 UTC.
            <br />
            Collecte : 02:00 UTC.
            <br />
            Édition : lundi à 03:00 UTC.
          </p>
          <p>
            Les traitements par lots respectent les quotas GitHub et consignent leurs résultats. La
            première édition attend au moins {config.minimumCandidates} projets éligibles.
          </p>
          <Link className="btn btn-solid" href={rising ? '/charts/rising' : '/charts/github'}>
            Voir le chart ↗
          </Link>
        </aside>
      </div>
    </article>
  );
}
