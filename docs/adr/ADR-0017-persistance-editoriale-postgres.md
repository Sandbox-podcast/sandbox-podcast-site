# ADR-0017 — Persistance éditoriale Postgres

- Statut : acceptée pour le code ; activation sur Vercel réservée au propriétaire du compte
- Date : 2026-10-07
- Décision prise par l'agent sur délégation (PD-0003), en intégrant la [PR #2](https://github.com/Sandbox-podcast/sandbox-podcast-site/pull/2) dans l'application `apps/site`

## Contexte

L'[ADR-0016](ADR-0016-administration-editoriale-vercel.md) prévoyait deux fichiers complets dans Vercel Blob pour le brouillon et la version publiée. La PR #2 apporte une persistance Postgres/Neon, une ligne par entité, mais cible l'ancienne application située à la racine du dépôt. Le site et son backoffice sont maintenant dans `apps/site`, avec trois comptes nominatifs et des formulaires simplifiés.

## Décision

1. En production, stocker l'éditorial dans Postgres avec `editorial_records` (`draft` et `published`) et `editorial_draft_meta` (ETag du brouillon). Les snapshots hebdomadaires restent dans Git et ne passent pas par l'admin.
2. Conserver `SITE_ADMIN_USERS` et `SITE_ADMIN_SECRET` pour Lou, Nicolas et Loïc. La variable `SITE_ADMIN_PASSWORD` de la PR #2 n'est pas utilisée.
3. En développement sans base, conserver `.site-content.local.json`. En production sans `DATABASE_URL` ou `POSTGRES_URL`, afficher les JSON versionnés et refuser les écritures de l'admin.
4. Exécuter les migrations avant d'utiliser l'admin. `db:seed` importe une publication depuis l'ancien Blob privé si ses accès sont disponibles, sinon depuis `content/`. Le seed refuse de remplacer une publication déjà présente en base.
5. Sérialiser les écritures concurrentes sur la métadonnée du brouillon, y compris lors du premier enregistrement. La validation du schéma, des références et des suppressions reste côté serveur.

## Conséquences

- L'application Next.js lit les publications dans Postgres au rendu et invalide ses pages après publication. L'absence des tables lors d'un premier déploiement laisse les pages publiques sur les JSON de Git ; l'admin reste indisponible jusqu'à la migration.
- `@vercel/blob` reste uniquement pour importer une publication historique au moment du seed. Aucun Blob n'est requis pour les nouvelles écritures.
- L'équipe doit fournir une base et ses variables d'environnement dans Vercel. Le choix du plan, les coûts et les réglages du compte appartiennent au propriétaire.
- Les données publiées doivent être sauvegardées avant toute migration ou changement de stockage. Le retrait de `DATABASE_URL` désactive les écritures en production et fait revenir le site public aux JSON versionnés ; il ne supprime aucune donnée Postgres.
