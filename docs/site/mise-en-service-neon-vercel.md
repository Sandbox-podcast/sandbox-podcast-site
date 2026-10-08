# Mise en service SANDBOX CHARTS sur Neon et Vercel

Cette fiche est à transmettre au propriétaire du compte Neon et au responsable du projet Vercel. Elle décrit l'activation de la collecte GitHub sur la base existante du site. Elle ne contient aucun secret.

## Situation vérifiée

Le code des classements, des traductions et ses migrations additives sont dans `apps/site`. Les migrations 0002 à 0004 ont été exécutées dans PGlite de test, pas dans Neon.

La note de transfert du 7 octobre dans `transmission-vercel-2026-10-07.md` nomme le projet `sandboxpodcastpro-5518/sandbox-podcast`, le domaine `www.sandboxpodcast.fr` et le Root Directory `apps/site`. Elle indique que l'intégration Neon fournissait `DATABASE_URL` et `POSTGRES_URL` à Production et Preview, ainsi que les secrets d'administration aux deux environnements. Ces réglages viennent de cette note antérieure et restent à confirmer dans le tableau de bord.

Le preview Vercel de la PR de passation a réussi le 8 octobre 2026 sur `sandboxpodcastpro-5518/sandbox-podcast`, ce qui confirme la construction de cette branche dans ce projet. Une session Vercel distincte peut lister `sandbox-podcast-site`, mais ses requêtes détaillées répondent 403 ; ne pas confondre les deux projets. Le domaine de production `www.sandboxpodcast.fr`, la branche, le Root Directory et les variables doivent encore être confirmés par le responsable du projet. La branche `codex/remaining-seo-charts-handoff` n'est pas en production avant fusion et déploiement.

Dans le contrôle local, `DATABASE_URL`, `GITHUB_TOKEN` et `CRON_SECRET` étaient absents. Aucun secret Neon n'a été fourni dans le dépôt.

## À faire par le propriétaire Neon

1. Repérer le projet, la branche et la base Neon réellement reliés à `sandboxpodcastpro-5518/sandbox-podcast`. Ne pas créer une seconde base de production si la base actuelle peut servir.
2. Vérifier dans Vercel la provenance des variables `DATABASE_URL` et `POSTGRES_URL` déjà signalées dans la note du 7 octobre. Le code utilise `DATABASE_URL` en priorité. Si les deux existent, elles doivent pointer vers la même base et branche Neon.
3. Confirmer que la base contient déjà le schéma éditorial du site et ses migrations Drizzle 0000 et 0001. Si l'historique des migrations ou les tables ne correspondent pas, arrêter et faire vérifier la situation par le responsable du site avant d'appliquer les nouvelles migrations.
4. Créer un snapshot ou une branche de restauration Neon avant la migration.
5. Fournir au responsable Vercel ou du déploiement l'URL de connexion Postgres correspondant à cette base, par le gestionnaire de secrets convenu. Garder la valeur hors de ce fichier, des tickets et des messages ordinaires. Préférer l'URL Neon avec pooler et TLS si le projet l'utilise déjà.
6. Confirmer que le rôle de connexion peut lire et écrire les données applicatives et que le rôle utilisé pour la migration peut créer les nouvelles tables, index et déclencheurs dans le schéma applicatif.

Ne pas coller les migrations SQL directement dans l'éditeur Neon. La commande ci-dessous applique les migrations depuis le journal Drizzle. Si l'historique du journal ne reflète pas le schéma réel, ne pas contourner ce contrôle avec une exécution SQL manuelle.

## À faire par le responsable du dépôt

1. Vérifier et relire les changements dans le dépôt, puis les committer et les pousser dans la branche de travail convenue. Aucune modification ne peut apparaître dans le projet Vercel à partir du seul dossier local.
2. Dans le projet Vercel confirmé par le responsable, vérifier le dépôt Git lié, la branche de production et la configuration du monorepo. La note antérieure indique que le Root Directory est `apps/site`. Garder le réglage existant s'il produit déjà le build Next.js attendu avec la lockfile pnpm de la racine. Vérifier que la version Node du projet est 24.x.
3. Après avoir reçu l'URL Neon, vérifier la variable existante `DATABASE_URL` ou `POSTGRES_URL`. Ne pas remplacer une variable Neon déjà fonctionnelle sans vérifier la branche et la base cibles. L'application utilise `DATABASE_URL` en priorité. Ne jamais placer la valeur dans le code ni dans une variable `NEXT_PUBLIC_*`.
4. Appliquer les migrations 0002 (collecte GitHub), 0003 (catalogue et textes localisés des classements) et 0004 (pages, épisodes, thèmes et fiches localisés) avant le déploiement de production. Utiliser le commit relu et le rôle de migration autorisé. Si cette personne exécute la commande depuis une copie sécurisée du dépôt, stocker l'URL dans `apps/site/.env.local`, ignoré par Git, puis lancer depuis `apps/site` :

   ```powershell
   node --env-file-if-exists=.env.local scripts/db-migrate.ts
   ```

   La commande Node exige Node 24. Elle utilise `DATABASE_URL` ou `POSTGRES_URL` dans l'environnement de processus. Ne jamais committer `.env.local` ni en transmettre une copie.

