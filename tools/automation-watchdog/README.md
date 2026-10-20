# Contrôle externe de la cadence

Ce Worker Cloudflare vérifie News et Charts toutes les cinq minutes, indépendamment du planificateur GitHub. Les traitements Qwen, Argos et les collecteurs restent dans les workflows existants. Lou a choisi un service externe gratuit le 20 octobre 2026. Le code ne souscrit aucune offre payante.

Le compte cible est celui renseigné dans `wrangler.jsonc`. La configuration locale reste désactivée par défaut (`ENABLED=false`, `DRY_RUN=true`). L'URL publique expose uniquement `GET /health` ; un appel public ne peut pas déclencher les traitements. Le Durable Object SQLite sérialise les passages et conserve les réservations avant les appels GitHub. Trois tentatives au maximum sont permises par cycle, avec une attente de quinze minutes pour News et trente minutes pour Charts et la découverte. Un résultat réseau ambigu conserve cette attente.

## État déployé au 20 octobre 2026

Le Worker est déployé à [sandbox-automation-watchdog.sandbox-podcast-pro.workers.dev](https://sandbox-automation-watchdog.sandbox-podcast-pro.workers.dev), version `ec966bd7-56b2-4ea3-a6da-052165f5c772`. Après fusion de la PR 99, CI main verte et déploiement confirmé, le cron toutes les cinq minutes est activé avec ENABLED=true et DRY_RUN=false à 10:28 UTC.

Le premier passage planifié observé porte `checkedAt=2026-10-20T09:05:12.647Z`. La santé renvoie HTTP 202, `schedulerOk=true` et `dataFresh=null`. Ce résultat confirme un premier contrôle distant ; il ne confirme ni la fraîcheur des données ni une cadence durable.

Un jeton GitHub fin de quatre-vingt-dix jours a été créé pour le seul dépôt `Sandbox-podcast/sandbox-podcast-site`, avec Actions en lecture/écriture. Il est stocké chiffré dans le secret Cloudflare `GITHUB_ACTIONS_TOKEN` et expire le **18 janvier 2027**. Sa valeur n'est pas nécessaire aux vérifications documentaires et ne doit jamais être affichée.

Les nouveaux modes sont livrés sur main dans le commit 1f4ead0. Trois contrôles actifs à 10:30, 10:35 et 10:40 UTC sont constatés ; le premier déclenche News et la découverte Charts. News collecte et publie ensuite. La découverte expose encore deux défauts métier relevés après livraison ; leur correction locale et les preuves sont décrites dans [la recette de production](../../docs/site/verification-production-2026-10-20.md). Un dispatch réussi ne prouve pas à lui seul la fin du travail.

## Vérifier localement

Depuis la racine du dépôt, avec Node 24 :

```powershell
npm install --prefix apps/site/.local/watchdog-tools --no-audit --no-fund --package-lock=false wrangler@4.151.2
node apps/site/scripts/build-automation-watchdog-worker.mjs
node --experimental-strip-types apps/site/scripts/test-automation-watchdog-worker.mjs
pnpm check
```

La compilation est un `deploy --dry-run` : elle n'envoie rien à Cloudflare. Ce drapeau Wrangler est distinct de la variable d'exécution `DRY_RUN`. La recette utilise le moteur officiel `workerd` via Miniflare. Les services GitHub et le site sont simulés. Une horloge de test impose un créneau dû ; les assertions exigent un dispatch, puis vérifient son absence de doublon lors des appels simultanés et après redémarrage du stockage SQLite. Les cinq groupes de cette recette passent. Le noyau et les précontrôles totalisent aussi 67 tests réussis (24 watchdog, dont le mode simulation, et 43 précontrôles). Les fichiers temporaires restent dans les dossiers locaux ignorés par Git. La CI exécute ces mêmes contrôles.

## Activer après livraison autorisée

1. Livrer les modifications de workflows et leurs imports sur `main`, après les contrôles du dépôt. `news-refresh.yml` doit accepter `mode=due` ; `charts-refresh.yml` doit accepter `mode=recover` et `mode=discovery`. Vérifier la CI du commit livré. Une branche locale seule ne met pas ces modes à disposition de GitHub.
2. Vérifier le compte Sandbox et conserver le plan Workers Free. L'outil officiel Wrangler est déjà autorisé et le secret dédié est configuré. Ne pas activer une offre payante pour résoudre une erreur de configuration.
3. Après autorisation de mise en service des dispatchs, déployer avec `ENABLED=true` et `DRY_RUN=false`. Passer les deux variables explicitement : la configuration locale conserve des valeurs prudentes.

```powershell
# Maintenir ou rétablir l'observation sans dispatch.
node apps/site/.local/watchdog-tools/node_modules/wrangler/bin/wrangler.js deploy --config tools/automation-watchdog/wrangler.jsonc --var ENABLED:true --var DRY_RUN:true
# Activer les dispatchs seulement après autorisation et livraison sur main.
node apps/site/.local/watchdog-tools/node_modules/wrangler/bin/wrangler.js deploy --config tools/automation-watchdog/wrangler.jsonc --var ENABLED:true --var DRY_RUN:false
```

Ces commandes publient le Worker ; elles ne font pas partie des tests locaux et ne sont pas exécutées par la présente mise à jour documentaire. Une authentification ou une publication refusée exige de résoudre le blocage avec Lou avant de poursuivre. Le secret cron de Vercel et les accès Postgres ne sont pas nécessaires au Worker. Son jeton GitHub n'est envoyé qu'à `api.github.com`, jamais au site, aux redirections ou aux sources d'actualité.

## Vérifier le résultat distant

Attendre la propagation du cron, puis contrôler au moins deux événements réellement planifiés. Lire les logs Cloudflare, les runs GitHub sur `main` et les données publiques. Un accusé de réception du dispatch ne constitue pas une publication réussie. Les verrous et précontrôles dans GitHub relisent les données avant de démarrer un travail, même lorsqu'un ancien événement GitHub arrive après le rattrapage.

`GET /health` renvoie :

- HTTP 200 quand le contrôle récent confirme les trois cibles à jour ;
- HTTP 202 quand le contrôleur fonctionne mais qu'un traitement ou une confirmation reste en attente ;
- HTTP 503 si le service est désactivé, si son dernier contrôle dépasse quinze minutes, si le jeton manque, si une inspection échoue ou si les reprises sont épuisées.

Les champs `schedulerOk` et `dataFresh` séparent le fonctionnement du contrôleur de la publication réellement confirmée. Avant l'horaire d'une cible, sa fraîcheur n'est pas déclarée démontrée. Les horloges sont en UTC. News reste prévu chaque heure à la minute 37, les éditions Charts après 03:17 et 15:17, et la découverte après 01:17.

Le Worker signale un run News actif depuis plus d'une heure ou Charts depuis plus de quarante-cinq minutes, sans l'annuler et sans empiler des remplaçants. Une panne de GitHub, du site ou des sources peut donc encore empêcher une publication ; elle reste visible. Rising conserve ses critères de données et ne provoque pas de reprise à lui seul.

## Exploitation

Renouveler le jeton avant le 18 janvier 2027. La saisie d'un remplacement se fait dans l'invite de `wrangler secret put GITHUB_ACTIONS_TOKEN --config tools/automation-watchdog/wrangler.jsonc` ou dans Cloudflare, jamais dans la ligne de commande ou Git. Un HTTP 401/403 produit un état d'erreur et conserve son délai de reprise. L'historique détaillé est dans les logs Cloudflare et GitHub ; l'état SQLite reste borné à trois cibles et au dernier bilan. Ne pas détruire le Durable Object pour résoudre une panne, car il contient les réservations.

Pour suspendre les déclenchements en conservant l'observation, remettre `DRY_RUN=true`. Pour arrêter aussi les inspections, déployer avec `--var ENABLED:false --var DRY_RUN:true` ; la prochaine vérification n'appelle plus GitHub ni le site. Le secret peut être révoqué séparément. La suppression des données persistantes exige l'accord de Lou. Aucun SLA ni garantie de livraison exactement une fois n'est annoncé ; les limites et la recette distante figurent dans [le rapport de diagnostic](../../docs/site/fiabilisation-planification-2026-10-20.md).
