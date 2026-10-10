# SANDBOX CHARTS : sources externes Skills et Models

Statut au 2026-10-08 : les collecteurs, le stockage PostgreSQL, les gels hebdomadaires, les routes et la planification locale sont implémentés. Les données ne sont pas encore activées en production : la migration `0005_external_chart_sources` doit être appliquée par le responsable de la base et les accès aux sources doivent être configurés. Aucune clé ni migration Neon n'a été créée ou utilisée pendant le développement.

La décision de conception est consignée dans [ADR-0021](../adr/ADR-0021-classements-externes-skills-models.md). Le pipeline GitHub existant reste décrit dans le [guide SANDBOX CHARTS](sandbox-charts.md).

## Sources branchées

| Classement | Source                                                                                                       | Données prises                                                                                                                                                                                    | Conditions techniques                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skills     | [Skills.sh API](https://www.skills.sh/docs/api)                                                              | Identité, URL et compteur cumulatif d'installations. Les vues `all-time` et `trending` sont lues sur les deux premières pages, jusqu'à 500 éléments par page. Les doublons signalés sont écartés. | Fédération OIDC en mode Team. La fonction lit `x-vercel-oidc-token` ; en local, `vercel env pull` écrit `VERCEL_OIDC_TOKEN`.                                                           |
| Skills     | [GitHub REST API](https://docs.github.com/en/rest/repos/repos#get-a-repository)                              | Dépôt associé, stars, forks, date de dernière activité, état archivé/fork/désactivé et sujets.                                                                                                    | `GITHUB_TOKEN`. Les dépôts privés, archivés, forks et désactivés sont exclus.                                                                                                          |
| Models     | [Hugging Face Hub API](https://huggingface.co/docs/hub/api)                                                  | Jusqu'aux 500 modèles publics `text-generation` les plus téléchargés, leurs téléchargements sur 30 jours, likes, tags, licence déclarée et accès restreint.                                       | API publique; `HUGGINGFACE_TOKEN` est facultatif. Les résultats de model cards ne sont pas traités comme des évaluations vérifiées.                                                    |
| Models     | [Arena Leaderboard Dataset](https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset)                  | Dernières lignes des configurations texte, WebDev, agents, vision et recherche, avec rang, score, catégorie et nombre de votes/observations.                                                      | Dataset public; un score Arena ne contribue au classement qu'à partir de 1 000 votes, ou 1 000 observations pour les agents. Le lien vers la source et son attribution sont conservés. |
| Models     | [OpenRouter Models API](https://openrouter.ai/docs/api/api-reference/models/get-models)                      | Modèles et rangs d'usage hebdomadaire/de débit, fenêtre de contexte, prix entrée/sortie.                                                                                                          | `OPENROUTER_API_KEY`, facultative. Sans cette clé, les données OpenRouter et Artificial Analysis manquent et le job est signalé partiel.                                               |
| Models     | [Artificial Analysis via OpenRouter](https://openrouter.ai/docs/api/api-reference/benchmarks/get-benchmarks) | Intelligence Index, Coding Index et Agentic Index.                                                                                                                                                | Même clé facultative OpenRouter.                                                                                                                                                       |

Les appels externes sont limités aux APIs et vues prévues, validés par Zod, réalisés avec timeout, retries bornés et sans secours par des chiffres simulés. Les URL affichées sont en HTTPS. Une source en erreur n'est pas remplacée par une mesure inventée.

## Identité et stockage

`chart_entities` garde l'identité canonique; `chart_entity_sources` associe une entité à ses identifiants et URL chez plusieurs fournisseurs. `chart_source_snapshots` conserve les mesures brutes avec `observed_on`, `collected_at` et le JSON du fournisseur. Une référence ne peut recevoir qu'un relevé par jour; les relevés ont une protection SQL contre UPDATE et DELETE.

Skills.sh est relié à GitHub par l'identifiant de dépôt fourni par Skills.sh. Les modèles sont reliés seulement par nom normalisé identique et organisation canonique. Aucun rapprochement approximatif n'est utilisé : plusieurs résultats ambigus d'une même source sont laissés séparés.

Les éditions publiées sont copiées dans `weekly_chart_editions` et `weekly_rankings`, avec rang, score, sous-scores, métriques utilisées, liens sources, identités figées et version de méthode. Une contrainte empêche de réécrire une édition. Les positions précédentes ne sont comparées qu'à l'édition publiée de la semaine précédente.

Les snapshots Git avec `provenance: mock` ne sont que des illustrations locales et peuvent contenir moins de vingt lignes. Ils ne sont pas servis en production; le collecteur ne publie une édition Skills ou Models qu'avec vingt candidats mesurables.

## Méthode Skills

Chaque candidat doit avoir un relevé du jour chez Skills.sh et GitHub ainsi que des relevés à environ J−7 (tolérance d'un jour) pour les compteurs d'installations et de stars. Son score est calculé ainsi :

- **50 % : installations gagnées** entre le relevé courant et la base Skills.sh proche de J−7 ;
- **30 % : stars gagnées** entre les relevés GitHub ;
- **20 % : fraîcheur du dépôt**, `100 × exp(-joursDepuisDernierPush / 30)`.

Chaque dimension est convertie en percentile parmi les candidats mesurables de la même édition; les valeurs égales reçoivent le rang moyen. Le classement ne paraît que si vingt candidats ont les mesures requises. Une édition sans sept jours d'historique n'est pas calculée.

## Méthode Models

Le rang principal `quality` exige au moins une valeur de qualité : Elo texte Arena ou Intelligence Index Artificial Analysis. Chaque source est normalisée séparément en percentile parmi les candidats disponibles; la moyenne utilise 50 % par source et renormalise le poids si un seul percentile existe.

Les vues complémentaires disponibles par édition sont :

- **Coding** : Arena WebDev et Artificial Analysis Coding Index, poids égaux quand les deux sont présents ;
- **Agents** : Arena Agent et Artificial Analysis Agentic Index, poids égaux quand les deux sont présents ;
- **Vision** et **Recherche** : percentiles Arena Vision et Arena Search ;
- **Contexte long** : percentile du logarithme de la taille de contexte publiée par OpenRouter ;
- **Débit** : rang relatif du tri de débit OpenRouter ;
- **Prix** : trois parts du prix d'entrée et une part du prix de sortie par million de tokens, plus faible = meilleur percentile ;
- **Value** : 60 % du score qualité et 40 % du score de prix ;
- **Reach** : moyenne du percentile de téléchargements Hub sur 30 jours et du rang d'usage OpenRouter; si l'un manque, l'autre reste le seul signal de cette vue.

Les vues **Reasoning** et **Maths** restent absentes tant qu'un jeu externe et la vérification cryptographique de ses résultats ne sont pas réellement branchés. Les champs déclarés par un éditeur dans une model card ne suffisent pas à prouver un résultat. Les mesures manquantes retirent leur poids; elles ne sont pas mises à zéro. Les percentiles ne sont comparables qu'au sein d'une même édition.

## Collecter, simuler, publier

Les crons Vercel appellent les routes protégées par `CRON_SECRET` :

- `external-daily` collecte les sources Skills et Models à 02:30 UTC ;
- `github-weekly`, chaque jour à 03:00 UTC, tente le gel GitHub/Rising puis Skills/Models. Le gel de chaque classement vérifie que sa collecte du jour est terminée. L'identifiant d'une nouvelle édition est la date UTC.

Commandes locales, depuis la racine du dépôt :

```powershell
corepack pnpm --filter @podcast/site charts:external-collect
corepack pnpm --filter @podcast/site charts:external-weekly -- --dry-run
corepack pnpm --filter @podcast/site charts:external-weekly -- --draft
```

`--dry-run` calcule sans ajouter de journal ni d'édition. Le premier rang Skills exige sept jours de relevés. La première édition Models attend également vingt modèles évaluables. Une relance n'écrase pas les relevés quotidiens ou éditions existants.

Après application contrôlée de la migration `0005`, les éditions publiées sont lisibles par `/api/charts/skills/current`, `/api/charts/models/current`, leurs routes d'archive et les pages `/charts/skills` et `/charts/ai-models`. Le site entier peut rester en mode démonstration pour son contenu média : les pages des classements affichent uniquement les éditions réelles de la base et aucun faux résultat ne les remplace.

## À faire avant activation en production

1. Confirmer les conditions de réutilisation, attribution et quotas de chaque service pour l'usage éditorial prévu.
2. Configurer les valeurs côté Vercel : `DATABASE_URL`, `GITHUB_TOKEN`, `CRON_SECRET`, la fédération OIDC en mode Team, et si souhaité `OPENROUTER_API_KEY`/`HUGGINGFACE_TOKEN`. Ne pas coller un `VERCEL_OIDC_TOKEN` statique.
3. Appliquer la migration additive `0005_external_chart_sources.sql` sur la base visée après sauvegarde et contrôle du journal de migrations.
4. Exécuter une collecte, attendre les historiques requis, faire un dry run et vérifier les sources ainsi que les vingt premières lignes avant d'ouvrir les éditions.

Ces étapes requièrent l'accès et l'action du responsable du projet; elles ne sont pas réalisées par le code local.
