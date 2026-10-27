# DD-0052 Périmètre de SANDBOX News

- Date : 2026-10-18
- Statut : périmètre validé par Lou ; automatisation de production décidée par l'agent sur délégation (PD-0003), consignée dans [DD-0057](dd-0057-automatisation-production-news.md)
- Origine : les deux cahiers des charges transmis dans cette conversation et la réponse "B. IA + Développement".

## Périmètre validé

SANDBOX News couvre l'IA, GitHub, l'open source, la programmation et les outils techniques. Les nouvelles importantes du développement entrent dans ce périmètre, y compris sans lien direct avec l'IA. La sélection reste fondée sur la nouveauté, les faits disponibles et l'intérêt concret.

Une actualité correspond à un événement et à une phrase cliquable vers sa source originale. Le flux vise 15 à 30 actualités par jour sans quota imposé. Il est prévu en français, anglais, allemand et espagnol, avec une collecte horaire et une publication automatique après les contrôles éditoriaux.

Le second cahier des charges remplace les demandes contradictoires du premier : aucun backoffice complexe, aucune API IA payante ni utilisation des abonnements personnels comme backend. Le résumé et la traduction tournent sur CPU dans le runner GitHub. Les modèles évitent les frais d'inférence d'une API, mais les runners restent soumis aux quotas et aux conditions du compte GitHub.

## Intégration

Réutiliser le site et son identité SANDBOX. Le routage, les composants communs, PostgreSQL/Neon et GitHub Actions sont les points d'intégration examinés dans [l'audit](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/news-audit-2026-10-18.md). Le flux News a sa propre voie hors ligne : Qwen produit le texte français et Argos les traductions des trois autres langues. Le dépôt du code ne déclenche pas la collecte ni la publication en production.

L'autonomie éditoriale demandée concerne le fonctionnement après mise en service. L'application de la migration et l'activation des variables de production restent à effectuer après revue ; voir [la procédure DD-0057](dd-0057-automatisation-production-news.md).

## Suite

Le code ne traite une source comme accessible que si la collecte publique réussit. Après configuration, vérifier le premier cycle et mesurer la qualité des résumés et traductions sur des sorties réelles. Une fiche sans citations vérifiables reste exclue. Les limites et le statut de mise en service sont détaillés dans [DD-0057](dd-0057-automatisation-production-news.md).
