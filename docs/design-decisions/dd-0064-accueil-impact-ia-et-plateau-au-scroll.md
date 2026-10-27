# DD-0064 : impact de l'IA et plateau au scroll

20 octobre 2026. Conception décidée par l'agent sur délégation (PD-0003), à la demande de Lou. Cette décision remplace les choix d'accueil de DD-0033, DD-0034 et DD-0049 pour la séquence d'ouverture, les portraits et l'ordre des replays.

## Ligne éditoriale

La source est [vision.md](../../vision.md). Sandbox traite les effets de l'IA sur les produits numériques, le développement et les organisations. L'accueil s'adresse aux professionnels qui construisent des produits et pilotent les équipes tech. Le titre devient "L'IA transforme les entreprises." La description précise les produits, les métiers et les équipes, puis la confrontation des expériences de Lou, Loïc et Nico. Les métadonnées et la description du footer suivent cette ligne. Les textes ajoutés sont traduits en anglais, espagnol et allemand.

## Séquence sur ordinateur

Le défilement reste natif. Un conteneur de 440 svh contient un plateau épinglé pendant la séquence. Aucun geste de défilement n'est intercepté.

| Temps                   | Progression | Mouvement et contenu                                                                                                                                                                                     |
| ----------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arrivée                 | 0 à 0,08    | Le plateau est sombre, le titre et le bouton vers l'émission restent lisibles. Les trois portraits quittent le décor.                                                                                    |
| Allumage                | 0,08 à 0,39 | Les projecteurs apparaissent successivement au-dessus du téléviseur des classements, du radar News si disponible, de la porte des projets et de la Time Machine. Les objets sont directement cliquables. |
| Exploration             | 0,39 à 0,56 | Le plateau reste allumé. Le texte s'efface, puis le point de vue avance. Le visiteur peut cliquer sur les objets.                                                                                        |
| Retournement et replays | 0,56 à 1    | Le décor pivote et laisse place à une photographie du mur opposé du même studio, avec les affiches des émissions. Une pause laisse le temps de les consulter avant la suite de la page.                  |

Lou rejette le premier mur CSS et les faisceaux triangulaires. Deux nouveaux visuels photoréalistes remplacent cette proposition : une vue large du plateau avec plafond et sol visibles, et une contre-vue prise depuis la place des animateurs, face au mur de replays et aux caméras de tournage. Les mêmes matériaux, plantes et éclairages relient les deux points de vue. Le cadrage conserve l'image entière sur ordinateur, y compris sur les écrans larges.

Après la correction de Lou, le radar News devient un petit instrument vintage posé sur l'étagère centrale, réduit à environ 60 % de sa taille précédente, avec un écran vert moins lumineux. Les boutons sous les objets sont retirés, sur ordinateur comme sur mobile. Chaque objet reste directement cliquable, avec un nom accessible et un repère de focus au clavier. Le lien News suit la disponibilité réelle de la rubrique ; la recette locale utilise le fil déjà présent dans le dépôt. Les lumières sont révélées par des masques radiaux sur des couches alignées de la photographie éclairée. Aucun triangle lumineux ni faux projecteur CSS ne reste affiché.

Les replays sont des affiches de cinéma vintage dérivées des miniatures YouTube officielles. Les deux premières affiches correspondent aux vidéos GgSiPkADCz4 et 7KVqydbGow0, pas au seul numéro d'épisode. Elles gardent les portraits photographiques et portent le numéro de leur émission. Les cadres, les ombres et les reflets les intègrent au mur du studio. Le titre et le lien restent en HTML, accessibles au clavier et au survol.

Le mur affiche au plus huit épisodes vidéo disponibles, triés du plus récent au plus ancien. Aucune affiche n'est inventée ni répétée pour remplir le mur. Sans affiche spécifique, la miniature éditoriale de la vidéo reste utilisée. Les nouvelles affiches nécessitent une préparation graphique ; il n'y a pas de génération payante automatique.

Les images ont été créées avec l'outil intégré ImageGen. Les sources PNG, les versions WebP et les [prompts](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/studio-photos-2026-10-20-prompts.json) sont conservés dans le dépôt. Cette version utilise des photographies transformées en perspective, sans scène 3D navigable.

Les raccourcis permettent d'allumer le plateau, de rejoindre les replays ou de passer à l'équipe. Les parties invisibles ne prennent pas le focus. Le bouton de réduction des mouvements est partagé avec les interactions existantes de l'accueil.

## Mobile et mouvements réduits

Sur mobile et sur les fenêtres de moins de 600 px de haut, le plateau est allumé dès l'arrivée, les destinations sont accessibles directement, puis le mur des replays suit dans le flux. Il n'y a pas d'épinglage ni de retournement. La préférence système de réduction des mouvements et la pause demandée par le visiteur utilisent aussi ce parcours. Le HTML sans JavaScript garde tous les contenus et liens visibles.

## Équipe et simplification

À la demande de Lou, les titres de l'accueil passent en Archivo, déjà chargée localement. Les titres sont droits, sans italique, avec des tailles ajustées sur ordinateur et mobile. Ce choix concerne l'accueil et conserve les visuels des affiches.

Les cartes à collectionner quittent la homepage. Les vrais portraits, noms et liens sociaux reprennent la collection Animateurs utilisée dans le À propos. Les biographies publiées restent prioritaires. La présentation rappelle les deux développeurs et le Product Manager, selon vision.md, sans attribuer un rôle individuel non fourni. Le tracé décoratif qui reliait les chapitres est retiré de la homepage.

Les replays précèdent désormais l'équipe, les projets et les rubriques. Les titres des projets et de l'exploration relient ces contenus aux expériences de l'équipe et à la compréhension des changements liés à l'IA.

Lou demande également d'ajouter [la page LinkedIn de Sandbox](https://www.linkedin.com/company/sandbox-podcast-fr/) aux réseaux du footer. Le lien comporte une icône, un libellé, l'ouverture dans un nouvel onglet et la mesure de clic déjà utilisée pour les autres réseaux.

## Livraison

Travail local uniquement. Aucun commit, push, PR ou déploiement n'est autorisé par cette demande. Les vérifications et limites sont consignées dans [la recette locale](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/accueil-impact-ia-2026-10-20.md).
