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

En local, l’admin persiste dans `.site-content.local.json` (ignoré par git). Aucune base n’est requise pour le build ni les tests CI.

## Commandes

| Commande               | Rôle                                                                   |
| ---------------------- | ---------------------------------------------------------------------- |
| `pnpm test`            | tests de logique pure, de contenu et de squelettes (Vitest)            |
| `pnpm typecheck`       | `next typegen` puis `tsc --noEmit`                                     |
| `pnpm content:check`   | valide le contenu : schémas, références, continuité des snapshots      |
| `pnpm content:new …`   | crée un épisode, un article, une entité, un avis ou un classement      |
| `pnpm week:run -- …`   | relève, calcule et écrit les snapshots d'une semaine (connecteur mock) |
| `pnpm db:migrate`      | applique les migrations Drizzle sur Postgres (prod / Neon)             |
| `pnpm db:seed`         | migre puis importe le contenu publié (`content/` ou Blob historique)   |
| `pnpm admin:bootstrap` | crée le premier compte admin (local ou Neon) si la table est vide      |
| `pnpm db:generate`     | régénère les migrations SQL à partir de `src/db/schema.ts`             |

Guide complet : [docs/site/editorial-workflow.md](../../docs/site/editorial-workflow.md).

## Variables d'environnement

| Variable                                  | Défaut                  | Effet                                                                                            |
| ----------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| `SITE_URL`                                | `http://localhost:3000` | URL canonique, OpenGraph, sitemap, JSON-LD                                                       |
| `SITE_DATA_MODE`                          | `mock`                  | `live` retire le bandeau et autorise l'indexation (à ne faire qu'avec de vraies données)         |
| `SITE_ADMIN_SECRET`                       | —                       | secret de signature des cookies de session (32 caractères minimum)                               |
| `DATABASE_URL`                            | —                       | URL Postgres (Neon via Vercel Storage) ; `POSTGRES_URL` est accepté en alias                     |
| `ADMIN_BOOTSTRAP_LOGIN`                   | —                       | identifiant du premier compte admin (seed / `pnpm admin:bootstrap`, une seule fois)              |
| `ADMIN_BOOTSTRAP_PASSWORD`                | —                       | mot de passe initial du premier compte admin                                                     |
| `ADMIN_BOOTSTRAP_DISPLAY_NAME`            | identifiant             | nom affiché du premier compte                                                                    |
| `ADMIN_BOOTSTRAP_ROLE`                    | `admin`                 | `viewer`, `editor` ou `admin` pour le premier compte                                             |
| `BLOB_READ_WRITE_TOKEN` / `BLOB_STORE_ID` | —                       | optionnel : `pnpm db:seed` peut lire l’ancien `published.json` sur Vercel Blob pour la migration |

## Persistance éditoriale (production)

Le backoffice `/admin` enregistre le contenu éditorial dans **Postgres** (une ligne par entité : article, épisode, host, etc.), avec un flux **brouillon → publication** et un **ETag** de brouillon pour détecter les conflits. Les **snapshots hebdomadaires** restent dans `data/` (fichiers Git / pipeline), inchangés.

### Mise en place sur Vercel

1. **Storage** → ajouter **Neon** (Postgres) au projet. Vercel injecte `DATABASE_URL` (et souvent `POSTGRES_URL`).
2. Déployer avec `SITE_ADMIN_SECRET` et Neon connecté.
3. Depuis une machine ou le shell Vercel avec les variables du projet :
   ```bash
   export ADMIN_BOOTSTRAP_LOGIN=…
   export ADMIN_BOOTSTRAP_PASSWORD=…
   pnpm db:migrate
   pnpm db:seed
   ```
   (`db:seed` importe l’éditorial et crée le premier compte si la table `admin_users` est vide.)
   Le seed charge d’abord `content/` du dépôt ; si l’ancien Blob est encore accessible, il préfère `published.json` pour ne pas perdre les publications en ligne.
4. Ouvrir `/admin` : connexion par **identifiant + mot de passe** (table `admin_users`). Rôles : `viewer` (lecture), `editor` (brouillon), `admin` (publication).

Sans `DATABASE_URL` en production, le contenu éditorial reste en mode « stockage non configuré » ; en local, comptes et brouillons peuvent utiliser des fichiers `.site-*.local.json`.

## Structure

```
content/   contenu éditorial en JSON (classements, scoring, entités, avis, épisodes, articles…)
data/      snapshots hebdomadaires écrits par le pipeline, immuables
drizzle/   migrations SQL versionnées (Postgres éditorial)
src/db/    schéma Drizzle et client Neon serverless
src/domain logique pure : scoring, classement, mouvements, historique, formats, balisage sûr
src/pipeline  connecteurs et mise à jour hebdomadaire (mock/ = données de démonstration)
src/lib    lecture du contenu, validation, graphe de relations, SEO, images OpenGraph
src/components, src/app   interface et routes
scripts/   week-run, content-check, content-new, db-migrate, db-seed
test/      Vitest
```
