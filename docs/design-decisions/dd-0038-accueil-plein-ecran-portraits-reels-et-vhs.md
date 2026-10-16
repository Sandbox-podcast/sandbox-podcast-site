# DD-0038 : accueil plein écran, portraits réels et VHS photographiques

15 octobre 2026. Décision de conception décidée par l'agent sur délégation (PD-0003), selon les corrections explicites de Lou. Cette décision complète DD-0034 et remplace la composition du premier écran de DD-0037.

Lou demande un décor plein écran, avec les textes superposés, sans dégradé bleu ni mention "Le podcast IA & tech". Les trois animateurs doivent apparaître assis derrière la table, à partir de leurs vraies photos. Il refuse les visages recréés, les corps disproportionnés et les portraits présentés dans des cadres.

Le décor fourni par Lou couvre tout le premier écran. Les portraits sources sont affichés avec des masques qui retirent leur fond. Chaque portrait conserve son rapport largeur/hauteur, son visage, ses vêtements et son microphone. Le bord de la table masque le bas du buste. Aucun visage ni corps généré n'est affiché. La photo de Nicolas est la copie exacte du fichier actuellement servi sur la page À propos de production. Les images sources restent intactes.

Le titre et le paragraphe reprennent les textes fournis par Lou. Les traductions sont ajoutées aux trois dictionnaires. Les boutons YouTube et Spotify gardent les chaînes configurées. La sélection de projets présente Okodukai pour Lou, Song Maker pour Loïc et Sillage pour Nicolas.

La porte reste un easter egg : le libellé visible "Entrer" et son indication au survol sont retirés. Son nom accessible, le focus clavier et l'ouverture animée restent présents. L'entrée et le vidéoclub sont réservés au développement.

Lou demande aussi des VHS photoréalistes. Les rayons et la boîte ramassée utilisent une photographie générée de boîtier VHS épais, avec une jaquette propre à chaque projet. L'ouverture révèle une photographie de boîtier ouvert contenant une cassette VHS, ses fenêtres de bobines, son ruban et ses pièces moulées. Elle remplace le dessin CSS précédent. La fiche, ses sources et ses vidéos chargées au clic restent les mêmes.

Le cadrage s'adapte aux écrans étroits et au téléphone. Les personnes, la table et la porte restent dans le même plan de décor pendant les mouvements. La réduction des mouvements garde un accès immédiat.

[Sources, prompts, fichiers et validation](../site/refonte-2026-10-15/accueil-plein-ecran-et-vhs.md).

## Complément du 16 octobre 2026

Lou autorise explicitement de reconstituer les bouts d'épaules absents de Loïc et Nicolas, et demande de retirer les micros flottants devant les trois animateurs. Cette retouche limitée des bustes remplace l'interdiction de générer des morceaux de corps pour ces zones. Une première intégration superpose les têtes originales aux bustes. Lou signale ensuite les raccords visibles : la correction utilise chaque portrait retouché complet en une seule image, sans superposition au cou. Les photos sources restent intactes. L'intégration est décidée par l'agent sur délégation (PD-0003).

Voir les [assets, prompts et contrôles de la retouche](../site/refonte-2026-10-15/retouches-bustes-2026-10-16.md).

## Correction responsive et portraits complets

Le 16 octobre, Lou signale les personnes minuscules sur téléphone et la dispersion des éléments au format intermédiaire. La composition compacte s'applique jusqu'à 1100 pixels ; la taille des portraits dépend de la largeur visible et reste limitée par la hauteur. Le texte, les noms et les actions sont centrés sur le bureau. Les trois portraits retouchés complets remplacent les plans séparés, sans nouvelle génération. Les sources restent intactes ; les visages des variantes retouchées ne sont plus des copies pixel à pixel. Intégration décidée par l'agent sur délégation (PD-0003).

Voir le [rapport de correction](../site/refonte-2026-10-15/corrections-responsive-bio-2026-10-16.md).

## Alignement au-dessus des dossiers

