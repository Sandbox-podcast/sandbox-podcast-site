# DD-0033 : accueil cinématique et trio sur un plateau télé

15 octobre 2026. Décidée par l'agent sur délégation (PD-0003), à partir des corrections de Lou. Cette décision complète [DD-0032](DD-0032-accueil-marque-et-plateau.md) pour le visuel, le titre et le mouvement de l'accueil.

Lou demande une arrivée marquante dans l'esprit des expériences de [Scrolltide](https://www.scrolltide.co/), centrée sur les trois animateurs. Il rejette un premier montage trop serré, décalé à droite et dont les corps sont disproportionnés par rapport à la table. Il demande ensuite un fond de studio de télévision.

Le premier écran présente " L'IA, en pratique. ", la précision " Le podcast IA & tech " et une phrase concrète : " On teste des outils. On construit des projets. On en parle ensemble. " Les prénoms et l'action vers le dernier épisode complètent ce seul message. Le dernier replay reste la seule section suivante.

Le nouveau photomontage utilise les portraits existants de Lou, Loïc et Nicolas. Le trio est centré, espacé et assis derrière une grande table. Le fond comporte un mur LED bleu, une structure d'éclairage visible et un plateau surélevé. Les fichiers sources restent intacts. La légende " Plateau provisoire · photomontage " reste visible : les corps, les poses et le décor sont générés, et cette image ne représente pas une séance photo réelle. Voir la [provenance du visuel](../site/refonte-2026-10-15/plateau-provisoire.md).

Sur ordinateur, une courte progression au défilement rapproche le décor de 12 % au maximum, déplace légèrement le titre et ouvre des marges. Le défilement reste natif et réversible. Le bouton de réduction des mouvements désactive cet effet. Le contenu est rendu côté serveur ; un seul composant client calcule la progression lors d'un défilement ou redimensionnement, sans boucle permanente. Aucune bibliothèque d'animation supplémentaire n'est installée.

Sur mobile et avec `prefers-reduced-motion`, la scène reste statique. Le cadrage mobile conserve les trois personnes et réserve une place distincte à la légende, aux prénoms et au bouton. Le rappel des préférences de mesure passe en fin de page sur cet accueil pour ne pas recouvrir l'action ; le panneau initial et le mécanisme de consentement restent en place.

Cette version reste une image avec un mouvement de cadrage, pas une scène 3D navigable. L'étape suivante dépend du plateau définitif et de ses ressources. Les captures et contrôles sont consignés dans le [rapport de validation](../site/refonte-2026-10-15/validation.md). La qualité artistique et la ressemblance du photomontage restent à relire avec Lou en localhost.
