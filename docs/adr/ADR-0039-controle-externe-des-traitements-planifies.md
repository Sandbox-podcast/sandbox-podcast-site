# ADR-0039 Contrôle externe des traitements planifiés

- Date : 2026-10-20.
- Statut : déployé en observation ; dispatchs désactivés en attente de livraison autorisée sur `main`.
- Choix du service gratuit : confirmé par Lou le 20 octobre.
- Conception : décidée par l'agent sur délégation (PD-0003).

## Constat

Les historiques News montrent cinq heures et cinquante-deux minutes entre deux runs créés, alors que les jobs commencent deux secondes après leur création et terminent en environ quatorze minutes. La découverte Charts du 20 octobre est créée quatre heures et quarante-deux minutes après son horaire prévu, puis commence en deux secondes. Les workflows sont actifs sur `main` et News est autorisé par sa variable de dépôt. Les faits et leurs liens sont dans [le diagnostic](../site/fiabilisation-planification-2026-10-20.md).

La reprise horaire d'ADR-0038 dépend du même événement GitHub `schedule` que la collecte manquée. Elle ne suffit pas quand GitHub retarde ou omet le contrôle lui-même. Le dernier état documenté de Vercel est Hobby, limité aux tâches quotidiennes. Lou demande une solution indépendante et choisit un service externe gratuit.

## Décision

Un Worker Cloudflare Free demande un contrôle toutes les cinq minutes. Un Durable Object SQLite sérialise les passages et conserve une réservation avant chaque dispatch GitHub. Les traitements CPU, modèles et écritures éditoriales restent dans GitHub Actions et les API existantes du site. Le Worker ne reçoit aucun accès à Postgres, au secret cron Vercel ou à une API de génération.

Le contrôleur compare les données publiques aux créneaux prévus, puis examine les runs du dépôt sur `main`. Il ne déclenche rien si un run est déjà actif. News reprend aussi un échec de traitement après une collecte récente ; sa seule date de collecte ne peut donc pas masquer cet échec. Charts relit GitHub, Skills et Models ; Rising absent ne déclenche pas de reprise. La découverte conserve un état de réussite quotidien séparé.

La reprise utilise les modes explicites `due`, `recover` et `discovery` des workflows. Les précontrôles GitHub relisent les données après acquisition du verrou partagé. Les lancements manuels complets restent disponibles avec `refresh`. Le jeton propre à GitHub Actions conserve des droits en lecture ; seul le jeton externe dédié possède Actions en lecture/écriture sur ce dépôt. Ce jeton fin a été créé pour quatre-vingt-dix jours, limité au seul dépôt concerné, puis stocké chiffré dans le secret Cloudflare `GITHUB_ACTIONS_TOKEN`. Il expire le 18 janvier 2027 ; aucune valeur n'est conservée dans Git.

Une cible possède au maximum trois tentatives par créneau. Une réservation et un délai de quinze ou trente minutes sont persistés avant le POST, y compris lorsqu'une interruption laisse son résultat incertain. Un échec reste visible pendant cette attente. Les erreurs d'une cible n'empêchent pas le contrôle des autres. Les redirections ne sont pas suivies, les destinations sont fixes et les sorties ne contiennent aucun secret.

La configuration locale démarre désactivée, avec `DRY_RUN=true`. Le déploiement distant du 20 octobre utilise `ENABLED=true` et `DRY_RUN=true` : il observe les données et les runs, sans dispatch ni réservation de tentative. Les dispatchs ne seront activés qu'après autorisation Git, livraison des nouveaux workflows sur `main` et autorisation de mise en service. Son URL publique ne permet pas de lancer un tick. L'état de santé distingue un contrôleur opérationnel d'une publication confirmée ; un dispatch accepté reste en attente. Le budget du plan gratuit ne déclenche aucune souscription payante automatique.

## Déploiement observé

Le Worker est déployé à [sandbox-automation-watchdog.sandbox-podcast-pro.workers.dev](https://sandbox-automation-watchdog.sandbox-podcast-pro.workers.dev), version `9783b910-61f5-4b09-a37a-f42fafc6d663`, avec le cron UTC `*/5 * * * *`. Le premier tick réel observé porte `checkedAt=2026-10-20T09:05:12.647Z` ; la santé renvoie HTTP 202, `schedulerOk=true` et `dataFresh=null`. Il confirme un premier contrôle distant, sans confirmer la fraîcheur des publications ni la régularité de la cadence.

## Vérification et limites

Les tests du noyau et des workflows couvrent les créneaux, erreurs, reprises, vérifications d'origine et de branche, pagination, doublons et délais. Le noyau et les précontrôles passent 67 tests (24 et 43), avec un test du mode simulation. La recette du runtime Cloudflare teste le vrai Worker avec SQLite, une horloge gelée, des passages concurrents et un redémarrage ; ses cinq groupes de contrôles passent et les services distants sont simulés. La CI inclut cette compilation et cette recette sans déploiement.

Les comptes, nouvelles permissions, secrets, commits, pushes et publications restent soumis aux autorisations du propriétaire. Le premier passage distant en observation ne valide pas encore le fonctionnement des dispatchs. Après leur activation autorisée, il faudra suivre plusieurs événements Cloudflare successifs, les runs GitHub associés, puis les données servies au public. Les pannes GitHub, réseau, sources et les expirations de jeton restent des causes possibles d'indisponibilité. Le contrôleur les expose sans inventer une date de mise à jour, modifier les seuils éditoriaux ou annuler un run actif. Aucun SLA n'est annoncé.

La procédure est dans [le guide du Worker](../../tools/automation-watchdog/README.md). Cette décision complète ADR-0038 et remplace la dépendance exclusive au planning GitHub envisagée dans ADR-0033.
