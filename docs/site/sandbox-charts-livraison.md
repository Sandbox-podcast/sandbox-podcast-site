# SANDBOX CHARTS : rapport de livraison locale

Date : 2026-10-07. Périmètre : les deux briefs du propriétaire, interface publique et MVP de collecte GitHub.

## Audit de départ

Le dépôt contient le site média dans `apps/site`, sous Next.js 16 et React 19. Les classements reposaient sur des fichiers Git de démonstration. Le backoffice proposait leur édition Markdown. L'authentification, les rôles viewer/editor/admin, le client Neon et Drizzle existaient déjà.

Les migrations 0000 et 0001 restent intactes. Les archives de contenu et `old/` restent intactes. Aucun service ni dépendance applicative n'est ajouté.

## Résultat

`/charts` devient SANDBOX CHARTS. Le titre, la semaine et le mois ouvrent les quatre vues GitHub, Skills, Models et Rising. Le podium précède des lignes dépliables avec mouvements, mesures, historique, sources, avis signés et usages. Les filtres conservent les rangs officiels. Les vues longues expliquent leur indice de présence aux meilleures places.

Les blocs mouvements, watchlist, signaux sectoriels, édition mensuelle, records et archives utilisent les données disponibles. Un avis ou une mesure absente reste absent. Les cartes de partage offrent cinq formats. Les liens partagés conservent la période et la capacité du modèle. Le mode studio concentre l'affichage sur le podium et conserve la mention de démonstration.

Le backoffice ajoute les collectes, le catalogue, les candidats, les éditions et la configuration de la méthode. Les positions et compteurs restent en lecture seule. Les textes sont séparés des mesures, avec brouillon, publication, signature et contrôle des conflits.

Le pipeline découvre les dépôts via GitHub Search, collecte quotidiennement par lots GraphQL et calcule Momentum et Rising sur des relevés réellement enregistrés. Il conserve configuration, version, composantes, couverture et provenance avec chaque édition. Il ne reconstitue aucun historique absent.

## Décisions

[ADR-0019](../adr/ADR-0019-sandbox-charts-github-postgres.md) documente le catalogue Postgres, les snapshots immuables et la séparation de l'éditorial. [DD-0004](../design-decisions/DD-0004-sandbox-charts.md) documente la présentation et le backoffice. Ces décisions sont décidées par l'agent sur délégation (PD-0003), dans le cadre des briefs fournis.

Les archives demandent une édition publiée pour le chart et la semaine concernés. Elles se lisent au moment de la requête. Cette disposition évite le rendu statique d'une archive absente et permet de conserver les filtres du lien partagé.

## Fichiers concernés

| Ensemble             | Fichiers et dossiers                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Interface publique   | `src/app/charts/`, `src/components/charts-experience.tsx`, `charts-ranking.tsx`, `charts-features.tsx`, `charts-share.tsx`, `charts-mini.tsx`, `charts-methodology.tsx`                    |
| Intégration au site  | `src/app/page.tsx`, `src/components/shell.tsx`, `src/lib/og.tsx`                                                                                                                           |
| Backoffice           | `src/components/admin-console.tsx`, `admin-charts-console.tsx`, `admin-charts-edition.tsx`, `admin-charts.css`, `src/app/api/admin/charts/`                                                |
| Calcul et validation | `src/domain/github-charts.ts`, `sandbox-charts.ts`, `charts-admin.ts`, `chart-edition.ts`, `chart-selection.ts`, `chart-share.ts`, `schema.ts`, `chart-markdown.ts`, `src/lib/validate.ts` |
| Collecte et stockage | `src/pipeline/github-client.ts`, `github-jobs.ts`, `src/lib/charts-store.ts`, `charts-editorial.ts`, `charts-public.ts`, `charts-admin.ts`, `sandbox-charts.ts`, `src/db/schema.ts`        |
| API et exploitation  | `src/app/api/charts/`, `src/app/api/cron/`, `scripts/charts.ts`, `drizzle/0002_sandbox_charts.sql`, `drizzle/meta/_journal.json`, `.env.example`, `vercel.json`, `package.json`            |
| Tests                | `test/github-charts.test.ts`, `github-client.test.ts`, `charts-store.test.ts`, `charts-api.test.ts`, `charts-ui.test.ts`, `sandbox-charts.test.ts`, `vitest.config.ts`                     |
| Documentation        | Ce rapport, les deux décisions, `docs/sandbox-charts-methodology.md`, `docs/site/sandbox-charts.md`, les index et les documents de stratégie, workflow, questions ouvertes et tests        |

