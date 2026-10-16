# Préparation des guides

Le catalogue `apps/site/content/guides.json` est vide. La refonte ne publie aucune page de guide et n'ajoute pas d'entrée vide au menu.

Le schéma `src/domain/guides.ts` décrit un sujet, un résultat attendu, une audience, un niveau, un extrait YouTube, des étapes et des ressources HTTPS. `validateGuides` vérifie l'unicité des slugs et la présence de l'épisode associé parmi les épisodes publiés avec vidéo. Le gabarit `GuideArticle` réutilise le lecteur à la demande et propose le retour à l'épisode complet.

Pour activer la rubrique, préparer un premier guide à partir d'un extrait réellement publié, puis le relire. Brancher le catalogue validé sur les routes `/guides` et `/guides/[slug]`, la recherche et le sitemap ; vérifier le niveau affiché, le lecteur, les sources, les métadonnées et le retour vers l'épisode. Ajouter le lien de navigation seulement lorsque ce premier contenu est prêt. La revue humaine confirme le contenu et la disponibilité de la vidéo ; le schéma ne prétend pas vérifier YouTube à distance.
