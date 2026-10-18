# ADR-0036 : isoler les identités Models en conflit pendant la collecte

Date : 2026-10-18. Statut : décidée par l'agent sur délégation (PD-0003).

La collecte Models annulait toute sa transaction dès qu'une référence désignait plusieurs fiches. Un seul conflit empêchait donc l'enregistrement des mesures de tous les autres modèles. L'issue [87](https://github.com/Sandbox-podcast/sandbox-podcast-site/issues/87) décrit ce blocage.

Le collecteur conserve les candidats contradictoires en attente et enregistre uniquement les identités distinctes. Il journalise chaque slug concerné, les fiches connues et les références du fournisseur. Toutes les partitions qui visent la même fiche ou partagent une même référence restent en attente : l'ordre du catalogue ne choisit jamais le gagnant.

La sauvegarde stricte reste le comportement par défaut. Le mode de collecte partielle prend le même verrou transactionnel avant la résolution des identités. Il consulte les fiches actives et exclues, préserve leurs sources et mesures, et ne crée aucune correspondance canonique. Si tous les candidats sont en conflit, le job échoue ; sinon les conflits donnent un résultat partiel.

Le gel continue d'appliquer les contrôles de couverture et de conflit du profil v3. Ses poids et son autorisation de publication restent inchangés. Collecter des mesures distinctes ne prouve ni la résolution des conflits restants ni la possibilité de publier un Top 20.

La commande de diagnostic `charts:identities` lit les références dupliquées, leurs fiches, volumes de mesures, dates et positions déjà publiées. Elle peut proposer de conserver une fiche déjà publiée quand les ensembles de références concordent exactement et qu'aucune exclusion ne s'y oppose. Le rapport indique toujours `approved: false` ; il ne contient aucune écriture SQL de réparation. La correspondance canonique et son application demandent une revue des variantes et des historiques.
