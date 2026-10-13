# Livraison des classements v3

Vérification locale du 13 octobre 2026, dans une branche isolée de `main`. Les modifications sans rapport du dossier principal sont préservées. Aucun compte, accès payant, migration Neon ou classement de production n'a été activé.

La conception et l'audit sont dans [reference-ranking-design.md](reference-ranking-design.md). Le [prompt réutilisable](prompt-classements-reference.md) et [le guide de reprise](reference-ranking-operations.md) donnent au responsable les étapes de configuration. Le [README](../../README.md) décrit le fonctionnement global. Les décisions sont consignées dans ADR-0026, ADR-0027 et ADR-0028 sur délégation PD-0003.

Mise à jour du 13 octobre 2026 : la publication deux fois par jour et la collecte horaire des poussées sont implémentées. La migration additive 0010 stocke les relevés par créneau ; `.github/workflows/charts-refresh.yml` appelle les routes Vercel aux heures documentées dans le guide. Il reste à appliquer les migrations, configurer les accès et secrets, activer les connecteurs retenus et surveiller les premières exécutions dans l'environnement prévu. L'issue de passation liste ces étapes.

## Critères vérifiés

| Critère                                                      | Preuve locale                                                                                                                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Poids différents selon les familles et puissance des sources | Tests du moteur : budgets, contributions, refus des doublons amont et des profils invalides                                                                        |
| Données absentes traitées sans zéro inventé                  | Tests de baselines, dates, échantillons, bornes hautes et refus d'un Top contestable                                                                               |
| Découverte continue compatible avec une publication          | Test d'un nouveau candidat en constitution de baseline, puis blocage si elle manque encore après admission                                                         |
| Variantes de modèles conservatrices                          | Tests de signatures et de conflit d'identifiants d'évaluateur ; gel Models sur Postgres avec les dates des benchmarks                                              |
| Éditions immuables et rejouables                             | Tests PGlite de gel, relance, revue, protection SQL, provenance et preuve ; CLI audit puis replay avec la même empreinte sur une fixture locale                    |
| Détection des poussées                                       | Tests 1 h, durée réelle, fenêtres manquantes, croissance relative, accélération et refus des contradictions ; collecte intégrée avec idempotence et blacklist      |
| Trending traité comme découverte                             | Test d'intégration daté sans création de rang ; probe en lecture sur la page publique avec neuf identifiants extraits à cet instant                                |
| API et droits                                                | API locale : Models courant 202 en attente, preuve absente 404, poussées 200 désactivées, cron non authentifié 401 ; tests des droits et du téléchargement Unicode |
| Interface honnête sans données réelles                       | Navigateur local : méthode Models avec profil expérimental et poids 60/40 ; Rising en attente et collecte horaire désactivée                                       |

## Commandes et résultats

- `corepack pnpm check` : format, lint, types et 345 tests réussis dans 59 fichiers.
- `corepack pnpm --filter @podcast/site build` : réussi, 178 pages générées. Avertissement préexistant de Next.js sur la convention `middleware`.
- `corepack pnpm audit --audit-level=high` : code de sortie 0, aucune vulnérabilité haute ou critique. L'audit complet signale une alerte modérée préexistante, [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99), sur esbuild 0.18.20 via `drizzle-kit` et ses dépendances de développement. Le lockfile est inchangé.
- `charts:reference audit` et `charts:reference replay` : code de sortie 0 sur une fixture de deux candidats, même empreinte après recalcul. Aucun enregistrement en base réelle.
- `git diff --check` : aucune erreur d'espacement.
- Vérification de rédaction : README et nouveaux documents relus, caractères contrôlés par `fasst-human-quality`.

Le checkout Windows a été normalisé en LF pour exécuter Prettier. Ces fins de ligne ne changent pas le contenu du diff. Les anciennes migrations et l'archive ne sont pas modifiées ; seule la migration additive 0009 est livrée.

## Reprise et limites

Les accès, droits de redistribution, migrations réelles, calibrations et quotas restent à configurer dans l'issue de passation. Les nouveaux profils restent expérimentaux, leur publication demande les versions exactes autorisées, et les deux nouveaux collecteurs restent désactivés jusqu'à leur activation. Le workflow GitHub Actions est livré ; ses variables, son secret et sa présence sur la branche par défaut restent à configurer.

La couverture mondiale, la fiabilité empirique des coefficients et le délai d'avance sur Trending n'ont pas été mesurés. Le probe Trending valide le format observé aujourd'hui, sans garantir sa stabilité. Les connecteurs déjà disponibles sont réutilisés ; les sources complémentaires citées dans la conception attendent une validation de comparabilité et leurs adaptateurs. La migration 0009 est vérifiée sur PGlite, pas sur la base Neon de production. Les tests avec données réelles des autres fournisseurs et une revue externe de la méthode restent à faire.