Lou demande ensuite que les trois têtes dépassent légèrement des sièges et restent à la même hauteur sur tous les écrans. Le sommet visible des cheveux est mesuré dans chaque fichier transparent, puis ancré sur une ligne commune à 37,5 % de la hauteur du décor. Les dossiers commencent autour de 39,6 %. Les dimensions réelles des images remplacent les anciens cadres de composition. Les proportions sont conservées, et les corps restent masqués par le bord courbe du bureau. Sur écran étroit, une largeur minimale liée à la hauteur maintient le bas des bustes derrière la table. Correction décidée par l'agent sur délégation (PD-0003), sans nouvelle retouche des photos.

## Version sans chaises après rejet du rendu

Lou rejette le rendu précédent, où les personnes sont trop enfoncées derrière le bureau, puis autorise le retrait des chaises. Cette version remplace l'ancrage à 37,5 % ci-dessus : les personnes remontent pour montrer les épaules et le haut du buste. Leurs sommets restent alignés. Les chaises disparaissent du décor grâce à une retouche de leur seule bande, sous la porte et derrière le bureau. Les portraits existants ne sont pas régénérés.

Lou demande aussi que les personnes ne se chevauchent pas sur mobile. Chaque cadre occupe au plus 29 % de la largeur visible, avec des centres espacés de 32 %. Le positionnement vertical dépend de cette taille pour conserver le raccord au bureau. Mise en oeuvre décidée par l'agent sur délégation (PD-0003).

## Composition mobile distincte du plateau

Lou rejette ensuite la réduction du trio devant une table disproportionnée sur téléphone et demande une autre présentation. La composition mobile remplace désormais le plateau à 900 pixels de large ou moins, ainsi que sur les fenêtres en paysage de 1100 x 540 pixels au maximum. Elle présente le titre, trois portraits en plan rapproché avec leurs prénoms, le texte d'accroche et les actions. Le fond est uni, les cartes de portraits sont séparées et la hauteur suit le contenu. La table et le décor panoramique ne sont pas affichés dans cette variante. Les trois fichiers de portraits existants sont réutilisés sans retouche.

Le vidéoclub reste accessible par une petite porte sans texte visible, avec une cible tactile de 44 pixels et un nom accessible. Sur cette composition, la navigation est directe ; l'ouverture dans le décor reste réservée à la scène de bureau. Le plateau reste affiché sur grand écran. Conception décidée par l'agent sur délégation (PD-0003), à la demande de Lou. Ce choix remplace les tentatives précédentes de proportionner le plateau aux écrans étroits.

## Miniature commune et vignette de la porte sur mobile

Lou préfère ensuite une présentation de type miniature vidéo. Les trois cartes séparées sont remplacées par un seul cadre 16:9 : portraits existants, fond du studio recadré au-dessus de la table, marque Sandbox et accent doré. La miniature entière ouvre le dernier épisode disponible, ou la page podcast en l'absence d'épisode. Aucun fichier photo n'est régénéré.

Lou demande une image de la porte sous les boutons YouTube et Spotify. Une seconde vignette, au format 2:1, reprend le décor avec un cadrage centré sur la porte. Elle remplace la petite icône dans la miniature et ouvre le vidéoclub. Ce lien conserve la condition d'activation locale du vidéoclub. Les deux vignettes sont masquées sur la composition de bureau. Mise en oeuvre décidée par l'agent sur délégation (PD-0003), selon les demandes explicites de Lou.

## Refonte éditoriale mobile et épisode local restauré

Lou rejette le rendu mobile et demande une composition plus soignée. La V10 retire le logo Sandbox répété et le bouton de lecture doré de la miniature. Le titre est aligné à gauche, la photographie occupe la largeur disponible et les trois portraits restent dans des colonnes distinctes. Le cadrage plus court cache la fin des bustes. Les boutons utilisent des formes sobres, les plateformes sont séparées par un filet et la porte conserve sa vignette sous ces liens.

La suite de l'accueil adopte des titres en Newsreader et des biographies avec un portrait compact à côté du nom. Les projets gardent leurs visuels et leur sélection. Le plateau sur ordinateur conserve sa composition. Cette direction est décidée par l'agent sur délégation (PD-0003). Aucun visage ni fichier photo n'est modifié.

Le pilote absent du catalogue local est restauré depuis la copie locale des contenus publiés, dans le stockage de développement ignoré par Git. Les biographies et projets actuels sont conservés. Aucun changement de publication en production.
