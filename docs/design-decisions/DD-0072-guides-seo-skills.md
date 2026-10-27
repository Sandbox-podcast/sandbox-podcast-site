# DD-0072 : guides de choix des skills Claude, ChatGPT et OpenAI

20 octobre 2026. Décision prise par l’agent sur délégation (PD-0003), à la demande de Lou de travailler le référencement des recherches « meilleurs skill Claude », « meilleurs skill ChatGPT », « meilleurs skill OpenAI » et « meilleurs skill Anthropic ».

## Décision

Ajouter un hub `/guides` et trois guides français indépendants des éditions de classement :

- `/guides/meilleurs-skills-claude` traite Claude et Anthropic ensemble, avec six ressources du dépôt officiel et leurs usages.
- `/guides/meilleurs-skills-chatgpt` présente quatre modèles de procédures à configurer, en distinguant skills, plugins et connecteurs. Ils ne sont pas présentés comme des plugins existants ou déjà installables.
- `/guides/meilleurs-skills-openai` traite le choix des skills pour Codex, avec leurs prérequis et leurs sources.

Chaque guide comporte une revue documentaire datée, des limites, une procédure d’installation et des essais proposés. Aucun essai n’est présenté comme exécuté. L’ordre des options ne constitue pas un palmarès. Les classements d’adoption, leurs archives et les conditions de publication des collections spécialisées restent soumis à ADR-0020 et aux méthodes de classement.

Le vocabulaire « meilleurs » désigne la question de choix à laquelle répond le guide. Il n’introduit aucun score de qualité, avis d’utilisateur, test comparatif inventé ou classement éditorial des candidats. Un futur palmarès fonctionnel devra publier son protocole et ses résultats.

## Découverte et indexation

Le hub est lié au pied de page, les trois guides au hub et au classement Skills français, puis les guides entre eux. Leur contenu complet est rendu côté serveur. Les canoniques sont propres à chaque page et le sitemap porte la date de revue documentaire, sans la recalculer à chaque visite.

Ces contenus éditoriaux sourcés peuvent être indexables même sans édition live des classements, comme la chronologie documentée. Leur indépendance est vérifiée dans un test du sitemap. Aucune variante traduite ni aucun `hreflang` n’est créé. Les liens français depuis les autres langues sont identifiés comme tels. Les routes de collection `/charts/skills/[platform]` et les archives conservent leur fonctionnement.

Les données structurées décrivent un `Article`, son auteur institutionnel Sandbox, ses citations et son fil d’Ariane. Le hub est une `CollectionPage`. Aucun balisage de note ou de faux avis n’est ajouté ; les questions fréquentes restent du contenu visible.

## Limites

Les sources sont revues le 20 octobre ; l’exécution effective des skills et la disponibilité des fonctionnalités dans chaque compte ne sont pas attestées. Ces guides ne garantissent ni indexation ni position. Le déploiement, Search Console et les premiers résultats restent à confirmer séparément.

Voir le [rapport SEO et les vérifications](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/seo-skills-2026-10-20.md).
