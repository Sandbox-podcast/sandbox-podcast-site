# SANDBOX CHARTS : exploitation

Le MVP GitHub réutilise Next.js 16, Neon/Postgres, Drizzle et l'authentification existante. Voir [ADR-0019](../adr/ADR-0019-sandbox-charts-github-postgres.md), [DD-0004](../design-decisions/DD-0004-sandbox-charts.md) et [la méthode](../sandbox-charts-methodology.md).

Le périmètre livré, les fichiers et les vérifications figurent dans [le rapport de livraison locale](sandbox-charts-livraison.md).
Pour transmettre l'activation au propriétaire Neon et au responsable Vercel, utiliser [la fiche de mise en service](mise-en-service-neon-vercel.md).
Les collecteurs et critères des autres sources sont détaillés dans [le guide Skills/Models](external-rankings.md) et [ADR-0021](../adr/ADR-0021-classements-externes-skills-models.md).

## Activer l'environnement

Les variables sont décrites dans [apps/site/.env.example](../../apps/site/.env.example). Renseigner côté serveur :

- `DATABASE_URL` ou `POSTGRES_URL` : base existante.
- `GITHUB_TOKEN` : jeton autorisé à lire les dépôts publics via GraphQL et Search.
- `CRON_SECRET` : secret d'au moins 16 caractères, transmis par Vercel comme Bearer.
- `VERCEL_OIDC_TOKEN` : accès aux Skills.sh; activer OIDC Federation dans le projet Vercel.
- `OPENROUTER_API_KEY` : facultative, donne les signaux d'usage, débit, prix, contexte et Artificial Analysis.
- `HUGGINGFACE_TOKEN` : facultative, augmente les limites d'accès au Hub.
- `SITE_ADMIN_SECRET` et comptes admin existants : accès au backoffice.
- `CHARTS_NEWSLETTER_URL` : facultatif, page HTTPS du service d'inscription.

Aucune nouvelle dépendance applicative ni service payant n'est ajouté. Vérifier les limites du plan Vercel, la durée maximale des fonctions et les quotas GitHub avant activation. La configuration cron figure dans [vercel.json](../../apps/site/vercel.json), en UTC. Les jobs se limitent à 220 secondes dans une fonction configurée pour 300 secondes.

Depuis `apps/site`, appliquer la migration additive avec les variables locales chargées :

```powershell
node --env-file-if-exists=.env.local scripts/db-migrate.ts
```

Le migrateur utilise le journal Drizzle et applique chaque migration une seule fois. La migration 0005 ajoute les références aux fournisseurs et les relevés externes immuables. Conserver les migrations déjà appliquées. Les tests PGlite exécutent le SQL et vérifient les protections d'écriture. Aucune migration n'a été exécutée sur une base réelle pendant cette tâche.

## Démarrer les collectes

Depuis la racine :

```powershell
corepack pnpm --filter @podcast/site charts:seed -- --dry-run
corepack pnpm --filter @podcast/site charts:seed
corepack pnpm --filter @podcast/site charts:discover
corepack pnpm --filter @podcast/site charts:collect
corepack pnpm --filter @podcast/site charts:weekly -- --dry-run
corepack pnpm --filter @podcast/site charts:weekly -- --draft
```

Le seed relit jusqu'à trente dépôts publics du catalogue existant via GitHub. Il ajoute des candidats sans créer de métriques ni de faux historiques. Le mode dry run du seed ne sauvegarde rien. Celui du classement ne crée ni édition ni journal. `--date=YYYY-MM-DD` est disponible pour une simulation historique à partir de relevés existants ; les semaines futures sont refusées.

Le mode brouillon fige les positions sans publier. Le cron de 03:00 UTC publie chaque jour une nouvelle édition lorsque la collecte du jour et l'historique requis sont là. Une édition existante n'est pas recalculée. Une publication manuelle s'effectue dans l'admin. Ne pas lancer un déploiement, une publication externe ou un push sans l'accord du propriétaire.

La qualification après collecte promeut automatiquement les candidats qui remplissent les critères, sauf statut manuel. En cas de limite de durée ou de quota, relancer la collecte : les relevés du jour déjà sauvegardés sont ignorés. Un job de même type déjà en cours bloque une seconde exécution. Un bail de quinze minutes permet la reprise après interruption.

