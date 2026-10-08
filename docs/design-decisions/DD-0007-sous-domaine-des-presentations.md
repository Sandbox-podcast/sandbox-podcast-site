# DD-0007 — Sous-domaine des présentations d’épisode

- Statut : acceptée
- Date : 2026-10-08
- Décidée par l’agent sur délégation (PD-0003), à la demande de la propriétaire

## Contexte

Les supports HTML des épisodes doivent être accessibles à l’écran pendant le podcast, sans afficher la navigation habituelle du site. Le premier support est rangé dans `apps/site/public/slides/episode-043/` et doit être servi depuis `slides.sandboxpodcast.fr`.

## Décision

- Garder la présentation dans le projet Next.js existant, comme fichier statique sous `public/slides/<episode>/index.html`.
- Définir les sous-domaines publics dans `apps/site/src/domain/subdomain-routing.ts`. Next.js réécrit la requête `GET /` de chaque hôte déclaré vers sa page d’entrée.
- Déclarer `slides.sandboxpodcast.fr` comme domaine du projet Vercel `sandbox-podcast` et configurer l’enregistrement DNS demandé par Vercel. Le code ne crée ni ne modifie cette configuration externe.

## Conséquences

- Les présentations ne chargent pas le shell du site et leurs URL restent propres au sous-domaine.
- Ajouter un épisode ne demande pas de nouvelle application ou de nouveau déploiement Vercel ; il faut créer son dossier statique et mettre à jour l’entrée du sous-domaine si la page affichée doit changer.
- Le sous-domaine ne sera joignable qu’après rattachement au projet Vercel et propagation DNS. Les cibles DNS exactes sont celles indiquées dans le projet Vercel.
