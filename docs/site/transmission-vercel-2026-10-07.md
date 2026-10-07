# Transmission au propriétaire Vercel — 7 octobre 2026

## État constaté

Le travail UI, performance et sécurité de cette session est dans `apps/site`. Lors du premier contrôle, aucun commit, push, changement de réglage Vercel ou déploiement n'avait été effectué. Cette transmission concerne la reprise du projet Vercel après la publication du code sur GitHub ; aucun réglage Vercel ni déploiement n'a été modifié durant ce travail.

- Compte cible : `sandboxpodcastpro-5518`, projet [`sandbox-podcast`](https://vercel.com/sandboxpodcastpro-5518/sandbox-podcast), relié à `www.sandboxpodcast.fr` et au dépôt [`Sandbox-podcast/sandbox-podcast-site`](https://github.com/Sandbox-podcast/sandbox-podcast-site).
- Production observée : déploiement prêt depuis `main`, commit `b6e6971` au moment de la consultation. Ce déploiement ne contient pas les changements locaux de cette session.
- Une [PR #2 ouverte](https://github.com/Sandbox-podcast/sandbox-podcast-site/pull/2) possède un aperçu Vercel prêt. Elle propose de remplacer la persistance Vercel Blob par Postgres/Neon. Le code local utilise toujours Blob : les deux versions doivent être réconciliées avant livraison.
- Dans les variables **du projet**, seules `SITE_URL` et `SITE_DATA_MODE` apparaissent pour la production. Aucune variable partagée n'est liée. La page Storage du projet indique qu'aucune base n'est connectée.
- Réglages de build observés : preset Next.js, Node 24, accès aux fichiers hors du dossier racine activé. Le champ « Root Directory » est vide ; vérifier que le prochain build cible bien `apps/site`.

## Pourquoi la synchronisation s'est arrêtée

Le connecteur Vercel accessible à l'agent est authentifié sur **`loucore-9279`**, l'ancien compte, et n'affiche pas le projet du compte cible. Le navigateur est connecté au bon compte. Au moment de ce constat, la copie locale n'avait ni Vercel CLI installée, ni liaison `.vercel`, ni remote Git, ni commit initial. Une publication directe risquerait de déployer la variante Blob alors que l'équipe travaille sur Neon.

## Reprise recommandée

1. **Choisir la base de code.** Examiner la PR #2 avec Loïc et décider si la persistance Neon remplace Blob. La branche GitHub issue du code local et la PR #2 doivent être rapprochées avant intégration sur `main`. Conserver l'historique des deux branches et éviter un push forcé.
2. **Vérifier le build Vercel.** Confirmer le dossier racine et la commande pnpm dans le projet `sandbox-podcast`. Le monorepo a son lockfile à la racine et l'application Next.js dans `apps/site`.
3. **Configurer le stockage et les secrets selon le code retenu.** Le code local attend `SITE_ADMIN_USERS`, `SITE_ADMIN_SECRET` et un Blob privé (`BLOB_STORE_ID` via l'intégration ou `BLOB_READ_WRITE_TOKEN`). La PR Neon attend une base et d'autres variables : suivre sa version revue après fusion, sans mélanger les deux configurations. Fournir `YOUTUBE_API_KEY` côté serveur pour l'import vidéo complet. Aucun secret ne doit être copié dans Git.
4. **Garder les données simulées hors index.** Conserver `SITE_DATA_MODE=mock` jusqu'au remplacement des épisodes et snapshots de démonstration par des contenus et mesures vérifiés.
5. **Déployer d'abord un aperçu**, vérifier l'accueil, la bibliothèque, un épisode, un classement, `/admin`, les images et les en-têtes de sécurité. Exécuter `pnpm check` et un build dans la base finale avant la mise en production, puis seulement intégrer sur `main`.

## Changements locaux à reprendre

- `src/app/globals.css` : navigation mobile simplifiée, zone tactile, tablette plus compacte, contraste renforcé.
- `src/app/page.tsx` et `src/components/client.tsx` : limite des cartes dupliquées sur l'accueil et optimisation du chargement de la miniature du lecteur.
- `src/components/admin-console.tsx` : retrait du code de publication d'articles devenu inaccessible et validation des réponses d'API.
- `src/domain/markup.ts` : rejet des chemins ambigus avec antislash ou caractère de contrôle.
- `src/lib/admin-auth.ts` et `src/app/api/admin/login/route.ts` : comparaison de mot de passe à temps plus uniforme, mémoire du limiteur bornée, taille du corps de connexion limitée.
- `next.config.ts` : politique CSP limitée aux origines utilisées en production et absence de cache pour `/admin` et ses API.

Vérifications locales effectuées : Prettier, ESLint et contrôle TypeScript réussis ; contrôle visuel sur mobile (390 px), tablette (820 px) et desktop (1 440 px). Les suites de tests et le build de production n'ont pas été exécutés pendant cette session. La CSP conserve `unsafe-inline` pour les scripts d'hydratation statiques de Next.js ; un passage à des nonces imposerait le rendu dynamique. La limitation des connexions reste locale à chaque instance : une règle distribuée côté Vercel reste à prévoir avant une exposition importante de l'admin.
