# Présentations d’épisode

Les présentations partagées à l’écran sont des fichiers HTML statiques servis par le site. Chaque épisode possède son propre dossier sous `apps/site/public/slides/` :

```text
apps/site/public/slides/
└── episode-001/
    ├── index.html
    └── assets/
```

Le sous-domaine `slides.sandboxpodcast.fr` affiche d’abord `public/slides/index.html` (liste des supports, sans JavaScript Next). Chaque deck s’ouvre sur `https://slides.sandboxpodcast.fr/<episode>/index.html` (exemple : `/episode-001/index.html`) : cette URL stable évite la boucle de redirections slash de Next et garde `./assets/` corrects. Le middleware réécrit vers `public/slides/...` (sauf `/_next` et `/api`).

Après ajout d’un dossier d’épisode, régénérer l’index puis le formater (`pnpm exec prettier --write public/slides/index.html`) :

```powershell
node --input-type=module -e "import { writeFileSync } from 'node:fs'; import { listSlideDecks, renderSlidesIndexHtml, slidesPublicRoot } from './src/domain/slide-decks.ts'; writeFileSync('public/slides/index.html', renderSlidesIndexHtml(listSlideDecks(slidesPublicRoot(process.cwd()))));"
```

depuis `apps/site`.

Les mêmes fichiers restent accessibles sur le site principal via `/slides/<episode>/`.

Dans `/admin`, la section « Slides » affiche cet index dans un aperçu. Un clic sur un support l'ouvre dans le même cadre ; un bouton permet de revenir à la liste et « Ouvrir en grand » affiche l'index dans un nouvel onglet. Le cadre utilise `iframe sandbox="allow-scripts"` pour que le JavaScript de navigation fonctionne sans donner au support l'origine de l'administration. La politique CSP autorise ce cadre de même origine.

Les vues de sujet restent courtes et associent leurs points clés à une capture de la source citée, enregistrée dans `assets/`. La vue qui définit le harnais utilise un schéma explicatif. Les visuels pleine page marquent les séquences ; leur nom est toujours centré en bas avec la même typographie.

## Mise en service du sous-domaine

Le routage est versionné dans le dépôt. Pour que l’hôte arrive aussi sur le projet en production :

1. Ajouter `slides.sandboxpodcast.fr` au projet Vercel `sandbox-podcast`.
2. Créer l’enregistrement DNS recommandé par Vercel pour ce sous-domaine, puis vérifier son statut dans Vercel.
3. Déployer la configuration du dépôt.

Vercel fournit la cible DNS selon le domaine et le projet. Le sous-domaine doit être rattaché à ce projet afin que les règles Next.js qui examinent l’hôte puissent servir l’index et les decks.

La navigation du support fonctionne avec les flèches gauche/droite, Page précédente/Page suivante, Début/Fin, le balayage tactile et le plein écran (`F`).

Voir aussi [DD-0007](../design-decisions/DD-0007-sous-domaine-des-presentations.md).

## Épisode 003 en préparation

Le [support du troisième épisode](episode-003-preparation.md) compte huit écrans : un lobby pour chacune des séquences Introduction, Radar, Talk et Clash, deux actualités dans le Radar (Microsoft Copilot Studio et Voxtral 3), une slide de cas d’usage dans le Talk et une question dans le Clash.

La slide du Talk présente le catalogue produits intégré dans un agent et demande ce que cela permet aux équipes. Celle du Clash pose la question de la mise en production en entreprise d’un produit développé en vibe coding. Les anciennes données de préparation restent sur disque, mais ne sont pas chargées par le support.

Les lobbies et les deux écrans Talk et Clash utilisent des illustrations photoréalistes inspirées du plateau de podcast, du vidéoclub et du rétrofuturisme du site. Voir [la direction artistique de l’épisode 003](episode-003-direction-artistique.md).

Pour le partage d’écran, `P` active le mode live sans régie et `F` demande le plein écran du navigateur. Le support suit la taille de la fenêtre.

## Épisode 002

L'aperçu reprend l'interface de l'épisode 001 et son fichier logo original. Les slides Bêta et Clash sont en HTML modifiable, sans logo recréé dans une image.

| Slides  | Contenu                                                                                                          |
| ------- | ---------------------------------------------------------------------------------------------------------------- |
| 1       | LE RADAR, même visuel que l'épisode 001                                                                          |
| 2 à 11  | Muse Wonder, Gemini 4 Argon, réplication, Claude, Maia 300, lunettes IA, REA, Runway, cyberattaque et persuasion |
| 12      | LE BUILD, même visuel que la slide 9 de l'épisode 001                                                            |
| 13 à 17 | Les cinq slides Bêta demandées par Lou                                                                           |
| 18      | LE CLASH, même visuel que la slide 18 de l'épisode 001                                                           |
| 19 à 22 | Tickets du PO, legacy, code de l'IA et métier de dev                                                             |

O affiche la vue d'ensemble des 22 slides. D ouvre la simulation locale, N affiche les notes sur l'écran courant et P ouvre les notes dans une fenêtre séparée. Les commandes visibles restent celles de l'épisode 001. Les ancres numériques `#1` et les anciennes ancres `#slide-1` fonctionnent.

La Bêta suit le plan de Lou : sujet, usages et ROI, outils, méthode et exemples, questions en commentaire. Voir [l'analyse et les sources](episode-002-beta-artisans-commercants.md). Les actualités Radar sont sourcées dans les notes présentateur. Pour l’attaque frigorifique, les contrôleurs compromis sont distingués des prestataires externes ; les pertes totales et l’attribution restent incertaines. Pour la persuasion par IA, la slide signale l’expression de préoccupation de Science (2026) sur les analyses de 2024 et présente le résultat Reddit comme préliminaire et non autorisé selon ses modérateurs. Pour REA, le deck distingue le projet d'analyse du cas indépendant ArtCraft ; l'exemple de pilotage de clim est attribué à Lou. Pour Runway, il distingue le dépôt de skills, le MCP à connecter à Claude, l'intégration de Gen-4.5 dans ElevenCreative et l'application autonome. Les chiffres et feuilles de route de Gemini et Maia sont attribués à leurs entreprises ; l'auto-réplication est présentée comme un risque étudié en laboratoire ; les comportements de Claude sont rapportés avec le contexte et les limites donnés par Anthropic ; la proposition norvégienne sur les lunettes n'est pas présentée comme une interdiction générale adoptée. Les slides Muse Wonder renvoient à [l'annonce de Meta AI Research](https://research.meta.ai/blog/muse-wonder) et à [la fiche modèle de Meta](https://dev.meta.ai/models/muse-wonder).

Décision : [DD-0016](../design-decisions/DD-0016-slides-episode-002-identite-et-ordre.md). Le support est servi en local ; les nouveaux sujets Radar sont proposés dans une PR de suivi.
