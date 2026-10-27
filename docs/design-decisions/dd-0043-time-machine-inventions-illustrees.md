# DD-0043 : Time Machine, inventions illustrées et lecture progressive

Date : 2026-10-16. Décision : décidée par l'agent sur délégation (PD-0003), à la demande de Lou.

L'explorateur utilise un rail inspiré des Expanded Cards de Scrolltide. Cinq cartes illustrées sont visibles sur ordinateur. La carte sélectionnée s'élargit, avec une date proéminente en haut, puis le titre court et le résumé au bas de l'image. Les autres cartes restent des lamelles. La légende garde sa largeur pendant la transition. Le contexte, le titre complet et les sources se déplient sous le rail dans un élément details natif. Le résumé scientifique reste intégral pour conserver les conditions du résultat.

Le survol à la souris, le clic, le toucher et le clavier sélectionnent une carte. Un pointeur immobile ne déclenche pas une sélection par le seul déplacement de la mise en page. La fenêtre reste stable tant que la sélection appartient à ses cinq cartes, puis avance aux bornes. Sur mobile, la carte active occupe toute la largeur ; deux vignettes de 64 pixels de haut donnent accès aux voisins en dessous. Les commandes précédent et suivant restent près de la fiche, avec des cibles de 44 pixels. Le curseur temporel reste visible. La courbe cumulative devient un niveau de lecture secondaire, fermé au chargement, avec son accès clavier conservé. Les filtres par période, année, catégorie, recherche et jalons restent disponibles.

Les archives annuelles présentent des cartes illustrées. Chaque carte conserve son titre complet, son résumé, son contexte et toutes ses références dans le HTML initial, derrière un détail natif. La lecture sans JavaScript garde donc les textes et les sources. Les images sont des représentations de concept, pas des documents historiques.

Après la correction de Lou sur les images répétées, chaque événement possède sa propre affiche vectorielle. Les 151 fichiers et leurs compositions sont distincts. Onze logos issus de sources officielles identifient les éditeurs concernés ; les modèles portent des identifiants courts et des versions réelles. Les géométries représentent leur sujet sans prétendre décrire une architecture réelle. Voir [la collection finale et sa provenance](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/time-machine-affiches-distinctes-2026-10-16.md). Les 19 images partagées de la première passe ne sont plus utilisées.

Le récapitulatif annuel conserve ses chiffres calculés, ses événements, ses partages et ses exports SVG et JSON. Ses jalons reçoivent les mêmes illustrations. Aucun événement ni fait du corpus n'est modifié.

Un fond étoilé décoratif accélère brièvement quand la date sélectionnée change, puis revient à un rendu immobile. Le bouton de réduction des animations, la préférence système, un onglet masqué et une vue annuelle arrêtent ce mouvement. La lecture automatique reste volontaire.

La date de la carte ouverte devient un repère visuel principal : une grande année, accompagnée du jour et du mois disponibles, dans une zone contrastée en haut de l'image. L'élément time conserve la date documentée complète et sa précision. Les années des cartes repliées restent visibles. Le petit numéro de position disparaît de la carte ouverte sur téléphone pour laisser la priorité à la date.

Le lot reste local. Aucune publication, commit, push ou nouvelle PR n'est inclus dans cette décision.

Correction explicite de Lou pendant la refonte : la ligne de métadonnées de l'en-tête est retirée (nombre d'événements, nombre de sources, plage d'années et date de revue). La provenance et la date de vérification restent dans le volet Sources et méthode. Les filtres conservent les années nécessaires à la navigation.

Le doublon de plage d'années au-dessus de la fiche est aussi retiré. La plage reste dans le sélecteur de filtres.

La route ne conserve pas de frontière loading.tsx : le corpus local est immédiatement disponible. Cela évite que le flux Suspense masque les fiches derrière un ancêtre caché lorsque JavaScript est désactivé. Les détails natifs et les sources restent alors consultables.

Retouche demandée par Lou le 16 octobre : les flèches précédent et suivant sont intégrées aux côtés du carrousel, en surimpression sur les visuels. Sur mobile, elles restent dans la grande carte, au-dessus des vignettes voisines. Les commandes conservent leur nom accessible, leur focus clavier et leur désactivation aux bornes. Le partage reste sous les cartes. Le contrôle Playwright vérifie leur position réelle et une cible tactile d'au moins 44 pixels aux quatre tailles.
