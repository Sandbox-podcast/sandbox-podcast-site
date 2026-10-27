# Préparation des guides

Les routes `/guides` et `/guides/[slug]` servent les guides documentaires sur les skills depuis le 20 octobre, selon [DD-0072](../design-decisions/DD-0072-guides-seo-skills.md). Leur contenu se trouve dans `src/domain/skill-guides.ts`. La [reprise du 26 octobre](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/guides-lisibilite-2026-10-26.md) explique la nouvelle présentation et les vérifications.

Le catalogue `apps/site/content/guides.json` reste vide. Il concerne les futurs guides tirés des épisodes, distincts des guides documentaires sur les skills.

Le schéma `src/domain/guides.ts` décrit un sujet, un résultat attendu, une audience, un niveau, un extrait YouTube, des étapes et des ressources HTTPS. `validateGuides` vérifie l'unicité des slugs et la présence de l'épisode associé parmi les épisodes publiés avec vidéo. Le gabarit `GuideArticle` réutilise le lecteur à la demande et propose le retour à l'épisode complet.

Pour publier un guide tiré d'un épisode, préparer un premier contenu à partir d'un extrait réellement publié, puis le relire. Prévoir son intégration aux routes existantes, à la recherche et au sitemap ; vérifier le niveau affiché, le lecteur, les sources, les métadonnées et le retour vers l'épisode. La revue humaine confirme le contenu et la disponibilité de la vidéo ; le schéma ne prétend pas vérifier YouTube à distance.
