# DD-0070 : six pièces reliées par des portails

20 octobre 2026. Lou demande de retirer le scroll qui transforme le plateau et de remplacer le premier effet de loupe par un parcours entre six pièces. Les choix de réalisation sont décidés par l'agent sur délégation (PD-0003).

Cette décision remplace la séquence d'ouverture au scroll de [DD-0064](dd-0064-accueil-impact-ia-et-plateau-au-scroll.md). Elle complète la [direction des six pièces](../site/sandbox-six-pieces-direction-2026-10-20.md) et suit [vision.md](../../vision.md).

Consigne de Lou : le portail doit fonctionner sur toute l'illustration. Les commandes contextuelles choisissent la destination, puis le curseur place l'ouverture dans le décor et le clic déclenche la traversée. Cette consigne remplace les points d'activation localisés du premier lot. Après la première passe desktop, Lou demande aussi une recette mobile et desktop.

## Parcours retenu

Le plateau devient une entrée stable. Le premier écran occupe 100 svh et présente uniquement l'accroche dans la scène, sans bouton visible au repos. L'accroche est inscrite au centre de la façade du bureau, en HTML accessible et dans les coordonnées de la photographie. Après le premier écran, une commande compacte « Explorer les pièces » déplie le sélecteur et le réglage des mouvements. Le bandeau de liens dispersés est supprimé ; l'émission, l'équipe et les réseaux restent accessibles dans les rubriques et le pied de page général. Les six cartes placées sous le hero sont retirées. Les commandes de visite apparaissent au survol et restent accessibles au clavier ; elles choisissent la destination depuis chaque pièce.

Complément demandé par Lou le 20 octobre : le bouton « Nos vidéos » apparaît sous l'introduction du plateau, sur ordinateur et mobile. Il ouvre la chaîne YouTube configurée (`https://www.youtube.com/@SandboxFR`) dans un nouvel onglet. Cette demande remplace le retrait de tous les boutons au repos pour ce lien. Le libellé est traduit en anglais, espagnol et allemand ; le clic reprend l'événement `youtube_open`. La recette navigateur locale vérifie le lien visible, une cible tactile d'au moins 44 px et l'ouverture de la destination sans traverser le portail, aux formats 1440 × 900, 375 × 812 et 320 × 568. La navigation YouTube est interceptée dans cette recette ; les preuves restent dans `apps/site/.local/home-videos-browser.json` et les captures associées.

Le défilement conserve son usage habituel et ne pilote plus l'allumage, le retournement du décor ou le changement de salle. Sur ordinateur, toute la surface de l'illustration accueille l'ouverture au curseur ; le visiteur clique dans le décor pour traverser. Les liens des projets, affiches et autres contenus conservent leurs actions.

Les blocs situés plus bas dans l'accueil reprennent les décors des salles correspondantes : Time Machine, classements et Radar. Les cartes de projets gardent les visuels de chaque projet.

| Pièce        | Contenu intégré                                                                                                                      | Suite du parcours                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Plateau      | Accroche seule dans la scène.                                                                                                        | Visite des autres pièces ; émission et présentation de l'équipe après le premier écran. |
| Vidéoclub    | Tous les projets disponibles répartis dans les rayons, avec les médias et titres existants.                                          | Fiche de chaque projet et catalogue complet.                                            |
| Classements  | Quatre terminaux : GitHub, Skills, Models et Rising.                                                                                 | Pages existantes des classements, où restent les résultats et leurs dates.              |
| Time Machine | Frise de tous les événements du corpus, classés par date, avec périodes et détail sélectionné.                                       | Ancres des événements dans la Time Machine.                                             |
| Cinéma       | Affiches des épisodes publiés disposant d'une vidéo YouTube, triées par date décroissante et placées dans les cadres du décor.       | Fiche d'épisode et liste complète des replays.                                          |
| Radar        | Un moniteur intégré au décor donne accès aux actualités IA et développement. État d'indisponibilité lorsque le fil n'est pas ouvert. | Fil News existant, avec ses dates et ses sources.                                       |

