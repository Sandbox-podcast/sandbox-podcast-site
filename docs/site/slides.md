# Présentations d’épisode

Les présentations partagées à l’écran sont des fichiers HTML statiques servis par le site. Chaque épisode possède son propre dossier sous `apps/site/public/slides/` :

```text
apps/site/public/slides/
└── episode-043/
    ├── index.html
    └── assets/
```

Le support de l’épisode 043 s’ouvre sur `slides.sandboxpodcast.fr`. La liste des hôtes et de leurs pages d’entrée se trouve dans `apps/site/src/domain/subdomain-routing.ts`. Pour afficher un autre épisode sur ce sous-domaine, remplacer sa destination par `/slides/<episode>/index.html`.

Les vues de sujet restent courtes et associent leurs points clés à une capture de la source citée, enregistrée dans `assets/`. La vue qui définit le harnais utilise un schéma explicatif. Les visuels pleine page marquent les séquences ; leur nom est toujours centré en bas avec la même typographie.

## Mise en service du sous-domaine

Le routage est versionné dans le dépôt. Pour que l’hôte arrive aussi sur le projet en production :

1. Ajouter `slides.sandboxpodcast.fr` au projet Vercel `sandbox-podcast`.
2. Créer l’enregistrement DNS recommandé par Vercel pour ce sous-domaine, puis vérifier son statut dans Vercel.
3. Déployer la configuration du dépôt.

Vercel fournit la cible DNS selon le domaine et le projet. Le sous-domaine doit être rattaché à ce projet afin que la règle Next.js qui examine l’hôte puisse servir la présentation.

La navigation du support fonctionne avec les flèches gauche/droite, Page précédente/Page suivante, Début/Fin, le balayage tactile et le plein écran (`F`).

Voir aussi [DD-0007](../design-decisions/DD-0007-sous-domaine-des-presentations.md).
