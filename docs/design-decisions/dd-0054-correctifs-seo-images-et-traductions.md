# DD-0054 : images de l'accueil et traductions des fiches projet

18 octobre 2026. Correctifs locaux à la suite de l'audit SEO, pendant l'attente de la validation DNS Search Console.

Conception décidée par l'agent sur délégation (PD-0003).

L'image du vidéoclub, identifiée comme LCP mobile dans le rapport PageSpeed, passe en chargement immédiat avec une priorité élevée. Un élément `picture` sélectionne un pixel embarqué lorsque le CSS masque ce visuel au profit du plateau desktop. Son media reprend les mêmes conditions de largeur et de hauteur, y compris les petits écrans horizontaux. Le navigateur ne précharge pas la grande image mobile pour le plateau.

Les portraits illustrés et les trois couvertures de projets de l'accueil passent de la qualité 90 à 75 dans l'optimiseur Next. Le logo indique sa largeur d'affichage maximale avec `sizes`, afin que le navigateur choisisse une variante adaptée. Les sources, les dimensions de mise en page et les images du plateau sont conservées.

Les titres localisés des 34 fiches projet sont assemblés après traduction de leur accroche, tout en conservant le nom propre. Les 132 libellés de fonctionnalités absents sont ajoutés aux dictionnaires anglais, espagnol et allemand ainsi qu'au catalogue de sources. Les URL, canoniques, autorisations d'indexation et choix de consentement restent inchangés.

Les mesures de poids sont des comparaisons de réponses WebP de l'optimiseur local. Elles ne prouvent aucun gain de LCP en production. La relecture native des traductions n'est pas revendiquée. La publication, les commits, pushes et PR restent soumis aux instructions du dépôt.

Voir le [rapport des correctifs](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/seo-2026-10-18/correctifs-locaux.md) pour les preuves, tests et limites. La demande de validation Search Console reste préparée ; le code IONOS transmis lors de la reprise n'a pas été accepté et aucun DNS n'a été modifié.
