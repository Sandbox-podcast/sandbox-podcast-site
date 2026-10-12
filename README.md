# Site média : podcast et classements tech et IA

Le dépôt sert le site `apps/site` (podcast et classements tech et IA). Les anciens snapshots inclus dans Git sont des données de démonstration. Les classements réels utilisent des relevés datés dans Postgres : voir [la conception du site](docs/site/README.md).

## Démarrer

Prérequis : Node 24 et pnpm 12 (`corepack enable`).

```bash
pnpm install
pnpm check
corepack pnpm --filter @podcast/site build
corepack pnpm --filter @podcast/site start
```

## Fonctionnement des classements

SANDBOX CHARTS suit quatre classements. Les collecteurs enregistrent chaque jour les mesures et leurs sources dans Postgres. Après la collecte, le pipeline tente de figer une nouvelle édition chaque matin à 03:00 UTC. Son identifiant est la date UTC ; les anciennes éditions identifiées par semaine ISO restent accessibles.

| Classement | Score des nouvelles éditions                                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub     | 75 % du score d'activité GitHub (stars, croissance, forks, contributeurs et récence du dernier push) et 25 % des pratiques relevées par OpenSSF Scorecard.                                                    |
| Rising     | 85 % du score de croissance et d'accélération GitHub et 15 % d'OpenSSF Scorecard.                                                                                                                             |
| Skills     | Installations gagnées sur Skills.sh et signaux GitHub à parts égales. La famille GitHub combine les stars gagnées (60 %) et la récence du dépôt (40 %). Un désaccord entre les deux familles réduit le score. |
| Models     | Résultats Arena texte et Intelligence Index d'Artificial Analysis à parts égales. Un désaccord entre les deux évaluateurs réduit le score. Les vues Code et Agents exigent aussi ces deux évaluateurs.        |

GitHub et Skills comparent les compteurs du jour à ceux d'environ J-7 ; Rising utilise aussi J-14 pour mesurer l'accélération. Les nouvelles éditions exigent deux familles de sources récentes et, par défaut, 20 candidats mesurables pour GitHub, Skills et Models. Rising peut en classer moins. Une source absente n'est pas remplacée par une valeur inventée. Les scores sur 100 dépendent des candidats de l'édition et ne se comparent pas directement d'un jour à l'autre. OpenSSF mesure des pratiques détectables, pas la sûreté du code.

Chaque édition publiée conserve ses rangs, mesures, sources et version de méthode. Elle ne peut pas être réécrite. Le mouvement compare deux publications du même classement si elles sont espacées de huit jours au plus. Les commentaires de l'équipe restent séparés des données et ne changent pas les rangs. Sans première édition réelle, le site montre l'avancement de la collecte sans afficher les chiffres de démonstration. Les nouveaux calculs et collecteurs attendent encore leur activation complète en production.

Détails : [méthode multi-source](docs/adr/ADR-0024-classements-corrobores.md), [cadence quotidienne](docs/adr/ADR-0023-editions-quotidiennes-des-classements.md), [méthode GitHub et Rising](docs/sandbox-charts-methodology.md), [sources Skills et Models](docs/site/external-rankings.md) et [guide d'exploitation](docs/site/sandbox-charts.md).

## Documentation

- `docs/README.md` : index de la documentation du site.
- `AGENTS.md` : règles pour les agents IA.

## Archive

`old/` contient le travail sur l'ancien projet de plateforme de production de podcasts vidéo (code, 10 POC, ADR, rapport final). Elle n'est plus dans l'espace de travail pnpm : voir `old/README.md`.