Pour les sources externes, lancer `charts:external-collect` puis `charts:external-weekly -- --dry-run`. Skills.sh est lu avec Vercel OIDC; la première édition Skills requiert sept jours d'observations. Le gel Models nécessite vingt modèles disposant d'un score Arena admissible ou d'un indice Artificial Analysis. Les éditions externes sont conservées dans les mêmes tables immuables que GitHub. Voir les commandes complètes et les seuils dans [external-rankings.md](external-rankings.md).

## Backoffice

`/admin`, section Classements :

| Onglet                | Usage                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Collectes             | Compteurs, journaux, erreurs, découverte GitHub, collecte GitHub et Skills/Models, simulation et gel d'un brouillon |
| Dépôts suivis         | Recherche, pagination, catégorie, statut, mise en avant, derniers relevés                                           |
| Candidats             | Validation ou rejet des dépôts découverts                                                                           |
| Édition de la semaine | Lecture des scores figés, accroches, quatre champs de lecture, usages, watchlist et aperçu                          |
| Méthode               | Versions, seuils, pondérations et liste d'exclusion pour les prochaines éditions                                    |

Les mutations du catalogue, des jobs et de la méthode demandent le rôle admin. Un editor écrit ses brouillons ; seul un admin publie. Les autorisations et l'origine sont vérifiées par le serveur. Les conflits éditoriaux répondent 409, sans écraser le brouillon ouvert ailleurs.

## API publiques

| Route                              | Résultat                                                           |
| ---------------------------------- | ------------------------------------------------------------------ |
| `/api/charts/github/current`       | Dernière édition GitHub publiée                                    |
| `/api/charts/github/2026-W41`      | Édition GitHub précise                                             |
| `/api/charts/rising/current`       | Dernière édition Rising publiée                                    |
| `/api/charts/rising/2026-W41`      | Édition Rising précise                                             |
| `/api/charts/skills/current`       | Dernière édition Skills publiée                                    |
| `/api/charts/models/current`       | Dernière édition Models publiée                                    |
| `/api/charts/history?chart=github` | Liste des éditions publiées                                        |
| `/api/charts/project/:slug`        | Relevés sur 100 jours, historique hebdomadaire et score d'un dépôt |

Les éditions GitHub, Rising, Skills et Models retournent les mouvements stockés, les mesures, la méthode, les composantes et leur provenance. Sans première édition, `current` répond 202 avec `status=pending` et aucune entrée. Une archive ou une fiche inconnue répond 404. Une panne de base répond 503 ; elle ne déclenche pas de secours simulé.

Les pages `/charts`, `/charts/history`, `/charts/rising`, `/charts/project/:slug` et les archives utilisent cette même base. Les archives locales ne sont visibles en développement que sans base configurée. Les fichiers historiques du dépôt restent intacts. La politique d'indexation du reste du site demeure conditionnée à ses contenus réels et à `SITE_DATA_MODE`.

Décidée par l'agent sur délégation (PD-0003) : tant qu'aucune édition n'est publiée, `/charts` et l'aperçu d'accueil affichent l'avancement agrégé de la collecte (dépôts suivis, relevés du jour, jours d'historique, dernier relevé réussi, première semaine possible) sans inventer de rangs. `HUGGINGFACE_TOKEN` et l'alias `HF_TOKEN` sont acceptés. Les jobs Skills/Models sont déclenchables depuis l'admin en plus du cron et du CLI.

## Contrôles avant livraison

Lancer `pnpm check` puis le build. Valider un dry run après constitution de J−7, puis contrôler la première édition avec les mesures sources. Rising demande J−14. Inspecter les journaux et reprendre les dépôts en erreur. Tester les crons sur l'environnement prévu avant de livrer.

Les tests couvrent le scoring, les clients de sources externes, les données absentes, l'immuabilité SQL, les relances, le dry run, une collecte partielle, les quotas, les conflits éditoriaux et les permissions serveur. La première collecte réelle Skills/Models et les crons Vercel attendent les secrets, les conditions d'usage confirmées et une base configurée.
