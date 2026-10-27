# ADR-0033 Optimisation des tâches planifiées

- Date : 2026-10-18
- Statut : modifications locales testées, activation distante non réalisée
- Déclenchement YouTube : décision explicite de Lou, un épisode hebdomadaire et un lancement manuel à son ajout.
- Conception des optimisations locales : décidée par l'agent sur délégation (PD-0003).

## Constat

Trois workflows existent : CI, rafraîchissement des classements et agent YouTube. Le projet Vercel est en Hobby ; sa page Cron Jobs ne liste aucune tâche. Le fichier actif `apps/site/vercel.json` est vide.

Le contrôle horaire des éditions et les poussées GitHub utilisaient deux runners distincts lorsque les poussées étaient activées. La collecte manuelle et la collecte programmée pouvaient se chevaucher, car leur verrou de workflow dépendait de l'événement. Le verrou global YouTube regroupait les tests de toutes les branches et le traitement de la chaîne.

Le dernier passage YouTube contrôlé ne disposait pas d'OAuth mais installait quand même les dépendances. Voir les [preuves et les limites de l'audit](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/news-audit-2026-10-18.md).

## Décision

1. Supprimer le cron YouTube toutes les 30 minutes. Le traitement se lance uniquement avec `workflow_dispatch`, sur la branche par défaut. Les tests à chaque push et PR sont conservés.
2. Vérifier la configuration YouTube avant le checkout et l'installation. Sans OAuth et sans demande d'écriture, produire un compte rendu explicite sans traitement. Une demande d'écriture exige OAuth, le journal Postgres et la validation initiale. Les contrôles applicatifs restent nécessaires après ce premier filtre.
3. Garder un verrou YouTube pour les traitements manuels, sans annuler un traitement actif. Les tests ont un verrou propre à leur référence et annulent leurs anciennes exécutions.
4. Mettre les poussées GitHub dans le job de contrôle horaire des classements, après le contrôle public. La condition `!cancelled()` autorise la collecte du signal même si l'édition est périmée. Un contrôle échoué reste un échec du job. Le signal reste soumis à son indicateur d'activation existant.
5. Donner le même verrou aux collectes manuelles et programmées des classements. Ne pas changer leurs deux créneaux quotidiens ni supprimer les contrôles de fraîcheur.
6. Mettre en cache les téléchargements pip du traitement YouTube.

## Intégration de News proposée

Utiliser le déclenchement horaire existant pour News, avec un job distinct de celui des classements et des secrets limités à ses besoins. L'échec d'un collecteur ne doit pas empêcher les autres jobs. La collecte et les traitements CPU de News s'exécuteraient sur le runner, puis écriraient dans la base existante. Aucun second planificateur horaire ni moteur IA dans Vercel n'est nécessaire pour cette proposition.

YouTube conserve son lancement manuel. CI garde ses contrôles à chaque push et PR : une PR teste notamment son intégration avec la branche cible. Leur suppression pour économiser des exécutions n'est pas retenue.

## Validation et portée

Les tests exécutent le vrai script Bash de précontrôle avec des identifiants fictifs, vérifient les prérequis d'écriture, l'absence de secrets dans les sorties et le conditionnement des étapes coûteuses. Ils contrôlent aussi le déclenchement manuel et les verrous. Les tests de découverte et du contrôleur de rafraîchissement restent inchangés.

Aucun réglage de compte, secret, migration, déploiement, commit ou push n'est effectué. Le cron distant YouTube reste donc actif jusqu'à la publication autorisée de ce changement. Le gain de temps après activation reste à mesurer ; retirer sa planification enlève 48 déclenchements théoriques par jour, sans prétendre que GitHub les exécutait tous.
