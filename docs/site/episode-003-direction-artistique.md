# Épisode 003 : direction artistique des slides

## Lecture de la direction du site

Le site assemble deux registres déjà compatibles. La charte pose un média premium, sombre et éditorial : bleu nuit, cyan parcimonieux et typographie Archivo ([DD-0002](../design-decisions/DD-0002-charte-sandbox-bleu-nuit-cyan.md)). L’accueil donne à cette identité un lieu concret : plateau de podcast photographique, bois nervuré, lumière ambrée, écrans cathodiques et références au vidéoclub et au rétrofuturisme ([DD-0064](../design-decisions/dd-0064-accueil-impact-ia-et-plateau-au-scroll.md)). La direction retenue pour les slides est consignée dans [DD-0071](../design-decisions/dd-0071-direction-artistique-slides-episode-003.md).

Les anciennes slides reposaient davantage sur des formes abstraites cyan et des effets lumineux. Les illustrations de l’épisode 003 rapprochent le support du décor de l’accueil : objets et matières photographiques, lumière chaude dans un environnement bleu nuit, cyan réservé aux signaux utiles. Les titres restent en HTML, sur une zone assombrie à gauche ; aucune typographie ni aucun logo n’est incrusté dans les images.

## Illustrations produites

| Écran            | Fichier WebP                                                        | Direction de l’image                                                                                       |
| ---------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Introduction     | `apps/site/public/slides/episode-003/assets/intro-v1.webp`          | Vue d’ensemble d’un plateau habité par des références de vidéoclub et de télévision rétro.                 |
| Lobby Radar      | `apps/site/public/slides/episode-003/assets/radar-v1.webp`          | Instrument radar analogique, utilisé comme objet de décor plutôt que comme interface flottante.            |
| Lobby Talk       | `apps/site/public/slides/episode-003/assets/talk-lobby-v1.webp`     | Coin de conversation avec fauteuils, micros et cassettes vidéo.                                            |
| Cas d’usage Talk | `apps/site/public/slides/episode-003/assets/talk-case-v1.webp`      | Catalogue de produits et dossiers reliés visuellement à un écran d’agent.                                  |
| Lobby Clash      | `apps/site/public/slides/episode-003/assets/clash-lobby-v1.webp`    | Deux micros face à face, avec une opposition cyan et corail contenue dans le décor.                        |
| Question Clash   | `apps/site/public/slides/episode-003/assets/clash-question-v1.webp` | Ordinateur rétro et infrastructure serveur pour évoquer le passage en production sans suggérer la réponse. |
| Schéma Voxtral 3 | `apps/site/public/slides/episode-003/assets/voxtral-3-pipeline.svg` | Diagramme éditorial de la chaîne transcription, raisonnement et synthèse vocale du SDK Voice Agents.       |

Les six illustrations de séquence ont été générées avec l’outil intégré ImageGen le 20 octobre 2026. Les PNG sources et leurs versions WebP sont conservés dans le dossier `assets/`; le support charge les WebP. La slide Voxtral ajoute un schéma SVG local dédié à la news. Ces visuels ne portent pas les titres éditoriaux, qui restent en texte HTML modifiable.

La slide Talk « L’agent, nouvelle interface ? » réutilise le décor du cas d’usage Talk ; son texte et ses sources restent en HTML.

## Brief commun de génération

- Format horizontal 16:9, rendu photoréaliste soigné, inspiré d’un plateau de podcast et d’un vidéoclub de la fin des années 1980.
- Bois nervuré, écrans CRT, étuis VHS, matériel de diffusion et éclairage pratique ambré ; fond bleu nuit avec quelques repères cyan.
- Aucun logo, personnage, texte lisible ou élément d’interface incrusté dans l’image.
- Composition avec de l’espace sombre à gauche pour accueillir les titres HTML, et les objets de scène davantage présents à droite.
- Éviter les hologrammes, les halos cyan omniprésents et l’imitation d’une franchise connue.
