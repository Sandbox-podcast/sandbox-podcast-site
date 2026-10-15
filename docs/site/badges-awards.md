# Sandbox Badges & Awards

Implémentation dans `apps/site`. Décision et audit : [ADR-0031](../adr/ADR-0031-badges-et-awards-sandbox.md).

## Parcours public

Depuis les détails d'un dépôt éligible dans `/charts/github`, le lien "Obtenir mon badge" ouvre sa fiche à la section des distinctions. Le générateur présente le SVG public sur fond clair ou sombre, puis le Markdown, le HTML et l'URL directe. La copie donne une confirmation accessible ; si le presse-papiers est bloqué, le texte reste sélectionnable. Le visiteur peut également copier un texte de partage pour un Award.

`/charts/awards` présente les critères, l'installation, les attributions et leurs éventuels retraits. Les pages utilisent le système de traductions locales français, anglais, espagnol et allemand. La relecture native des traductions espagnoles et allemandes reste nécessaire, comme pour le reste du site.

Les six extensions sont incluses à la demande de Lou. Le développement reste local jusqu'à sa vérification. L'[issue #63](https://github.com/Sandbox-podcast/sandbox-podcast-site/issues/63) explique le concept et montre les huit familles de badges. Ses images sont des exemples conceptuels, sans attribution réelle.

## Les six extensions

`domain/awards.ts` définit les sept Awards, leurs périodes et leurs règles pures. `lib/awards-store.ts` valide les éditions, attribue une fois et fournit les lectures publiques. Chaque source doit être une édition officielle `auto`, publiée un dimanche, avec la méthode corroborée de son classement et des positions concordantes.

| Type CLI          | Attribution                                                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `github-category` | Premier rang GitHub de chaque catégorie présente le dimanche.                                                                                             |
| `biggest-mover`   | Plus grand gain positif de rang entre deux dimanches consécutifs. Nouveaux entrants exclus ; égalité au meilleur rang final, puis à l'identifiant stable. |
| `rookie-month`    | Plus de premières places Rising sur tous les dimanches du mois civil.                                                                                     |
| `skill-week`      | Première skill de l'édition du dimanche corroborée par skills.sh et GitHub.                                                                               |
| `best-model`      | Premier modèle de l'édition du dimanche corroborée par Arena et Artificial Analysis.                                                                      |
| `annual`          | Un lauréat par classement GitHub, Rising, Skills et Models, au nombre de premières places sur tous les dimanches de l'année ISO.                          |

Les périodes attendent leur clôture dans Europe/Paris. Un mois ou une année incomplets ne donnent aucun prix. Les égalités des agrégations se départagent au rang du dernier dimanche, puis à l'identifiant stable. L'absence au dernier dimanche passe après les candidats présents. Les périodes annuelles suivent l'année ISO : 2026 couvre 53 dimanches et se termine le 3 janvier 2027. Un retrait exclut sa source des nouvelles attributions ; il ne réécrit pas les anciens prix.

L'historique commun filtre par type, classement et période (`?type=annual&period=2025`, par exemple). Une page affiche 20 attributions et un curseur UUID, y compris lorsque plusieurs prix ont le même horodatage. Les Skills et modèles ont une fiche publiée `/charts/entity/:slug`, avec leurs distinctions et apparitions. Le lien discret du classement repose sur une lecture groupée des attributions.

## Source et règles

`domain/badges.ts` contient les définitions, l'éligibilité, les bornes ISO Europe/Paris, la règle hebdomadaire et les deux gabarits SVG. `lib/badges-store.ts` lit Postgres et conserve les attributions. Les scores GitHub et Rising ne sont jamais recalculés par les endpoints.

Top 100 utilise le dernier payload officiel GitHub publié, avec provenance `auto`. Il affiche exactement le rang entre 1 et 100. Le classement actuel publie seulement 20 positions : seuls ces projets sont disponibles. Étendre le classement à 100 demanderait une évolution distincte du moteur et de ses garanties de corroboration.

Un dépôt absent, archivé, désactivé, exclu du suivi, inactif ou signalé en erreur ne porte pas de badge actif. Un relevé futur ou vieux de 48 heures est refusé. Les données manquantes, corrompues ou simulées donnent un état neutre. Le retour dans une édition valide réactive automatiquement la même URL.

Rising Star utilise `rising-sunday-v1` :

1. Attendre le lundi, selon Europe/Paris, et une édition Rising quotidienne publiée correspondant au dimanche précédent.
2. Exiger la méthode `rising-cross-source-v2`, un snapshot `auto`, des identités GitHub uniques et des positions concordant avec le payload.
3. Retenir le rang 1 déjà départagé par le moteur (score, stars gagnées, slug). Vérifier sa preuve J-7/J-14, son accélération positive et la date admissible OpenSSF.
4. Enregistrer l'attribution une fois. Sans dimanche valide ou sans preuve, ne rien attribuer. Une édition historique en `AAAA-Wnn` ne remplace pas la source quotidienne attendue.

La preuve conserve le snapshot, les mesures du gagnant, la configuration et la version de scoring. Son empreinte SHA-256 utilise un JSON canonique aux clés triées, reproductible après lecture JSONB. Elle sert au diagnostic ; l'immuabilité SQL et les références assurent la conservation. Un prix ne prouve ni la qualité du code ni sa sécurité.

## Routes et snippets

| Ressource                           | Route                                                |
| ----------------------------------- | ---------------------------------------------------- |
| Fiche et générateur                 | `/charts/project/:slug#badges`                       |
| Critères, installation et lauréats  | `/charts/awards`                                     |
| Rang dynamique                      | `/badges/github/:githubId/rank.svg`                  |
| Award historique                    | `/badges/github/:githubId/rising-star/:AAAA-Wnn.svg` |
| Page Rising et partage              | `/charts/awards/:AAAA-Wnn`                           |
| Carte Rising PNG                    | `/api/awards/:AAAA-Wnn/image`                        |
| Nouvelle attribution                | `/charts/awards/edition/:uuid`                       |
| SVG d'une nouvelle attribution      | `/badges/awards/:uuid.svg`                           |
| Carte de partage PNG                | `/api/awards/edition/:uuid/image`                    |
| Fiche Skill ou modèle et générateur | `/charts/entity/:slug#badges`                        |

L'identifiant numérique GitHub et le slug Sandbox restent stables lors d'un renommage ou d'un transfert. La collecte existante met à jour le nom et l'URL GitHub. Les anciennes URL numériques continuent donc à fonctionner. Aucun endpoint n'accepte une URL de fournisseur ou un nom de fichier à charger.

Le générateur construit les URL absolues depuis `siteConfig.url`, lui-même fondé sur `SITE_URL` et la convention canonique existante. Il ne déduit jamais le domaine d'un en-tête Host non vérifié.

```ts
badgeSnippets(siteConfig.url, {
  githubId: project.githubId,
  slug: project.slug,
  name: project.name,
});
```

Le résultat Markdown est `[![texte alternatif](URL_SVG)](URL_FICHE)`. Le HTML est un lien contenant une image avec valeurs échappées. Les valeurs réelles sont fournies sur la fiche ; aucun exemple de la documentation ne prétend attribuer un rang à un projet réel. Le texte alternatif d'un badge dynamique ne fige aucun numéro de rang.

Le lien de retour porte `utm_source=sandbox_badge`, `utm_medium=badge` et une campagne parmi `github_top_100`, `rising_star`, `github_category`, `biggest_mover`, `rookie_month`, `skill_week`, `best_model`, `annual`. Les nouvelles récompenses utilisent l'ancre `award-:uuid` ; les anciennes ancres Rising restent valides. Les URL canoniques restent sans ces paramètres. Le partage fournit un texte, un lien permanent et une image PNG 1200 par 630, téléchargeable.

## HTTP, performance et sécurité

- SVG autonome de moins de 3 Ko dans les tests, sans téléchargement de police, script ou appel fournisseur.
- Rang : cache navigateur/CDN jusqu'à 300 secondes, réduit lorsque l'échéance des 48 heures approche. État ancien : 60 secondes.
- Award actif : 86 400 secondes. Award absent : 404 et 60 secondes. Award retiré : 410 et 60 secondes. Paramètres invalides : 400. Données indisponibles : 503 et `no-store`.
- ETag SHA-256, réponse 304 et HEAD. `image/svg+xml`, `nosniff`, CSP restrictive, `no-referrer`, `noindex`, aucun cookie de session.
- Paramètres bornés et validés avec Zod, requêtes Drizzle paramétrées, texte XML et HTML échappé. Aucun fetch externe ou accès arbitraire au disque dans le rendu.
- Un accès indexé au dépôt puis la dernière édition GitHub ; une requête indexée pour l'Award. Le CDN absorbe les lectures répétées. Aucune lecture supplémentaire par carte du classement. Les journaux publics ne contiennent que le type d'erreur.

Les caches GitHub et autres proxys peuvent dépasser le TTL demandé par Sandbox. Le rang et la date sur la fiche restent consultables. Le contrôle d'un trafic distribué et hostile dépend aussi des limites et protections du déploiement ; aucun service de protection payant n'est créé.

## Exploitation

Réutiliser `DATABASE_URL` ou `POSTGRES_URL`, `SITE_URL`, `CRON_SECRET` et les accès du pipeline existant. Aucun secret nouveau. Appliquer `0012_badges_awards`, puis `0013_extended_awards`, après les migrations déjà prévues, sur l'environnement autorisé, avec sauvegarde et procédure habituelle. Cette tâche n'applique aucune migration distante.

Le cron existant `/api/cron/github-weekly` tourne chaque jour à 03:00 UTC. Après les gels, il lance `badge_awards` pour les sept Awards. La base impose l'unicité du type, de la période et de la catégorie, même en concurrence. Le bail de job existant évite les exécutions ordinaires en double. Rising conserve sa reprise historique sur les 400 dernières éditions. Les extensions examinent 54 semaines et au plus 240 éditions du dimanche ; une période explicite charge son historique complet, avec le dimanche précédent pour Biggest Mover.

Depuis la racine du dépôt :

```powershell
pnpm --filter @podcast/site badges:awards -- --dry-run
pnpm --filter @podcast/site badges:awards -- --dry-run --week=2026-W41
pnpm --filter @podcast/site badges:awards -- --dry-run --type=github-category --period=2026-W41 --scope=coding
pnpm --filter @podcast/site badges:awards -- --dry-run --type=rookie-month --period=2026-09
pnpm --filter @podcast/site badges:awards -- --dry-run --type=annual --period=2025 --scope=models
pnpm --filter @podcast/site badges:awards -- --help
```

Après vérification et autorisation de publier les attributions sur l'environnement choisi :

```powershell
pnpm --filter @podcast/site badges:awards
pnpm --filter @podcast/site badges:awards -- --week=2026-W41
```

Le job écrit dans `charts_job_runs` : dimanches examinés, attributions créées, déjà existantes et erreurs. L'absence de données donne `insufficient_history`. Le CLI non simulé demande une base avec la migration ; aucun accès public n'attribue de prix.

Un retrait exige une intervention explicite de l'opérateur autorisé :

```powershell
pnpm --filter @podcast/site badges:awards -- --withdraw --week=2026-W41 --reason="Erreur de source confirmée et documentée." --actor="operateur-autorise"
pnpm --filter @podcast/site badges:awards -- --withdraw --id=UUID_ATTRIBUTION --reason="Erreur de source confirmée et documentée." --actor="operateur-autorise"
```

Le motif est public. Une seconde demande n'écrase pas le premier retrait. L'original et sa preuve restent conservés, et le badge devient neutre au plus tard après expiration du cache Sandbox de 24 heures. La correction n'attribue pas silencieusement le prix à un autre projet.

Le CLI refuse les options inconnues, répétées et les semaines ISO invalides avant tout accès à la base. `--withdraw --dry-run` est refusé sans action ; la simulation concerne uniquement les attributions. L'aide fonctionne sans connexion Postgres. Une configuration absente produit un message explicite, sans afficher de secret.

## Mesure

`badge_generator_open`, `badge_preview`, `badge_copy`, `badge_share` et `badge_visit` utilisent le Google Tag déjà installé, uniquement après consentement. Seuls le type de badge et le format sont transmis. La visite reconnaît uniquement les huit campagnes prévues, sur une fiche de projet, de skill ou de modèle. Le reste des paramètres reste exclu de la mesure de page existante. Les requêtes SVG ne sont pas comptées comme des visites. Une copie n'est pas une installation.

## Vérification locale

Pour parcourir les huit familles sans connexion distante :

```powershell
pnpm --filter @podcast/site dev:badges
```

Ouvrir `http://127.0.0.1:3100/charts/awards`. Le manifeste `apps/site/.local/badges-preview/preview.json` contient les liens des exemples. Le serveur écoute uniquement sur loopback ; il remplace toute connexion distante par une base en mémoire, neutralise les secrets de collecte et identifie ses entités `FIXTURE`. Les six extensions disposent de 52 éditions dominicales simulées en 2025, distinctes des éditions courantes produites par le pipeline réel sur les fixtures. Fermer le serveur efface les données. Aucun mode de démonstration n'est accessible dans les routes de production.

```powershell
pnpm --filter @podcast/site exec vitest run test/badges.test.ts test/badges-store.test.ts test/awards.test.ts test/awards-store.test.ts test/badges-cli.test.ts test/badge-analytics.test.ts
pnpm check
pnpm --filter @podcast/site build
pnpm --filter @podcast/site test:badges:http
pnpm --filter @podcast/site test:badges:e2e
```

Le test E2E demande Playwright disponible dans l'environnement. `SANDBOX_PLAYWRIGHT_PATH` peut désigner son module installé et `SANDBOX_BROWSER_CHANNEL=chrome` utiliser Chrome existant. Aucun téléchargement automatique n'est effectué.

Le test HTTP démarre le build de production sur loopback, avec les accès de base désactivés. Il vérifie les en-têtes réellement appliqués par Next, les réponses 400/503, les SVG neutres et HEAD. La règle CSP propre aux badges doit rester après la politique générale dans `next.config.ts`.

Le script crée une base PGlite en mémoire et un proxy du protocole Postgres sur loopback. Il ignore les accès de base de production, produit ses classements avec le moteur existant et utilise des projets marqués `FIXTURE E2E`. Le serveur Next et Chromium testent ensuite le parcours complet. La configuration spéciale est limitée à ce processus. Rapport et captures : `apps/site/.local/badges-e2e/`, ignorés par Git. Aucun flag de fixture n'existe dans les endpoints de production.

Validation du 14 octobre 2026 : le parcours navigateur passe sur Chrome, en 1440, 768 et 390 pixels, avec aperçu clair/sombre, copies Markdown, HTML et URL, partage, lien de retour, historique, noms longs, états vide/indisponible, navigation clavier et texte à 200 %. Le contrôle à 200 % a révélé un débordement de l'en-tête existant ; le retour à la ligne de sa rangée corrige ce cas. Les rapports locaux montrent uniquement des fixtures.

Le contrôle global `pnpm check` passe : formatage, lint, types et 447 tests dans 71 fichiers. Le build de production, les 43 contrôles E2E et les 18 contrôles HTTP du build passent également. Le navigateur ne rapporte aucune erreur JavaScript. Cinq contrôles exécutent le CLI sans connexion de base : l'aide réussit, la simulation sans configuration et les options invalides quittent avec le code 1 avant toute opération. `git diff --check` passe.

Les contrôles des extensions couvrent les six types, les agrégations complètes et incomplètes, les égalités, deux créations concurrentes depuis une table vide, les retraits, le refus SQL d'une source retirée, le sitemap et l'éligibilité groupée. Le navigateur vérifie les pages sources, les SVG, les PNG, les liens de retour, les filtres, la pagination et les entrées depuis Skills et Models. Les générateurs ont des noms accessibles explicites et vérifient les images déjà chargées avant l'hydratation, pour ne pas conserver un état de chargement terminé.

| Critère                                                | Preuve locale et limite                                                                                                                                                               |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rang exact, URL permanente, mise à jour et état neutre | Tests purs, pipeline GitHub sur fixtures et réponses SVG. Aucun rang 21 à 100 inventé.                                                                                                |
| Sept Awards fondés sur les éditions officielles        | Tests purs et Postgres/PGlite, avec preuve immuable, période complète et relance concurrente.                                                                                         |
| Copie, téléchargement, partage et liens de retour      | Parcours Chrome, snippets récupérés, SVG téléchargé et PNG 1200 par 630 vérifiés.                                                                                                     |
| Historique, sources, retraits, filtres et pagination   | Parcours réel entre pages et base éphémère, avec les états vide et indisponible.                                                                                                      |
| Mobile, clavier et quatre langues                      | Captures 390, 768 et 1440 pixels, texte à 200 %, métadonnées et formulaire localisés. Relecture native espagnole et allemande à prévoir.                                              |
| Autorisations et erreurs                               | Tests du secret cron, lectures publiques sans session, aucun endpoint public d'attribution, refus des paramètres invalides et absence de cache sur les pannes.                        |
| Premiers lauréats réels et rendu GitHub Camo           | À vérifier après autorisation de livraison. Un serveur loopback n'est pas accessible à GitHub ; aucune attribution réelle ni modification de README distant pendant le développement. |

Le formatage a été appliqué aux sources locales déjà présentes. ESLint reconnaît les environnements navigateur et Node des scripts vidéo ; les dépendances Python, les fichiers générés et les licences tierces restent hors contrôle. Aucun test ni règle de sécurité n'est désactivé. `pnpm audit --audit-level=high` passe, sans vulnérabilité haute ou critique. L'audit complet signale une vulnérabilité modérée dans `esbuild@0.18.20`, dépendance de développement transitive de `drizzle-kit` via `@esbuild-kit` ([GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)). Elle concerne le serveur de développement esbuild ; aucune dépendance du système de badges n'a été ajoutée.

Les contrôles des vidéos concernées passent également : 7 tests et les types du générique, puis HyperFrames `0.8.157` pour Le Clash, avec 12 contrastes vérifiés. Une comparaison supplémentaire de captures par empreinte n'a pas donné de résultat stable entre deux exécutions du même rendu ; elle ne démontre donc pas une identité pixel à pixel. Les fichiers vidéo masters n'ont pas été réécrits.

## Mise en service restant à exécuter

Lors de l'audit initial du 14 octobre 2026, la lecture du site public a donné :

| Ressource publique                                                                   | Résultat observé                                                                       |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| [Classement GitHub courant](https://www.sandboxpodcast.fr/api/charts/github/current) | HTTP 200, édition du 10 octobre 2026, 20 positions, méthode `github-momentum-v1+stars` |
| [Classement Rising courant](https://www.sandboxpodcast.fr/api/charts/rising/current) | HTTP 202, `pending`, aucune position                                                   |
| [Page Awards](https://www.sandboxpodcast.fr/charts/awards)                           | HTTP 404, fonctionnalité locale non livrée                                             |

La première mesure GitHub a été collectée le 10 octobre à 02:34:40 UTC ; l'édition a été publiée à 09:57:38 UTC. Ces données dépassent la fraîcheur de 48 heures. Un badge déployé dans cet état doit rester neutre. Aucune attribution Rising Star réelle ne peut être justifiée tant que l'édition du dimanche et ses preuves corroborées ne sont pas disponibles.

Lors de cet audit, le connecteur Vercel au projet `sandboxpodcastpro-5518/sandbox-podcast` répondait 403 et aucune connexion distante n'était configurée localement. La base distante, son journal et ses sauvegardes n'ont pas été inspectés. Lou demande ensuite de conserver tout le développement en local pour sa vérification. Aucune migration distante, attribution réelle, livraison Vercel, commit ou push n'a été exécuté.

Procédure sur l'environnement autorisé, après vérification de Lou et confirmation des accès :

1. Confirmer le projet Vercel, le dépôt lié, la branche livrée, le Root Directory `apps/site` et la branche Neon cible. Vérifier que Preview ne peut pas écrire dans la base de production.
2. Comparer le schéma et le journal Drizzle de la base aux migrations locales. Créer un point de restauration Neon. Appliquer les migrations manquantes par le script existant, sans réexécuter manuellement une migration déjà enregistrée : depuis `apps/site`, `node --env-file-if-exists=.env.local scripts/db-migrate.ts`. La migration 0012 ajoute les Awards et leurs retraits ; 0013 ajoute les six extensions, sans réécrire les preuves historiques.
3. Lancer `badges:awards -- --dry-run` avec la connexion autorisée. Un résultat sans lauréat lorsque les données sont insuffisantes est attendu ; ne pas créer d'historique artificiel.
4. Livrer le code relu par le flux Git/Vercel habituel. Confirmer `SITE_URL`, la connexion Neon et le cron quotidien existant. Vérifier les collectes et les gels officiels si le classement reste ancien.
5. Sur le déploiement, vérifier `/charts/awards`, une fiche réelle et son SVG, puis le Markdown dans un README GitHub. Contrôler le rang exact seulement après une nouvelle édition valide. Une URL d'Award non attribué doit répondre 404, et une semaine malformée 400.
6. Après la première clôture éligible, vérifier la preuve et l'historique public. Relancer le job pour confirmer l'absence de doublon. La relecture native espagnole et allemande reste à effectuer selon la politique de traduction du site.

## Livraison groupée du 15 octobre 2026

La demande de Lou autorise la PR unique et sa fusion. Les migrations des badges sont renumérotées `0012` et `0013`, suivies de `0014_awards_refresh_slots`. Elles doivent être appliquées dans cet ordre après les migrations déjà publiées, via le journal Drizzle et la procédure de restauration de l'environnement cible.

L'intégration accepte les profils v3 avec preuve rejouée et les éditions de douze heures. Le dernier créneau publié du dimanche sert de référence aux prix hebdomadaires, mensuels et annuels. La reprise des Awards suit chaque gel du planificateur actuel.
