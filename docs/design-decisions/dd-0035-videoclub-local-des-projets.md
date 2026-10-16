# DD-0035 : Vidéoclub local des projets

- Date : 2026-10-15
- Statut : prototype local
- Demande de Lou : tester une autre vue des projets, dans un vidéoclub des années 1990-2000. Avancer vers une cassette, la ramasser et ouvrir sa boîte pour accéder au projet et à ses médias.
- Conception décidée par l'agent sur délégation (PD-0003).

Le prototype utilise `/nos-projets/video-club`. Il répond 404 hors du serveur de développement et porte `noindex, nofollow`. Le catalogue courant, ses fiches et la navigation publique restent les points d'entrée publiés.

Le décor est construit en HTML et CSS 3D : murs, plafond, moquette, rayonnages, comptoir, téléviseur cathodique et enseigne. La caméra passe de l'entrée à la vue d'ensemble, puis aux rayons de Lou, Loïc et Nicolas. Les déplacements suivent des positions prédéfinies. La déambulation libre et les collisions ne font pas partie de cet essai.

À la demande de Lou, le 15 octobre 2026, le décor principal devient photoréaliste. Une image générée avec l'outil ImageGen intégré représente le magasin, avec neuf compartiments vides. Les VHS et les libellés des rayons restent des éléments HTML, alignés sur les étagères et déplacés avec la même caméra. L'ancien décor CSS sert de repli si l'image ne charge pas. Cette intégration locale est décidée par l'agent sur délégation (PD-0003). L'image est un décor fictif, pas la photographie d'un lieu réel. [Provenance et prompt](../site/video-club-image.md).

Une cassette représente chaque entrée du catalogue validé existant. Les jaquettes réutilisent ses médias ; les éléments VHS sont un habillage de présentation. Les cassettes décoratives rangées sur la tranche ne représentent aucun projet supplémentaire. Aucun média de produit n'est inventé.

La sélection avance vers le rayon et présente la boîte. Son couvercle pivote pour révéler une VHS, puis affiche les données de la fiche, les captures et les vidéos. La galerie et son lecteur restent partagés avec le catalogue courant. Aucun lecteur vidéo ne démarre à l'entrée ou à l'ouverture d'une fiche.

Une recherche et une liste offrent un accès direct. Les boutons de navigation fonctionnent au toucher. Les flèches fonctionnent lorsque le décor a le focus. La boîte utilise un dialogue natif, se ferme avec Échap et rend le focus au bouton de sélection. La préférence de réduction des mouvements retire les transitions et l'attente d'ouverture.

Aucune dépendance, collecte, migration ou dépense ajoutée. Aucun commit, push, PR ou déploiement demandé pour cet essai.

Utilisation et validation : [guide du vidéoclub](../site/video-club.md).
