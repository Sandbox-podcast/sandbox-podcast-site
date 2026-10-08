# DD-0007 — Sous-domaine des présentations d’épisode

- Statut : acceptée
- Date : 2026-10-08
- Décidée par l’agent sur délégation (PD-0003), à la demande de la propriétaire

## Contexte

Les supports HTML des épisodes doivent être accessibles à l’écran pendant le podcast, sans afficher la navigation habituelle du site. Le premier support est rangé dans `apps/site/public/slides/episode-043/` et doit être servi depuis `slides.sandboxpodcast.fr`.

## Décision

- Garder chaque présentation dans le projet Next.js existant, comme fichiers statiques sous `public/slides/<episode>/index.html` et `assets/`.
- Sur `slides.sandboxpodcast.fr`, le middleware Next réécrit `GET /` vers `public/slides/index.html` et les chemins de decks vers `/slides/...` (sans toucher `/_next` ni `/api`). Les rewrites `beforeFiles` basés sur l’hôte ne s’appliquaient pas de façon fiable à la racine `/`.
- Rediriger `/:deck` (épisode sans slash final) vers `/:deck/` sur ce sous-domaine pour éviter de casser les assets relatifs.
- Déclarer `slides.sandboxpodcast.fr` comme domaine du projet Vercel `sandbox-podcast` et configurer l’enregistrement DNS demandé par Vercel. Le code ne crée ni ne modifie cette configuration externe.

## Conséquences

- La racine du sous-domaine liste les supports disponibles ; un deck ne s’ouvre que via son chemin (`/episode-043/`).
- Les présentations ne chargent pas le shell du site et leurs assets relatifs se résolvent correctement.
- Ajouter un épisode consiste à créer son dossier sous `public/slides/` puis régénérer `public/slides/index.html` via `renderSlidesIndexHtml` (contrôlé par les tests).
- Le sous-domaine ne sera joignable qu’après rattachement au projet Vercel et propagation DNS. Les cibles DNS exactes sont celles indiquées dans le projet Vercel.

Mise à jour 2026-10-08 (issue #13, décidée par l’agent sur délégation PD-0003) : index + rewrite de chemins.
Mise à jour 2026-10-08 (suite) : index HTML statique et exclusion de `/_next` du rewrite (404 / MIME type sur le sous-domaine).
Mise à jour 2026-10-08 (suite) : routage hôte déplacé dans `middleware.ts` car la racine `/` restait en 404 via `[locale]`.
