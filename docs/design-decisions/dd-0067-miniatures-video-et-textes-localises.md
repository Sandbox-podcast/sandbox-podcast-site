# DD-0067 Miniatures vidéo et textes localisés

Date : 20 octobre 2026. Décidée par l'agent sur délégation (PD-0003), à la demande de Lou de compléter les traductions des vidéos et de leurs miniatures.

## Constat

Le titre et le résumé de l'épisode 2 apparaissaient en français dans les pages anglaises, espagnoles et allemandes. Les affiches des replays contiennent aussi du texte français dans leurs pixels. Le dictionnaire traduit le texte HTML ; il ne transforme pas les mots présents dans une image.

## Décision

Les vues françaises conservent leurs miniatures actuelles. Pour l'anglais, l'espagnol et l'allemand, le site compose les vignettes en HTML : portraits recadrés dans les affiches existantes, numéro d'épisode et légende courte traduite. Le recadrage exclut le bandeau français de l'affiche. Les fichiers sources restent intacts et communs aux langues. Aucune image traduite n'est générée et aucune modification n'est envoyée à YouTube.

La composition est commune aux affiches de l'accueil, aux replays, aux cartes et à la façade du lecteur. Pour une vidéo sans portrait connu, la vignette utilise une composition typographique avec son titre localisé. Les petites vignettes masquent leur légende si la place manque ; le titre complet reste affiché et traduit à côté, ainsi que dans le nom accessible du lien ou du lecteur.

Les pages podcast et épisode précisent que les vidéos sont en français. Le choix de langue change les textes de présentation du site ; il ne promet ni doublage ni sous-titres disponibles chez YouTube.

L'export des traductions reprend désormais les chapitres et les libellés de ressources calculés depuis la description, avec les mêmes fonctions que la fiche publique. Les champs explicites étaient déjà exportés, mais certains libellés visibles extraits de la description manquaient. Les nouvelles traductions suivent toujours le parcours manuel défini dans ADR-0022. Aucun service de traduction payant ou automatique n'est ajouté.

## Validation et limites

Les tests couvrent les titres, résumés, ressources et vignettes dans les trois langues, la conservation de la miniature française, le repli pour une vidéo inconnue et le lecteur sans chargement YouTube avant clic. La recette Chromium vérifie l'accueil, le podcast et l'épisode 2 à 320, 390 et 1440 pixels. Les captures ont été relues pour contrôler le recadrage des portraits et l'absence de bandeau français.

Un titre éditorial modifié ou un nouvel épisode peut encore manquer au dictionnaire jusqu'au prochain lot manuel. Le site conserve alors sa source. Le texte déjà présent dans le lecteur YouTube après son ouverture relève de YouTube et ne peut pas être traduit par le dictionnaire du site.