La salle des classements présente les familles disponibles ; elle n'affiche pas de rangs simulés. Le Radar donne accès au fil sans reproduire des articles fictifs dans le décor. Les textes et les liens restent en HTML, indépendamment du canvas.

Correction du panneau News demandée par Lou le 20 octobre : son placement suit désormais les coordonnées intérieures du moniteur inférieur dans la photographie, avec un découpage qui reprend son bord supérieur incliné. Le cadre du décor reste visible. Le fond sombre reçoit un léger éclairage vert et une trame d'écran ; le titre et le lien occupent des lignes distinctes. Le focus clavier est dessiné à l'intérieur du panneau. Sur mobile et en portrait, le terminal reste dans le flux, avec un radar réduit pour laisser la place au texte. Réalisation décidée par l'agent sur délégation (PD-0003). La recette dédiée est `apps/site/scripts/test-radar-room.mjs` ; ses captures et mesures locales sont dans `apps/site/.local/radar-room/`.

La recette du Radar réussit dix cas sous Edge headless : sept dimensions de 320 × 568 à 2560 × 1080, puis les trois autres langues à 1440 × 900. Elle vérifie l'alignement sur la photographie, les limites du panneau, le texte, le focus et les destinations localisées. Aucun message d'erreur JavaScript n'a été relevé. À 820 pixels, la page entière conserve un débordement horizontal de deux pixels provenant d'un lien de la section de découverte située plus bas ; le panneau News reste dans la fenêtre. Cette anomalie extérieure au panneau n'est pas corrigée dans ce lot.

Après cette correction, `pnpm check` réussit : format, lint, types, 1 154 tests du site et les suites vidéo et BIS. Travail local, sans commit, push, PR ni déploiement.

Lou remplace ensuite l'accroche du premier écran par : « Bienvenue dans l'univers de Sandbox. Trois passionnés de tech qui explorent, expérimentent et décryptent ce que l'IA change vraiment dans notre façon de créer, de travailler et de construire. » Le texte reste inscrit sur le bureau, avec une taille adaptée à sa longueur. Les rubriques qui suivent sont réordonnées à sa demande : « Des repères pour tes prochains choix. », « Derrière les micros », puis « Nos expérimentations ». Cet ordre s'applique aussi au DOM et à la navigation au clavier ; les numéros des rubriques suivent cet ordre.

À sa demande, une indication sous l'accroche explique aussi la visite : « Explore les six salles via le portail ou le bouton en haut à droite. » L'accroche et cette indication disposent de traductions anglaise, espagnole et allemande.

Recette de ce complément : ordre des trois rubriques et affichage de l'accroche et de l'aide vérifiés dans Edge headless à 320, 390 et 1440 pixels de large. `pnpm check` réussit avec 1 155 tests du site et les suites vidéo et BIS. Les tests conservent aussi la vérification du remplacement de l'ancienne accroche publiée, sans écriture en base.

Lou demande ensuite de raccourcir le texte et de différencier les tailles. Le titre devient « Bienvenue dans l'univers de Sandbox. » ; un paragraphe distinct présente l'émission : « Trois passionnés de tech explorent et testent ce que l'IA change dans nos façons de créer, de travailler et de construire. » Le titre est plus grand et plus gras, la présentation reste en corps courant et l'aide de navigation occupe une troisième ligne plus discrète. Les anciens titres connus sont remplacés à la lecture ; les textes personnalisés restent respectés. Réalisation décidée par l'agent sur délégation (PD-0003).

Lou demande aussi d'ajouter la pièce des projets dans « Des repères pour tes prochains choix. ». La carte « Nos projets » reprend le décor du vidéoclub et mène à `/nos-projets`, avec le suivi de découverte existant. Avec les News ouvertes, la grille affiche quatre cartes sur grand écran, deux colonnes jusqu'à 1280 pixels, puis une colonne jusqu'à 700 pixels. Sans News, les trois autres cartes restent accessibles. La rubrique « Nos expérimentations », après l'équipe, conserve ses projets.

