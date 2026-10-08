# DD-0005 : navigation et lecture sur l'ensemble du site

Date : 2026-10-08. Décision : décidée par l'agent sur délégation (PD-0003), à la demande du propriétaire.

Le site conserve la charte bleu nuit et cyan, le thème rouge et crème et les podcasts au premier plan. Le titre de l'accueil et les titres intérieurs prennent moins de place. L'en-tête associe le logo au nom du média. La rubrique active suit les pages de détail : un thème appartient aux podcasts, un modèle ou un projet aux classements.

La bibliothèque présente chaque épisode une fois. Une recherche locale, des filtres par thème et un tri par date ou durée remplacent les listes répétées. Les cartes restent rendues sur le serveur ; le navigateur reçoit seulement les informations nécessaires au filtrage et leur rendu. Les rails de l'accueil conservent le défilement tactile et ajoutent des commandes utilisables au clavier lorsqu'ils débordent.

Les fiches proposent des liens directs vers leurs sections. Dans les épisodes, les chapitres cliquables ouvrent la vidéo au bon instant si son identifiant existe. Sans vidéo, la fiche indique sa disponibilité. Les recherches et les fiches de projet utilisent les ancres réelles des ressources.

La recherche globale propose des catégories avec leur nombre de résultats. La requête et la catégorie restent dans l'URL. Les états vides donnent un chemin de reprise. Le pied de page donne accès à la recherche, aux thèmes, au flux RSS et au thème visuel. La recherche et le choix du thème restent masqués dans l'en-tête mobile, conformément à DD-0003.

À la demande du propriétaire, le changement de langue associe un petit drapeau au libellé : France pour FR, Royaume-Uni pour EN. Les drapeaux sont des SVG intégrés pour assurer leur affichage sous Windows. Le nom de la langue reste annoncé aux lecteurs d'écran et le bouton conserve une hauteur tactile de 44 px. Le changement de langue reste visible dans l'en-tête mobile.

Les classements conservent leur direction graphique. Un sommaire relie les sections d'une édition, les filtres ont une zone tactile plus grande, et une catégorie vide permet de revenir à toutes les entrées. Les méthodes et les archives ont des repères de navigation. Les tableaux larges restent dans une zone défilante accessible au clavier.

Le studio utilise les mêmes champs, boutons et repères. La connexion permet d'afficher le mot de passe. Une erreur de chargement propose une reprise, les sélections sont annoncées aux outils d'assistance et le pied de page public ne prolonge plus l'espace d'administration. Les permissions serveur et la publication restent régies par les décisions existantes.

Les choix restent locaux et réversibles. Aucun changement de données, de migration ou de compte n'est requis. La validation est consignée dans [le rapport UI/UX](../site/ui-ux-2026-10-08.md).
