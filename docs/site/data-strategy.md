# Site média : stratégie d'alimentation des données

Le pipeline GitHub de SANDBOX CHARTS utilise Postgres pour les relevés et éditions publiés. Les pipelines Skills et Models sont maintenant implémentés avec des observations externes conservées en base. Le périmètre, les sources, les scores et les besoins d'activation sont décrits dans [le guide des classements externes](external-rankings.md), avec la décision correspondante dans [ADR-0021](../adr/ADR-0021-classements-externes-skills-models.md). Les collecteurs ne remplacent pas les fixtures des autres sections du site.

Statut au 2026-10-08 : les collecteurs, scripts, migrations additives, crons, éditions immuables et lectures live des charts sont écrits. Les relevés ne sont pas encore activés en production. Il reste à confirmer les conditions d'utilisation, configurer les accès et OIDC, appliquer la migration `0005` sur la base visée, puis attendre les périodes d'historique requises. Aucun secret ni migration de production n'a été utilisé dans l'implémentation locale.

## Principes

1. **Jamais de valeur inventée.** Un connecteur qui n'obtient pas une métrique la laisse absente. Le scoring ignore les composants absents (la dimension est absente si tous manquent) et le pipeline refuse de publier un classement qui n'a pas assez de candidats.
2. **Provenance explicite dans les données.** Chaque snapshot porte `provenance` : `auto` (connecteur), `mock` (démonstration), ou `editorial` (saisie). Les marqueurs de démonstration ont été retirés de la vue publique à la demande du propriétaire ; tant que `SITE_DATA_MODE=mock`, toutes les pages restent en `noindex` et le sitemap est vide. La provenance demeure vérifiable dans les fichiers et le backoffice.
3. **Un snapshot publié ne se modifie pas.** On corrige par une note éditoriale ou en publiant la semaine suivante.
4. **Données et avis séparés** : les connecteurs n'écrivent jamais dans `content/`, l'équipe n'écrit jamais dans `data/`.
5. **Sources respectées.** Avant de brancher une source, on lit ses conditions d'utilisation (quotas, attribution, réutilisation, interdiction éventuelle de l'extraction automatique). En cas de doute, on ne branche pas et on cite la source avec un lien.

## Cycle des contenus historiques

```
Connecteur mock ──► candidats (métriques brutes) ──► scoring (profil) ──► rang ──► snapshot JSON
                                                                             │
                                   mouvements, séries, statistiques ◄────────┘ (calculés à la lecture)
```

1. `pnpm week:run -- --week <AAAA-Wnn>` génère les snapshots de démonstration des anciens parcours de contenu, validés par Zod.
2. `pnpm content:check` vérifie les références des fichiers de contenu et de ces snapshots.
3. Les classements live GitHub/Skills/Models suivent le pipeline Postgres décrit par [le guide d'exploitation](sandbox-charts.md) et le [guide externe](external-rankings.md); ils ne passent pas par `week:run`.

## Sources des classements live

| Classement | Sources                                                                   | Métriques et limites                                                                                                                 |
| ---------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| GitHub     | GitHub REST/GraphQL, relevés SANDBOX                                      | Stars, forks, historique de l'activité GitHub; détails et seuils dans [ADR-0019](../adr/ADR-0019-sandbox-charts-github-postgres.md). |
| Skills     | Skills.sh + GitHub REST                                                   | Installations cumulées, évolution des installations et étoiles, fraîcheur du dépôt. J−7 est dérivé des propres observations datées.  |
| Models     | Hugging Face Hub, Arena, OpenRouter et Artificial Analysis via OpenRouter | Métriques du Hub, votes Arena, usage, contexte, débit, prix et indices AA; seuls les signaux réellement lus sont publiés.            |

Les collecteurs live valident les réponses fournisseur avec Zod et conservent chaque observation avec sa date et son URL source. Les correspondances de modèles reposent sur un nom et une organisation normalisés; les ambiguïtés ne sont pas fusionnées. Les scripts et accès requis sont recensés dans [external-rankings.md](external-rankings.md).

## Données de démonstration

`src/pipeline/mock/` génère 16 semaines (S26 à S41) de séries déterministes : trajectoires de stars définies par quelques points, benchmarks de modèles avec des révisions datées, bruit reproductible. Les noms de projets et de modèles sont réels pour que la maquette soit lisible, **les chiffres ne le sont pas**. Pour régénérer : `pnpm week:run -- --from 2026-W26 --to 2026-W41 --rebuild-mock`.

Passage global du site en réel : définir `SITE_DATA_MODE=live` seulement après avoir remplacé les contenus simulés, contrôlé les pages et supprimé les snapshots historiques `mock`. Ce réglage n'active pas les classements live : ils attendent leur propre configuration Postgres, migrations et variables de sources. **Garde-fou** : aucun classement live ne prend les fichiers de démonstration comme secours.

## Risques

- Étoiles GitHub gonflables : le score pèse la croissance et l'activité, et les avis servent à signaler un pic suspect. Pas de détection automatique pour l'instant.
- Benchmarks contaminés ou mesurés par l'éditeur : les limites sont écrites dans chaque page de méthodologie.
- Dépendance à des sources tierces dont les conditions peuvent changer : chaque source a un statut (`connected`, `planned`, `manual`) visible sur le site.