## Variables du projet Vercel

Dans le projet vérifié, garder la connexion Neon existante si elle pointe vers la bonne base. Limiter les nouveaux secrets d'exécution à Production au départ. La note antérieure indique que Preview partageait aussi une base Neon : vérifier ce point avant tout test qui écrit. Utiliser une branche Neon séparée pour Preview ou garder Preview sans connexion aux données de production.

Selon la note de transfert du 7 octobre, les deux variables `DATABASE_URL` et `POSTGRES_URL` étaient déjà fournies par l'intégration Neon en Production et Preview. Vérifier qu'elles désignent la même base et branche. L'application choisit `DATABASE_URL` si les deux sont présentes.

| Variable       | Valeur attendue                                                          | Règle                                                                                                    |
| -------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | Connexion Neon à la base Sandbox existante                               | Secret serveur. Confirmer avant de remplacer une variable déjà présente.                                 |
| `GITHUB_TOKEN` | Jeton GitHub autorisé à lire les dépôts publics utilisés par la collecte | Lecture seule. Ne pas lui accorder de droits d'écriture.                                                 |
| `CRON_SECRET`  | Secret aléatoire d'au moins 16 caractères                                | Générer dans un gestionnaire de secrets et le configurer dans Production. Ne pas le réutiliser ailleurs. |

Conserver `SITE_ADMIN_SECRET`, `SITE_ADMIN_USERS` et les autres variables du site déjà configurées. Ne pas remplacer la politique actuelle `SITE_DATA_MODE` pour activer les classements : les autres contenus du site ont leur propre état de validation. `CHARTS_NEWSLETTER_URL` est facultative et ne doit pointer que vers un formulaire HTTPS existant.

## Déploiement et collecte

1. Déployer d'abord le commit relu en Preview. Vérifier que les pages s'affichent sans fixtures, que les éditions manquantes indiquent l'état d'attente et que les routes admin et cron refusent une requête anonyme.
2. Après validation de Preview et application de 0002 à 0004, lancer le déploiement de la branche de production depuis le flux Vercel habituel. Vérifier que le plan autorise la durée de fonction `maxDuration: 300` définie pour les tâches de collecte.
3. Contrôler les trois tâches déclarées dans `apps/site/vercel.json` : découverte GitHub tous les jours à 01:00 UTC, relevés quotidiens à 02:00 UTC et édition hebdomadaire le lundi à 03:00 UTC. Vercel doit envoyer le secret Cron dans `Authorization: Bearer ...`.
4. Depuis une copie locale sécurisée du commit relu, avec Node 24, pnpm 12 et les secrets nécessaires dans `apps/site/.env.local`, afficher d'abord le résultat de la simulation sans écriture :

   ```powershell
   corepack pnpm --filter @podcast/site charts:seed -- --dry-run
   ```

   Après contrôle, importer les candidats existants, sans créer de métriques :

   ```powershell
   corepack pnpm --filter @podcast/site charts:seed
   ```

5. Dans `/admin`, examiner les candidats et ne suivre que les dépôts retenus. Les mesures quotidiennes démarrent à partir de cette activation. Ne pas fabriquer les jours manquants ni simuler un historique.
6. Vérifier les collectes et leurs journaux dans l'admin. L'édition GitHub attend au moins sept jours de relevés et le seuil de projets éligibles configuré, vingt par défaut. Rising demande aussi quatorze jours d'historique et une accélération positive. Une page en attente jusque-là est attendue.
7. Une fois les conditions remplies, vérifier une simulation hebdomadaire et les sources des mesures avant de valider la première édition. Les prochains gels hebdomadaires suivent ensuite le cron du lundi.

## Contrôles de fin

- L'URL de la base correspond bien au projet Neon de production voulu.
- Les migrations Drizzle 0000 à 0004 apparaissent une seule fois dans l'historique.
- Le tableau de bord `/admin` montre les rôles et états de collecte attendus.
- `GET /api/charts/github/current` et `GET /api/charts/rising/current` retournent une attente sans lignes, puis les positions publiées après la première édition.
- Une édition hebdomadaire inconnue et un projet inconnu retournent 404.
- Sans session, l'admin retourne 401. Sans secret valide, les routes cron retournent 401.
- Aucune fixture du site local n'apparaît dans les pages de production.

Si un contrôle échoue, suspendre la mise en production, conserver les relevés existants et faire examiner les journaux. Ne pas supprimer une migration ni modifier une édition figée.