Le cinéma conserve uniquement les épisodes transmis par le site, sans compléter une collection avec des affiches inventées. La pagination conserve l'accès aux émissions lorsque les cadres visibles sont remplis. La collection locale observée contient deux replays ; un jeu de trente épisodes sert au contrôle de pagination et ne rejoint pas les données publiques. Les deux derniers replays occupent deux cadres frontaux, y compris sur mobile. La pagination est masquée quand tous les replays tiennent dans la vue. Les projets sont répartis dans les rayons de leurs créateurs.

## Volume et passage

Le rendu utilise Three.js et WebGL. Chaque photographie est projetée sur cinq faces : mur du fond, sol, plafond et deux murs latéraux. Le vidéoclub ajoute des boîtes de cassettes en géométrie 3D, texturées avec les projets existants.

Le portail suit le curseur sur toute l'illustration jusqu'au clic, puis sa position sert de seuil à la traversée. Le shader dessine une bordure irrégulière, avec un halo et des points lumineux. La seconde pièce est rendue dans une texture depuis une caméra distincte, fixe dans son cadrage canonique. Le shader reprend cette vue dans l'ouverture. Le masque révèle cette image fixe à la position du curseur. La même caméra de destination est conservée au franchissement du seuil et à l'arrivée, pour éviter un changement de cadrage.

La destination conserve désormais une position et une orientation fixes, indépendantes du curseur. La caméra reste également fixe pendant le survol : seule l'ouverture se déplace. Cela corrige le recentrage permanent qui montrait toujours la même portion du vidéoclub. Deux ouvertures différentes doivent montrer le même repère au même emplacement écran lorsqu'elles le découvrent toutes les deux.

Au clic, la caméra avance pendant 1,8 seconde. Elle passe par le point cliqué sur le plan du portail puis rejoint le point de vue de la destination, sans rotation de la pièce. Le changement de repère final conserve la position et la rotation relatives à la pièce ; trois points à des profondeurs différentes gardent la même projection, au centre comme aux quatre coins dans le test unitaire. La caméra source décrit le trajet vers le seuil ; la caméra destination conserve son cadrage. C'est une composition en 2,5D. Le visiteur ne dispose pas de commandes de marche libre ni de rotation à 360 degrés.

La projection sur cinq faces donne une profondeur au passage, mais ne reconstitue pas la géométrie de chaque objet photographié. Les faces cachées des meubles restent absentes et un déplacement latéral important déformerait les textures. Cette réalisation n'utilise pas de Gaussian splatting et ne prétend pas reproduire la scène volumétrique de la vidéo de référence.

## Images et cohérence

Le plateau conserve sa photographie. À la demande de Lou, le vidéoclub contraste désormais davantage avec le plateau : lumières cyan, néon rouge et matières graphite, tout en conservant la géométrie des rayons. Le fichier `/images/rooms/video-club-room-v2.webp`, inspecté avant intégration, mesure 1672 × 941 et pèse 292 866 octets. Il est utilisé dans la scène et dans la rubrique des projets. Sa revue finale dans le navigateur reste en cours.

Les classements, la Time Machine, le cinéma et le Radar reçoivent des décors générés : noyer, bleu nuit, métal sombre et lumière ambre. Le cinéma v2 remplace ensuite les cadres en perspective par six cadres rectangulaires de face, à la demande de Lou. Les écrans et cadres des nouvelles images restent vierges. Ces quatre pièces conservent leurs décors ; la correction de contraste porte sur le vidéoclub.

Les [fichiers, prompts et contrôles visuels](../site/six-rooms-artwork-2026-10-20.md) conservent la provenance des images. Les PNG sources restent dans le répertoire de génération ; les quatre WebP consommés par le site sont dans le dépôt.

