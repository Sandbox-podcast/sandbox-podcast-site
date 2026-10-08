# Présentations d’épisode

Les présentations partagées à l’écran sont des fichiers HTML statiques servis par le site. Chaque épisode possède son propre dossier sous `apps/site/public/slides/` :

```text
apps/site/public/slides/
└── episode-043/
    ├── index.html
    └── assets/
```

Le sous-domaine `slides.sandboxpodcast.fr` affiche d’abord `public/slides/index.html` (liste des supports, sans JavaScript Next). Chaque deck s’ouvre ensuite sur `https://slides.sandboxpodcast.fr/<episode>/` (exemple : `/episode-043/`). Le middleware (`apps/site/src/middleware.ts`) et la logique pure (`subdomain-routing.ts`) réécrivent les chemins du sous-domaine vers `public/slides/...` (sauf `/_next` et `/api`) pour que les assets relatifs (`./assets/...`) se chargent correctement.

Après ajout d’un dossier d’épisode, régénérer l’index :

```powershell
node --input-type=module -e "import { writeFileSync } from 'node:fs'; import { listSlideDecks, renderSlidesIndexHtml, slidesPublicRoot } from './src/domain/slide-decks.ts'; writeFileSync('public/slides/index.html', renderSlidesIndexHtml(listSlideDecks(slidesPublicRoot(process.cwd()))));"
```

depuis `apps/site`.

Les mêmes fichiers restent accessibles sur le site principal via `/slides/<episode>/`.

Les vues de sujet restent courtes et associent leurs points clés à une capture de la source citée, enregistrée dans `assets/`. La vue qui définit le harnais utilise un schéma explicatif. Les visuels pleine page marquent les séquences ; leur nom est toujours centré en bas avec la même typographie.

## Mise en service du sous-domaine

Le routage est versionné dans le dépôt. Pour que l’hôte arrive aussi sur le projet en production :

1. Ajouter `slides.sandboxpodcast.fr` au projet Vercel `sandbox-podcast`.
2. Créer l’enregistrement DNS recommandé par Vercel pour ce sous-domaine, puis vérifier son statut dans Vercel.
3. Déployer la configuration du dépôt.

Vercel fournit la cible DNS selon le domaine et le projet. Le sous-domaine doit être rattaché à ce projet afin que les règles Next.js qui examinent l’hôte puissent servir l’index et les decks.

La navigation du support fonctionne avec les flèches gauche/droite, Page précédente/Page suivante, Début/Fin, le balayage tactile et le plein écran (`F`).

Voir aussi [DD-0007](../design-decisions/DD-0007-sous-domaine-des-presentations.md).
