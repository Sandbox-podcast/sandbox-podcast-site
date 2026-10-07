# @podcast/site

Site média : un podcast tech et ses classements hebdomadaires (GitHub, skills et agents, modèles IA, modèles open source), avec historique, méthodologie publique, avis de l'équipe séparés des données, fiches reliées aux épisodes et aux articles.

Les épisodes et classements fournis avec le dépôt sont encore simulés. Aucun bandeau de démonstration n'apparaît sur le site ; les pages restent exclues de l'indexation tant que les contenus et les mesures ne sont pas vérifiés. Les profils d'animation sont Lou, Nicolas et Loïc. Voir [docs/site](../../docs/site/README.md).

## Démarrer

Prérequis du dépôt : Node 24, pnpm 12.

```bash
pnpm install
pnpm --filter @podcast/site dev          # http://localhost:3000, /admin avec connexion
pnpm --filter @podcast/site build        # pages statiques et images OpenGraph
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

| Variable            | Défaut                  | Effet                                                                        |
| ------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| `SITE_URL`          | `http://localhost:3000` | URL canonique, OpenGraph, sitemap et JSON-LD                                 |
| `SITE_DATA_MODE`    | `mock`                  | `live` autorise l'indexation, seulement après validation des données réelles |
| `SITE_ADMIN_USERS`  | non défini              | Comptes nominatifs et empreintes des mots de passe pour `/admin`             |
| `SITE_ADMIN_SECRET` | non défini              | Clé de signature des sessions admin                                          |
| `BLOB_STORE_ID`     | non défini              | Stockage privé des brouillons et publications en production                  |
| `YOUTUBE_API_KEY`   | non défini              | Import complet des vidéos via YouTube Data API v3, côté serveur uniquement   |

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
