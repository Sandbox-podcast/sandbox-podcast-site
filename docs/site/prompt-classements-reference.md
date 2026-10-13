# Prompt de conception, audit et reprise des classements

Copier le bloc suivant dans le harnais du responsable du projet. Le périmètre est `apps/site`. Lire aussi [la conception](reference-ranking-design.md), [la configuration](reference-ranking-operations.md), ADR-0026 et ADR-0027.

```text
Tu reprends SANDBOX CHARTS pour en faire un classement international vérifiable des projets open source sur GitHub, des skills et des modèles IA. L'ambition est d'en faire une référence mondiale. Ne présente pas cette ambition comme une reconnaissance déjà acquise.

Lis intégralement AGENTS.md, apps/site/AGENTS.md, README.md, docs/README.md, docs/open-questions.md, les ADR liés aux classements et les documents reference-ranking-design.md et reference-ranking-operations.md. Préserve les modifications locales sans rapport et l'archive old/. Les décisions de conception sont déléguées par PD-0003 ; les accès, dépenses, publications et changements de production suivent les autorisations du propriétaire.

1. Audite les données et le parcours complet.
Inspecte découverte, normalisation, identité des variantes, doublons amont, fraîcheur, échantillons, poids, données absentes, gel, API, interface et historique. Vérifie les comportements sur Postgres et le refus des publications non autorisées. Distingue ce qui est implémenté, configuré, réellement collecté et publiable.

2. Garde des classements aux objectifs précis.
GitHub mesure la progression et les pratiques des projets open source de tous domaines. Rising mesure leur accélération. Skills mesure l'adoption et les signaux de maintenance, avec une limite explicite tant qu'il n'existe pas d'évaluation de réussite par tâche. Models compare des variantes exactement identifiées avec plusieurs formes d'évaluation. Ne mélange pas modèle nu, système agentique, quantification, effort de raisonnement, coût et popularité dans un rang prétendument universel.

3. Construis un registre de sources examinées.
Pour chaque source : producteur réel, protocole, version, échantillon, unité, fenêtre, langues, identité exacte, conditions d'accès et de redistribution, fraîcheur, biais, dépendances avec les autres sources et rôle de découverte ou de scoring. Un miroir ne reçoit pas une voix de plus. GitHub Trending découvre des candidats ; ses événements ne doublent pas ceux de GitHub. Examine notamment LiveBench et les résultats SWE-bench à protocole fixe avant d'ajouter leurs adaptateurs. N'annonce aucune intégration absente.

4. Calibre les coefficients avec des preuves.
Le moteur v3 utilise des budgets de familles fixes, puis une puissance de source fondée sur pertinence, rigueur, reproductibilité et résistance à la manipulation. Les poids initiaux sont des a priori à examiner. Constitue un historique réel, mesure la couverture et le chevauchement des benchmarks, compare des scénarios et documente les choix. Évite d'optimiser les poids pour obtenir un gagnant attendu. Publie les analyses de sensibilité, sans appeler leurs bornes des probabilités.

5. Contrôle les candidats incomplets.
Normalise sur le pool admissible de chaque source avant intersection. Ne remplace jamais une mesure absente par zéro et ne redistribue pas ses poids au bénéfice d'un candidat. Calcule la borne haute des candidats incomplets. Refuse un gel si l'un d'eux pourrait entrer dans le Top. Une panne doit laisser une attente explicite, pas une édition fabriquée.

6. Détecte tôt les poussées GitHub.
Utilise nos observations horodatées pour les fenêtres 1 h, 6 h et 24 h. Respecte les baselines réelles, les petits dénominateurs, les changements d'identité et les quotas. Le pool surveillé et sa fréquence doivent être publiés. Les signaux peuvent alimenter le suivi puis Rising ; ils restent distincts du rang de référence. Pour mesurer une avance sur Trending, compare le signal à ses présences observées et publie les limites de l'échantillonnage. Ne promets pas de détecter chaque projet avant GitHub.

7. Rends chaque édition vérifiable.
Conserve données brutes, profil, dates, mappings, contributions, couverture, exclusions, sensibilité, version et empreinte. Utilise la CLI de rejeu et l'API publique des preuves. Ne réécris aucune édition publiée. Toute évolution de méthode reçoit une nouvelle version et une note de correction.

8. Termine la mise en service après préparation.
Vérifie la migration 0009 sur une branche Neon de test, les accès GitHub, l'OIDC Skills.sh, Arena, Artificial Analysis via OpenRouter et les limites des fournisseurs. Exécute les collectes et simulations sans publication. Examine au moins un cycle d'historique complet. Fais valider les budgets, droits de source, seuils et pondérations. Active uniquement les versions exactes relues. Le cron horaire n'est pas installé dans la configuration Vercel active ; utilise l'exemple après validation du forfait et du budget.

9. Vérifie et transmets.
Adapte les tests de logique, les intégrations Postgres, les permissions, les états d'attente et les pages. Lance pnpm check et le build, lis leurs résultats et corrige les erreurs. Mets le README et les décisions à jour. Prépare une PR et une issue de configuration avec les étapes exactes, les paramètres sans secrets, les accès à fournir, les résultats réels et les limites restantes. N'effectue ni achat, ni suppression, ni fusion, ni activation de production sans autorisation correspondante.
```