Les chemins de code du tableau sont relatifs à `apps/site`.

## Vérifications exécutées

| Contrôle                                                                                             | Résultat                                                                                                                   |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm check`                                                                                | Formatage, lint, types et 141 tests réussis dans 23 fichiers                                                               |
| `corepack pnpm --filter @podcast/site build`                                                         | Build de production réussi, 189 pages générées                                                                             |
| Lint explicite du calcul, du client, des jobs, du stockage, de l'éditorial et des lectures publiques | Zéro erreur avec les règles TypeScript du dépôt                                                                            |
| Migration SQL dans PGlite                                                                            | Création des tables, immuabilité, publication unique et idempotence vérifiées                                              |
| Sécurité des mutations                                                                               | Rôles, origine, session, données interdites et conflits éditoriaux vérifiés                                                |
| Collecte simulée avec les contrats GitHub                                                            | Quotas, réponses partielles, dépôt privé et préservation de l'historique vérifiés                                          |
| GitHub REST réel                                                                                     | Lecture et validation d'un dépôt public réussies                                                                           |
| HTTP du build de production sur localhost                                                            | Cinq pages en 200, API courantes en 202 sans entrées, archives et fiche inconnues en 404, accès admin/cron anonymes en 401 |
| Image OpenGraph de production                                                                        | PNG 1200 x 630 en 200                                                                                                      |
| Navigateur desktop et mobile                                                                         | Onglets, filtres, périodes, détails, partage et mode studio vérifiés ; aucun débordement horizontal sur le mobile testé    |
| Lien partagé                                                                                         | Coding et This month restitués sur la page de l'édition                                                                    |
| Fixtures                                                                                             | Mention visible dans l'aperçu et le studio ; absentes des classements de production testés                                 |
| Diff Git                                                                                             | Aucun défaut de whitespace                                                                                                 |

Le lint global ignore déjà `apps/site/**`. Le contrôle explicite des six fichiers métier applique les mêmes règles sans cet ignore ; la configuration globale n'a pas été assouplie.

Le navigateur a confirmé la génération d'un visuel PNG et son état de téléchargement. L'événement de téléchargement du navigateur intégré n'a pas fourni de fichier vérifiable. Les dimensions et l'échappement des cinq formats sont couverts par les tests. La console admin authentifiée est couverte par le rendu des composants et les tests serveur ; son parcours avec un compte réel et Neon reste à vérifier après configuration.

La note de transfert du 7 octobre nomme `sandboxpodcastpro-5518/sandbox-podcast`, tandis que la session Vercel actuelle voit aussi un projet `sandbox-podcast-site`. Elle ne peut lire ni ce projet ni l'équipe du site, et le dépôt local n'a ni CLI Vercel ni lien `.vercel`. Les deux projets ne sont pas confirmés comme identiques. La [fiche de mise en service Neon et Vercel](mise-en-service-neon-vercel.md) demande au responsable de confirmer la cible et décrit les étapes restantes.

## Activation et limites

La base, `GITHUB_TOKEN` et `CRON_SECRET` ne sont pas configurés dans l'environnement local contrôlé. La migration n'a pas été appliquée à une base réelle. La collecte GraphQL réelle, les crons Vercel et une première publication réelle restent à vérifier sur l'environnement prévu.

L'activation suit [le guide d'exploitation](sandbox-charts.md) : renseigner les variables serveur, appliquer 0002, importer le catalogue et démarrer les collectes. Le premier classement attend J-7 et suffisamment de dépôts éligibles ; Rising demande aussi J-14. La tolérance aux jours manquants est configurée et documentée dans [la méthode](../sandbox-charts-methodology.md).

Skills et Models disposent de leur interface ; leurs collecteurs réels restent à connecter, comme prévu pour la suite du MVP GitHub. Les compteurs de contributeurs et de releases restent absents lorsque la collecte ne les fournit pas. La newsletter attend son service d'inscription. Les autres contenus de démonstration du média gardent leur politique d'indexation existante.

Aucun commit, push, déploiement, publication externe ou changement de base réelle n'a été effectué. La prochaine étape est l'activation sur l'environnement choisi, puis le contrôle du premier dry run avec ses mesures sources.