## Adaptation et reprise

Mise à jour du 20 octobre : Lou demande ensuite une vérification mobile et desktop avec Playwright. La [recette responsive des six salles](../site/six-rooms-responsive-2026-10-20.md) décrit les corrections et les résultats. Les collections suivent le flux de la page jusqu'à 900 pixels de large et dans les cadrages de rapport inférieur à 6/5. Le rendu WebGL exige aussi ce rapport minimal ; les contenus HTML et la navigation restent disponibles dans les autres cas.

La correction et sa recette portent d'abord sur l'ordinateur, selon la dernière demande de Lou. Le moteur WebGL se charge à partir de 901 px, avec un pointeur fin et sans préférence de réduction des mouvements. Le bouton de réduction des mouvements utilise le parcours de remplacement. Les photographies et contenus HTML fournissent un accès sans rendu WebGL. La recette couvre les tailles mobiles émulées dans Edge ; elle ne remplace pas une vérification sur iOS et Android physiques.

Avec JavaScript, le sélecteur « Les pièces », dans le volet « Explorer les pièces » placé après la scène, donne accès aux six destinations. Entrée ouvre le volet et Échap le ferme. L'annulation d'une traversée lancée depuis ce volet restitue le focus à sa commande visible. L'adresse mémorise la pièce dans `#room-…` ; le retour navigateur restaure la pièce précédente. Sans JavaScript, une navigation `noscript` fournit six liens natifs vers les rubriques. Les routes de contenu et les règles de localisation restent en place.

La navigation au clavier permet de choisir une destination puis de déclencher le passage sans souris. Après une entrée déclenchée au clavier, le titre de la pièce reçoit le focus. Échap annule le passage ou l'aperçu et restitue le focus au déclencheur. Les commandes deviennent inertes pendant la traversée. La recette WebGL a vérifié le choix au clavier, le focus à l'arrivée, Échap pendant le trajet et le retour navigateur.

Le moteur annule les mouvements lors de la perte de focus, lorsque l'onglet est masqué ou lorsque la scène quitte la zone visible. Il libère ses ressources au démontage. Une perte de contexte WebGL rétablit le décor fixe ; une image manquante ne retire pas les liens. Si le chargement d'une destination échoue pendant une entrée, le contrôleur ouvre sa rubrique existante.

Les décors sont chargés à la demande puis conservés pendant la visite. Le ratio de pixels du canvas est plafonné à 1,5. La boucle de rendu s'arrête lorsque la caméra est stable et qu'aucun portail n'est ouvert. Ces dispositions ne constituent pas une mesure de performance sur appareil physique.

## Vérification et livraison

La [recette du lot](../site/six-pieces-recette-2026-10-20.md) distingue le code réalisé, les contrôles effectués et les vérifications encore en cours. Les nouveaux contenus doivent préserver les états vides, les médias réels, les routes localisées et l'accès aux rubriques sans WebGL.

La recette initiale de disposition sur ordinateur comptait 25 cas réussis : six pièces à trois dimensions de fenêtre, six cas avec texte agrandi à 200 % et un cas sans JavaScript. Les 79 tests ciblés passent, dont la continuité du changement de repère avec rotation. La recette WebGL passe également : aperçu à gauche, à droite et en bas de l'image, visite des six salles, navigation clavier, retour navigateur, Échap, scroll et ouverture par hash, sans erreur navigateur relevée. Les contrôles ultérieurs figurent dans la recette responsive et dans le complément de corrections du 20 octobre.

Travail local uniquement. La demande ne constitue pas une autorisation de commit, push, PR ou déploiement.

Les corrections demandées ensuite par Lou (portail fixe, inscription sur le bureau, navigation et allègement du bloc équipe) sont suivies dans [le complément de recette](../site/six-pieces-corrections-2026-10-20.md). Le paragraphe de présentation générique et la liste de prénoms dans l'en-tête de l'équipe sont supprimés ; les portraits et biographies restent en place.
