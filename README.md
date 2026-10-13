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

SANDBOX CHARTS suit les projets open source sur GitHub, les skills et les modèles IA. Il conserve les mesures et leurs sources dans Postgres, puis calcule des éditions figées avec une méthode versionnée. Le classement GitHub couvre tous les domaines ; son filtre IA historique est retiré de la découverte. L'ambition est une référence internationale vérifiable. Sa couverture et sa reconnaissance restent à démontrer sur des données réelles.

| Classement | Profil v3 initial                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub     | 70 % de dynamique GitHub sur sept jours et 30 % de pratiques OpenSSF Scorecard. Une licence open source reconnue est requise.                   |
| Rising     | 85 % de croissance et d'accélération GitHub, 15 % d'OpenSSF. Le dépôt doit avoir au plus 25 000 stars et une accélération positive.             |
| Skills     | 70 % d'installations gagnées sur Skills.sh et 30 % de signaux GitHub. La famille dépôt combine les étoiles gagnées (60 %) et la récence (40 %). |
| Models     | 60 % d'Artificial Analysis et 40 % d'Arena texte, avec une identité de variante conservatrice, des dates récentes et au moins 1000 votes Arena. |

La chaîne comporte cinq étapes :

1. Découvrir des candidats. La recherche GitHub utilise des partitions générales, des bandes de stars, plusieurs langages et les projets récents. Les sources Skills et Models alimentent leurs propres pools. GitHub Trending peut ajouter des candidats après activation de son connecteur ; sa position ne compte pas comme un second signal indépendant de GitHub.
2. Enregistrer les mesures. Les collectes quotidiennes conservent les compteurs, résultats, références, dates et identités. GitHub et Skills comparent le jour courant à une baseline proche de J-7 ; Rising utilise aussi J-14. Un compteur absent ne devient pas zéro. Les relevés historiques restent immuables.
3. Détecter les poussées. Un collecteur intrajournalier optionnel enregistre les étoiles des dépôts surveillés et cherche des gains sur 1 h, 6 h et 24 h. Il utilise la durée réellement observée et des seuils absolus et relatifs. Les signaux apparaissent séparément dans Rising et peuvent promouvoir un candidat en suivi. Ils ne donnent pas seuls un rang officiel. Le pool est borné par les quotas ; une avance sur Trending n'est pas garantie.
4. Pondérer et contrôler. Les sources sont réparties en familles dont les budgets restent fixes pour tous les candidats. Dans une famille, leur puissance dépend de la pertinence, de la rigueur, de la reproductibilité et de la résistance à la manipulation. Un même jeu de mesures ne reçoit pas deux voix. Le score retranche une pénalité de désaccord à la moyenne pondérée. Les coefficients initiaux sont à calibrer.
5. Figer et publier. Après les collectes, le pipeline tente une édition quotidienne à 03:00 UTC. Son identifiant est la date UTC ; les anciennes semaines ISO restent valides. Le profil v3 exige par défaut vingt candidats complets. Un candidat incomplet qui pourrait atteindre le Top bloque le gel. Les nouveaux profils restent en brouillon jusqu'à leur revue et à l'activation de leurs versions exactes.

Chaque édition v3 conserve une preuve JSON avec le profil, les observations normalisées et leurs liens, les contributions, la couverture, les exclusions, les rangs de sensibilité et une empreinte SHA-256. On peut la télécharger via `/api/charts/<classement>/<édition>/proof` et la rejouer avec `charts:reference`. La sensibilité varie les pondérations et retire les sources ou familles tour à tour ; ses bornes ne sont pas des intervalles de confiance. Les scores sur 100 dépendent du pool suivi et ne se comparent pas directement d'un jour à l'autre.

Une édition publiée ne peut pas être réécrite. Le mouvement compare deux publications espacées de huit jours au plus. Les avis de l'équipe restent séparés des données et ne changent pas les rangs. Sans édition réelle, le site montre l'attente sans inventer de rangs. Les archives v1 et v2 conservent leurs paramètres, y compris leurs anciens poids. OpenSSF mesure des pratiques ; les étoiles et installations mesurent l'attention ou l'adoption ; aucun de ces signaux ne prouve une supériorité dans tous les usages.

La mise en service demande les accès aux sources, la migration additive 0009 pour les observations intrajournalières, une revue des droits et des quotas, puis une calibration. La configuration active conserve les crons existants. L'exemple `apps/site/vercel.bursts.example.json` ajoute une cadence horaire à installer après vérification du forfait et du budget. Les nouveaux connecteurs Trending et poussées sont désactivés par défaut.

Détails : [conception et audit](docs/site/reference-ranking-design.md), [configuration et reprise](docs/site/reference-ranking-operations.md), [prompt réutilisable](docs/site/prompt-classements-reference.md), [ADR-0026](docs/adr/ADR-0026-classements-de-reference-ponderes.md), [ADR-0027](docs/adr/ADR-0027-detection-precoce-github.md). Les [méthodes historiques](docs/sandbox-charts-methodology.md) et le [guide des sources externes](docs/site/external-rankings.md) décrivent les versions précédentes.

Les nouveaux candidats constituent d'abord leurs baselines avant admission au pool officiel : environ sept jours pour GitHub et Skills, quatorze pour Rising. Les poussées peuvent les signaler plus tôt. Après ce délai, une baseline manquante peut bloquer le Top ; elle n'est plus considérée comme une simple attente de démarrage.

## Documentation

- `docs/README.md` : index de la documentation du site.
- `AGENTS.md` : règles pour les agents IA.

## Archive

`old/` contient le travail sur l'ancien projet de plateforme de production de podcasts vidéo (code, 10 POC, ADR, rapport final). Elle n'est plus dans l'espace de travail pnpm : voir `old/README.md`.
