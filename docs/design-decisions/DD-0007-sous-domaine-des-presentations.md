# DD-0007 — Sous-domaine des présentations d’épisode

- Statut : acceptée
- Date : 2026-10-08
- Décidée par l’agent sur délégation (PD-0003), à la demande de la propriétaire

## Contexte

Les supports HTML des épisodes doivent être accessibles à l’écran pendant le podcast, sans afficher la navigation habituelle du site. Le premier support est rangé dans `apps/site/public/slides/episode-043/` et doit être servi depuis `slides.sandboxpodcast.fr`.

## Décision

- Garder chaque présentation dans le projet Next.js existant, comme fichiers statiques sous `public/slides/<episode>/index.html` et `assets/`.
- Sur `slides.sandboxpodcast.fr`, Next.js réécrit `GET /` vers la page d’index `/presentations` (liste des decks, sans shell du site) et tout autre chemin `/:path+` vers `/slides/:path+`, afin que les URLs relatives `./assets/...` restent sous le dossier du deck.
- Rediriger `/:deck` (épisode sans slash final) vers `/:deck/` sur ce sous-domaine pour éviter de casser les assets relatifs.
- Déclarer `slides.sandboxpodcast.fr` comme domaine du projet Vercel `sandbox-podcast` et configurer l’enregistrement DNS demandé par Vercel. Le code ne crée ni ne modifie cette configuration externe.

## Conséquences

- La racine du sous-domaine liste les supports disponibles ; un deck ne s’ouvre que via son chemin (`/episode-043/`).
- Les présentations ne chargent pas le shell du site et leurs assets relatifs se résolvent correctement.
- Ajouter un épisode consiste à créer son dossier sous `public/slides/` ; la page d’index le découvre automatiquement au prochain build.
- Le sous-domaine ne sera joignable qu’après rattachement au projet Vercel et propagation DNS. Les cibles DNS exactes sont celles indiquées dans le projet Vercel.

Mise à jour 2026-10-08 (issue #13, décidée par l’agent sur délégation PD-0003) : remplacement de la rewrite directe vers l’épisode 043 par l’index + rewrite de chemins.
