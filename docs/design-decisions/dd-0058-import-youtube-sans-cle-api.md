# DD-0058 : importer un épisode YouTube sans clé API

Date : 2026-10-18.

Lou signale que la création d'un épisode exige `YOUTUBE_API_KEY`, alors qu'aucune clé n'a été configurée. Il demande de récupérer la date et la durée directement depuis YouTube. La mise en œuvre est décidée par l'agent sur délégation (PD-0003).

Le serveur lit le JSON `ytInitialPlayerResponse` de la page publique de la vidéo. Il extrait `publishDate`, `lengthSeconds`, le titre, la chaîne, la description et la miniature. Le JSON est décodé sans exécuter de JavaScript, puis validé avec Zod. L'identifiant doit correspondre à la vidéo demandée. Les vidéos privées, à venir ou en direct ne fournissent pas de métadonnées de replay utilisables par ce chemin.

`YOUTUBE_API_KEY` devient facultative pour l'import. Une clé configurée garde la priorité, avec repli sur la page publique si la Data API échoue ou renvoie des données incomplètes. Si la page fournit la date mais pas la durée, le lecteur officiel complète la durée. oEmbed reste le dernier secours pour le titre, la chaîne et la miniature. Une date ou une durée absente empêche toujours la création, sans demander de clé API et sans inventer de valeur. La date de téléversement ne remplace pas la date de publication. Quand YouTube ne fournit qu'un jour, le stockage ISO utilise minuit UTC par convention, sans prétendre connaître l'heure réelle.

La requête part d'un identifiant validé vers une origine YouTube fixe. Elle refuse les redirections, expire après huit secondes et limite la page à cinq millions d'octets pendant sa lecture. L'authentification, les permissions de brouillon, le contrôle d'origine et la publication explicite restent ceux de l'administration. Aucune migration, dépendance ou configuration de compte n'est ajoutée.

Cette décision remplace les passages exigeant la Data API pour les nouveaux épisodes dans ADR-0016 et DD-0014. Elle ne change pas la collecte des statistiques sociales, qui utilise toujours sa propre configuration API.

## Vérifications

La lecture réelle de [l'épisode 1](https://www.youtube.com/watch?v=GgSiPkADCz4), sans cookie ni clé, fournit `2026-10-12T19:52:24.000Z` et `4702` secondes. Le parseur extrait aussi ses 17 chapitres. Le test ne publie aucun contenu.

Les 29 tests ciblés passent. Ils couvrent la création depuis la page publique, les données manquantes, les dates invalides, les vidéos privées et en direct, les réponses tronquées, les limites de taille, le repli après erreur API, la panne réseau et le refus des requêtes sans autorisation. Le lint des neuf fichiers TypeScript modifiés ou ajoutés passe.

La recette Chrome importe cette vidéo par la route authentifiée, sans clé, puis publie l'épisode dans un fichier de test isolé sous `.local`. Le serveur conserve la date, la durée et les 17 chapitres, sans erreur JavaScript. Le compte admin et sa base sont éphémères. Le rapport et les captures sont dans `apps/site/.local/youtube-metadata/`, ignoré par Git.

La branche de PR est testée dans une copie isolée de la dernière version de main. `pnpm check` passe : formatage, lint, TypeScript, 822 tests du site et 35 tests vidéo/présentation. Le build de production du site réussit aussi. `pnpm audit --audit-level=high` ne signale aucune vulnérabilité connue. Les journaux sont conservés dans `.local/pr-validation/` de cette copie.

Deux défauts déjà présents dans main bloquaient les contrôles : le tableau Markdown de `docs/site/issue-68-2026-10-18.md` n’était pas formaté et `external-charts-store.ts` comportait un repli `?? []` sur un tableau obligatoire. La PR corrige leur formatage et cette condition redondante, sans changer les règles de classement ni désactiver de contrôle.

Fichiers de ce lot : le parseur `src/domain/youtube-page.ts`, la lecture HTTP `src/lib/youtube-page.ts`, la route `api/admin/youtube-metadata`, `episode-import.ts`, `episode-composer.tsx`, trois suites de tests et leur fixture, `.env.example`, le guide éditorial, les notes de remplacement dans ADR-0016/DD-0014 et l'index de documentation.

La structure de la page YouTube peut changer ou son accès peut être bloqué depuis un hébergeur. La lecture réelle depuis cette machine ne prouve pas l'accès depuis Vercel. Le premier import sur Vercel devra être vérifié après déploiement.
