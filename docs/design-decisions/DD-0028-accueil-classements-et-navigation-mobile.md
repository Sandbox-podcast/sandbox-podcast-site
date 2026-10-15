# DD-0028 : classements en tête de l'accueil et navigation mobile

Date : 2026-10-15. Demande de Lou : corriger les problèmes mobiles et placer le classement en premier sur l'accueil.

L'accueil affiche le classement interactif avant le podcast et sa bibliothèque, dans les quatre langues. Il réutilise le composant de la rubrique Classements : collections, filtres, éditions, détails et liens vers les fiches. Les paramètres de sélection restent dans l'URL et sont restaurés au rechargement. Une sélection filtrée reste en noindex. Sandbox Charts devient le titre principal ; l'épisode utilise un titre de niveau 2.

Cette demande remplace l'ordre de l'accueil et le retrait des classements décrits dans DD-0003. Les sources, les scores, la publication et les permissions restent ceux des parcours existants.

Conception décidée par l'agent sur délégation (PD-0003) : jusqu'à 1024 pixels, les liens de navigation passent dans un menu dépliable, à côté du logo et de la langue. Les liens gardent une hauteur tactile de 48 pixels. Le menu contient aussi la recherche, se ferme après navigation et répond à Échap. Les classements précèdent les podcasts dans la navigation.

Les lignes de classement mobiles répartissent le rang, le nom, la mesure et le détail sur quatre colonnes. Le mouvement se place sous la mesure pour laisser davantage de largeur au nom. Les sélecteurs gardent une police de 16 pixels. Les titres longs des épisodes et leurs boutons se répartissent sur plusieurs lignes.

Time Machine est traitée dans une autre tâche à la demande de Lou. Les changements de cette rubrique et leur validation ne font pas partie de cette décision.

Les vérifications Playwright utilisent localhost et des données de test isolées. Aucune publication, migration distante, création de compte réel, commit ou push n'est inclus.
