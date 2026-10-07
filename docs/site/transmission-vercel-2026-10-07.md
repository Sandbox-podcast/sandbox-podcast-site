# Transmission au propriétaire Vercel — 7 octobre 2026

## État constaté

Le travail UI, performance et sécurité de cette session est dans `apps/site`. Lors du premier contrôle, aucun commit, push, changement de réglage Vercel ou déploiement n'avait été effectué. Cette transmission concerne la reprise du projet Vercel après la publication du code sur GitHub ; aucun réglage Vercel ni déploiement n'a été modifié durant ce travail.

- Compte cible : `sandboxpodcastpro-5518`, projet [`sandbox-podcast`](https://vercel.com/sandboxpodcastpro-5518/sandbox-podcast), relié à `www.sandboxpodcast.fr` et au dépôt [`Sandbox-podcast/sandbox-podcast-site`](https://github.com/Sandbox-podcast/sandbox-podcast-site).
- Production observée : déploiement prêt depuis `main`, commit `b6e6971` au moment de la consultation. Ce déploiement ne contient pas les changements locaux de cette session.
- Code publié sur GitHub dans la branche [`codex/site-sync-2026-10-07`](https://github.com/Sandbox-podcast/sandbox-podcast-site/tree/codex/site-sync-2026-10-07), issue de `b6e6971`. Le code de conduite ajouté par ce commit est conservé à l'identique. La branche `main` n'a pas été modifiée.
- La [PR #2 ouverte](https://github.com/Sandbox-podcast/sandbox-podcast-site/pull/2) apporte Postgres/Neon. Son code de persistance est maintenant porté dans `apps/site` sur la [PR #3](https://github.com/Sandbox-podcast/sandbox-podcast-site/pull/3), avec les trois comptes nominatifs conservés. La PR #2 reste inchangée ; ne pas fusionner les deux branches séparément sans revoir le résultat.
- Dans les variables **du projet**, seules `SITE_URL` et `SITE_DATA_MODE` apparaissent pour la production. Aucune variable partagée n'est liée. La page Storage du projet indique qu'aucune base n'est connectée.
- Réglages de build observés : preset Next.js, Node 24, accès aux fichiers hors du dossier racine activé. Le champ « Root Directory » est vide ; l'aperçu de la PR #3 échoue à détecter Next.js. Définir `apps/site` comme dossier racine.

## Pourquoi la synchronisation s'est arrêtée

Le code est poussé sur GitHub, mais aucun réglage du projet Vercel n'a été modifié. L'aperçu de la PR #3 échoue avec le dossier racine actuel. Le propriétaire du compte prendra en charge la configuration de `apps/site`, de Neon et des secrets.

## Reprise recommandée

1. **Revoir le chemin de fusion.** La PR #3 reprend la persistance de la PR #2 dans la nouvelle arborescence. Comparer les deux avant de fusionner et éviter de réintroduire l'ancienne application à la racine. Conserver l'historique des deux branches et éviter un push forcé.
2. **Corriger le build Vercel.** Définir `apps/site` comme Root Directory dans le projet `sandbox-podcast`, puis relancer un aperçu. Le lockfile du monorepo reste à la racine.
3. **Configurer Neon et les secrets.** Le code intégré attend `DATABASE_URL` ou `POSTGRES_URL`, `SITE_ADMIN_USERS` et `SITE_ADMIN_SECRET`. La variable `SITE_ADMIN_PASSWORD` citée dans la PR #2 n'est pas utilisée avec les trois comptes nominatifs. Exécuter `pnpm --filter @podcast/site db:migrate` avant d'utiliser l'admin. Après sauvegarde de l'ancienne publication, `pnpm --filter @podcast/site db:seed` peut importer le Blob historique s'il est accessible, sinon `content/` ; il refuse d'écraser une publication Postgres existante. Fournir `YOUTUBE_API_KEY` côté serveur pour l'import vidéo complet. Aucun secret ne doit être copié dans Git.
4. **Garder les données simulées hors index.** Conserver `SITE_DATA_MODE=mock` jusqu'au remplacement des épisodes et snapshots de démonstration par des contenus et mesures vérifiés.
5. **Déployer d'abord un aperçu**, vérifier l'accueil, la bibliothèque, un épisode, un classement, `/admin`, les images et les en-têtes de sécurité. Exécuter `pnpm check` et un build dans la base finale avant la mise en production, puis seulement intégrer sur `main`.

## Changements locaux à reprendre

- `src/app/globals.css` : navigation mobile simplifiée, zone tactile, tablette plus compacte, contraste renforcé.
- `src/app/page.tsx` et `src/components/client.tsx` : limite des cartes dupliquées sur l'accueil et optimisation du chargement de la miniature du lecteur.
- `src/components/admin-console.tsx` : retrait du code de publication d'articles devenu inaccessible et validation des réponses d'API.
- `src/domain/markup.ts` : rejet des chemins ambigus avec antislash ou caractère de contrôle.
- `src/lib/admin-auth.ts` et `src/app/api/admin/login/route.ts` : comparaison de mot de passe à temps plus uniforme, mémoire du limiteur bornée, taille du corps de connexion limitée.
- `next.config.ts` : politique CSP limitée aux origines utilisées en production et absence de cache pour `/admin` et ses API.

Vérifications de l'itération UI initiale : Prettier, ESLint, contrôle TypeScript et build de production réussis ; contrôle visuel sur mobile (390 px), tablette (820 px) et desktop (1 440 px). Vérifier séparément les contrôles du nouveau commit Postgres sur la PR #3 avant fusion. La CSP conserve `unsafe-inline` pour les scripts d'hydratation statiques de Next.js ; un passage à des nonces imposerait le rendu dynamique. La limitation des connexions reste locale à chaque instance : une règle distribuée côté Vercel reste à prévoir avant une exposition importante de l'admin.
