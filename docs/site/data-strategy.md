# Site média : stratégie d'alimentation des données

Le nouveau pipeline GitHub de SANDBOX CHARTS est décrit dans [son guide](sandbox-charts.md) et [sa méthode](../sandbox-charts-methodology.md). Il utilise Postgres pour les relevés et éditions réels. Les connecteurs et fichiers présentés ci-dessous décrivent le pipeline historique de développement ; ses fixtures ne servent pas de données de production aux nouvelles routes de charts.

Statut au 2026-10-06 : **seul le connecteur `mock` existe.** Les connecteurs réels ci-dessous sont des cibles documentées, aucun n'est écrit ni testé.

## Principes

1. **Jamais de valeur inventée.** Un connecteur qui n'obtient pas une métrique la laisse absente. Le scoring ignore les composants absents (la dimension est absente si tous manquent) et le pipeline refuse de publier un classement qui n'a pas assez de candidats.
2. **Provenance explicite dans les données.** Chaque snapshot porte `provenance` : `auto` (connecteur), `mock` (démonstration), ou `editorial` (saisie). Les marqueurs de démonstration ont été retirés de la vue publique à la demande du propriétaire ; tant que `SITE_DATA_MODE=mock`, toutes les pages restent en `noindex` et le sitemap est vide. La provenance demeure vérifiable dans les fichiers et le backoffice.
3. **Un snapshot publié ne se modifie pas.** On corrige par une note éditoriale ou en publiant la semaine suivante.
4. **Données et avis séparés** : les connecteurs n'écrivent jamais dans `content/`, l'équipe n'écrit jamais dans `data/`.
5. **Sources respectées.** Avant de brancher une source, on lit ses conditions d'utilisation (quotas, attribution, réutilisation, interdiction éventuelle de l'extraction automatique). En cas de doute, on ne branche pas et on cite la source avec un lien.

## Cycle hebdomadaire

```
Connecteur ──► candidats (métriques brutes) ──► scoring (profil) ──► rang ──► snapshot JSON
                                                                             │
                                   mouvements, séries, statistiques ◄────────┘ (calculés à la lecture)
```

1. `pnpm week:run -- --week <AAAA-Wnn>` relève les candidats de chaque classement (`Connector.fetchCandidates`), calcule scores et rangs (`buildSnapshot`), valide le snapshot (Zod : rangs contigus, scores décroissants, pas de doublon) et l'écrit.
2. `pnpm content:check` vérifie la continuité (pas de semaine manquante), les références et la cohérence entre score et dimension principale.
3. L'équipe écrit les avis, crée l'épisode, puis commit et déploie. La page `/admin` liste les mouvements qui n'ont pas encore d'avis.

## Connecteurs prévus

| Connecteur         | Source                                                    | Ce qu'on en tire                                                         | À vérifier avant de coder                                                                                                                                         |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `github`           | API REST GitHub                                           | étoiles, forks, contributeurs, commits des 30 derniers jours             | jeton d'accès (**compte et quotas : décision du propriétaire**), pagination des contributeurs, statistiques d'activité parfois calculées en différé (réponse 202) |
| `github` (stars7d) | snapshots précédents                                      | `stars7d` = étoiles du snapshot courant moins celles du précédent        | la première semaine n'a pas de précédent : relevé ponctuel de l'historique d'étoiles (coûteux sur les gros dépôts) ou semaine de base sans gain                   |
| `huggingface`      | API du Hub                                                | disponibilité des poids, licence, taille, téléchargements                | la licence déclarée n'est pas toujours la licence réelle : vérification éditoriale                                                                                |
| `leaderboard`      | classements publics de benchmarks (SWE-bench, GPQA, etc.) | scores par benchmark, avec protocole et auteur de l'évaluation           | conditions d'utilisation de chaque classement, distinction score éditeur / score indépendant, version du benchmark, date                                          |
| `pricing`          | pages tarifaires et agrégateurs                           | prix d'entrée et de sortie, vitesse de sortie (médiane des fournisseurs) | stabilité des pages, médiane plutôt que meilleur fournisseur                                                                                                      |

Un connecteur retourne `{ provenance, retrievedAt, candidates, missing }`. Le pool de candidats d'un classement est **éditorial** (ce que l'équipe suit) : un projet absent du pool ne peut pas entrer. Pour la démonstration, les pools sont dans `src/pipeline/mock/` ; pour du réel, ils devront être déclarés dans la définition du classement.

## Données de démonstration

`src/pipeline/mock/` génère 16 semaines (S26 à S41) de séries déterministes : trajectoires de stars définies par quelques points, benchmarks de modèles avec des révisions datées, bruit reproductible. Les noms de projets et de modèles sont réels pour que la maquette soit lisible, **les chiffres ne le sont pas**. Pour régénérer : `pnpm week:run -- --from 2026-W26 --to 2026-W41 --rebuild-mock`.

Passage en réel : définir `SITE_DATA_MODE=live` seulement après avoir branché les connecteurs, remplacé les épisodes fictifs, supprimé les snapshots `mock` (le script refuse de supprimer autre chose) et régénéré. Le blocage de l'indexation disparaît alors. **Garde-fou** : en mode `live`, la validation échoue (et donc le build) tant qu'un snapshot de provenance `mock` subsiste, pour qu'une donnée simulée ne soit jamais publiée comme une mesure.

## Risques

- Étoiles GitHub gonflables : le score pèse la croissance et l'activité, et les avis servent à signaler un pic suspect. Pas de détection automatique pour l'instant.
- Benchmarks contaminés ou mesurés par l'éditeur : les limites sont écrites dans chaque page de méthodologie.
- Dépendance à des sources tierces dont les conditions peuvent changer : chaque source a un statut (`connected`, `planned`, `manual`) visible sur le site.
