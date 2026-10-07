# @podcast/site

Site média : un podcast tech et ses classements hebdomadaires (GitHub, skills et agents, modèles IA, modèles open source), avec historique, méthodologie publique, avis de l'équipe séparés des données, fiches reliées aux épisodes et aux articles.

**Mode démonstration** : aucune valeur affichée ne vient d'une API ni d'un benchmark réel. Le nom « Hot Reload » et les trois animateurs sont des placeholders. Voir [docs/site](../../docs/site/README.md).

## Démarrer

Prérequis du dépôt : Node 24, pnpm 12.

```bash
pnpm install
pnpm --filter @podcast/site dev          # http://localhost:3000, /admin disponible
pnpm --filter @podcast/site build        # 345 pages statiques et images OpenGraph
pnpm --filter @podcast/site start
```

## Commandes

| Commande             | Rôle                                                                   |
| -------------------- | ---------------------------------------------------------------------- |
| `pnpm test`          | tests de logique pure, de contenu et de squelettes (Vitest)            |
| `pnpm typecheck`     | `next typegen` puis `tsc --noEmit`                                     |
| `pnpm content:check` | valide le contenu : schémas, références, continuité des snapshots      |
| `pnpm content:new …` | crée un épisode, un article, une entité, un avis ou un classement      |
| `pnpm week:run -- …` | relève, calcule et écrit les snapshots d'une semaine (connecteur mock) |

Guide complet : [docs/site/editorial-workflow.md](../../docs/site/editorial-workflow.md).

## Variables d'environnement

| Variable         | Défaut                  | Effet                                                                                    |
| ---------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| `SITE_URL`       | `http://localhost:3000` | URL canonique, OpenGraph, sitemap, JSON-LD                                               |
| `SITE_DATA_MODE` | `mock`                  | `live` retire le bandeau et autorise l'indexation (à ne faire qu'avec de vraies données) |
| `ENABLE_ADMIN`   | non défini              | `true` expose `/admin` dans un build de production                                       |

## Structure

```
content/   contenu éditorial en JSON (classements, scoring, entités, avis, épisodes, articles…)
data/      snapshots hebdomadaires écrits par le pipeline, immuables
src/domain logique pure : scoring, classement, mouvements, historique, formats, balisage sûr
src/pipeline  connecteurs et mise à jour hebdomadaire (mock/ = données de démonstration)
src/lib    lecture du contenu, validation, graphe de relations, SEO, images OpenGraph
src/components, src/app   interface et routes
scripts/   week-run, content-check, content-new
test/      Vitest
```
