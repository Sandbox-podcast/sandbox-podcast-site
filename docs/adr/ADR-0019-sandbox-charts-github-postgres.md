# ADR-0019 : collecte GitHub et éditions SANDBOX CHARTS

Date : 2026-10-07. Statut : accepté pour l'implémentation locale. Décision : décidée par l'agent sur délégation (PD-0003), à partir des deux briefs SANDBOX CHARTS du propriétaire.

Le site utilisait des snapshots simulés dans Git. Le nouveau classement GitHub doit reposer sur des relevés quotidiens et conserver chaque édition publiée. La base Neon, Drizzle et les rôles du backoffice existent déjà.

## Décision

Réutiliser Postgres avec un catalogue commun `chart_entities`, une extension `github_projects`, des relevés `github_daily_snapshots`, des éditions `weekly_chart_editions`, leurs positions `weekly_rankings`, une configuration et les journaux des jobs. La migration 0002 ajoute ces tables sans modifier les migrations précédentes.

Les relevés et positions sont immuables. Des triggers interdisent UPDATE et DELETE. Une édition figée peut passer une seule fois de brouillon à publiée ; sa configuration, son payload et son horodatage de gel restent inchangés. La contrainte `(chart, semaine)` rend une relance idempotente. Les triggers ne remplacent pas une sauvegarde de la base.

L'éditorial vit dans `charts_editorial`, par édition et couche brouillon/publiée. Un ETag et un verrou de l'édition empêchent les écrasements concurrents. Le propriétaire peut modifier la catégorie, le statut de suivi et la mise en avant d'un dépôt. Aucune route admin ne permet d'éditer les compteurs GitHub.

Le client GitHub valide REST et GraphQL avec Zod. La découverte recherche des sujets IA ; la collecte regroupe vingt dépôts par requête. Les jobs ont un budget de 220 secondes, un verrou par type et une reprise idempotente. Le cron hebdomadaire attend une collecte quotidienne terminée.

Le score utilise des percentiles bornés, un plancher de croissance et une renormalisation explicite des poids manquants. La version, la configuration, les valeurs brutes, les composantes et la couverture sont conservées dans l'édition. Le départage utilise le score, les stars gagnées puis le slug.

## Conséquences

La première édition attend un relevé à J−7 et vingt projets éligibles par défaut. Rising attend aussi J−14 et une accélération positive ; il peut contenir moins de vingt projets. Les collectes manquantes restent absentes. Une panne ou un dépôt devenu privé ne supprime aucun historique.

Les fixtures Git restent disponibles pour l'aperçu en développement, uniquement sans base configurée et avec une mention visible. Les routes publiques de données utilisent toujours Postgres. La production n'utilise aucun classement simulé comme secours.

Skills et Models disposent de leur interface. Leur collecte réelle et leurs formules restent à connecter. Le catalogue commun permet cette extension sans assimiler leurs métriques aux stars GitHub.

L'implémentation ne crée pas de compte, de secret ni de déploiement. L'activation exige la migration, les variables serveur et l'autorisation de livraison du propriétaire. Voir [le guide d'exploitation](../site/sandbox-charts.md) et [la méthode](../sandbox-charts-methodology.md).
