# ADR-0021 — Croiser des sources externes pour Skills et Models

- Date : 2026-10-08
- Statut : accepté pour l'implémentation locale
- Décision : décidée par l'agent sur délégation (PD-0003)

## Contexte

Le site possède déjà le stockage PostgreSQL des éditions hebdomadaires et un collecteur GitHub. Les classements Skills et Models utilisent encore des fixtures dans le parcours local et n'ont pas de relevés quotidiens persistés. L'affichage d'un nombre sans provenance, date, historique ni règles de rapprochement ne permet pas de justifier un véritable classement. Le site doit croiser des sources spécialisées et garder une trace de ce que chaque source a fourni.

Les sources disponibles n'observent pas la même chose : Skills.sh compte des installations; GitHub mesure l'activité du dépôt; Arena agrège des préférences humaines; Hugging Face fournit des métadonnées et téléchargements; OpenRouter fournit l'usage, les prix, le contexte et le débit; son API benchmarks expose des indices d'Artificial Analysis. Aucune source unique ne suffit à qualifier toutes les dimensions d'un skill ou d'un modèle.

## Décision

### Stockage

- Ajouter `chart_entity_sources` comme table d'identifiants et d'URL par fournisseur.
- Ajouter `chart_source_snapshots` comme table de mesures datées (`observed_on`, `collected_at`, payload source), unique par fournisseur/entité/jour et immuable dans PostgreSQL.
- Enregistrer les éditions Skills/Models dans les tables existantes `weekly_chart_editions` et `weekly_rankings`; figer les identités affichées, les sources, mesures, rangs, poids et version de score avec l'édition.
- Effectuer la sauvegarde d'un lot d'entités, sources et mesures dans une seule transaction. Une relance le même jour ne réécrit pas un relevé.

### Sources et identité

- **Skills** : API Skills.sh (`all-time`, `trending`) reliée au dépôt indiqué par Skills.sh; métadonnées du dépôt lues via GitHub REST API. Écarter les doublons signalés et les dépôts privés, archivés, forks ou désactivés.
- **Models** : API des modèles publics Hugging Face (pool `text-generation`), dataset public Arena (texte, WebDev, agents, vision, recherche), API OpenRouter (usage hebdomadaire, débit, contexte et prix) et API benchmarks d'OpenRouter pour les indices Artificial Analysis.
- Utiliser les noms de modèle normalisés et l'organisation canonique pour les rapprochements exacts. Ne jamais fusionner par similarité approximative. En cas de collision ambiguë, garder les références séparées.
- Ne pas compter un résultat de model card comme benchmark vérifié sans valider le jeton de preuve. En l'absence d'une source contrôlée pour Reasoning ou Maths, ces dimensions restent absentes et leurs vues sont désactivées.
- Pour Arena, ne retenir un score que s'il porte au moins 1 000 votes. Conserver la référence à la source et son attribution.

### Scores

- **Skills** : 50 % variation des installations Skills.sh autour de J−7, 30 % variation des stars GitHub sur la même fenêtre, 20 % fraîcheur du dernier push. Les dimensions sont transformées séparément en percentiles au sein de l'édition; une égalité reçoit le percentile du rang moyen. Il faut vingt candidats complets et au moins sept jours de relevés.
- **Models — qualité générale** : moyenne à poids égaux des percentiles Arena texte et Artificial Analysis Intelligence Index. Si l'une des sources manque pour un modèle, le poids disponible est renormalisé. Il faut vingt modèles évaluables.
- **Vues modèles** : percentiles des signaux comparables Arena/OpenRouter/Artificial Analysis; qualité-prix = 60 % qualité et 40 % prix; prix entrée/sortie = trois parts entrée et une sortie par million de tokens. Reach croise téléchargements Hub et rang d'usage OpenRouter. Les champs manquants n'ajoutent aucune valeur fictive.
- L'édition conserve les mesures exactes et son `scoring_version`. Un score sur 100 exprime un rang relatif aux candidats de cette semaine, pas une unité universelle.

### Activation

- Collecte externe quotidienne à 02:30 UTC; gel hebdomadaire Skills/Models le lundi après les collectes. Le cron hebdomadaire GitHub appelle aussi le gel externe.
- Sans relevé quotidien du jour, historique J−7 ou seuil de vingt candidats, la publication est sautée; aucun résultat simulé n'est substitué.
- Ajouter une migration additive 0005. La codebase et les tests locaux peuvent préparer cette migration, mais le responsable applique la migration sur Neon, configure les secrets et active OIDC côté Vercel.
- Variables serveur : `DATABASE_URL`, `GITHUB_TOKEN`, `CRON_SECRET`, accès Skills.sh par Vercel OIDC; `OPENROUTER_API_KEY` facultative pour prix/débit/indices; `HUGGINGFACE_TOKEN` facultative pour le Hub.

## Conséquences

- Les métriques brutes et éditions publiées sont persistées durablement en Postgres. L'historique permet de calculer les deltas au lieu de simuler une première semaine.
- Les pages et API Skills/Models peuvent servir les éditions publiées depuis les mêmes tables que GitHub/Rising, avec les liens source dans les réponses.
- La qualité principale Models se fonde sur des évaluations Arena et Artificial Analysis séparées; elle n'affirme pas qu'un modèle est le meilleur dans tous les usages. Les dimensions sans source approuvée sont volontairement vides.
- Le pool est une couverture des APIs énumérées, pas de tous les skills ou modèles d'Internet. Les quotas, schémas ou conditions des sources peuvent évoluer; toute modification de méthode doit incrémenter sa version et être documentée.
- Il reste au responsable à confirmer les conditions d'utilisation et d'attribution pour la publication envisagée, configurer les accès, appliquer la migration en production et valider la première collecte réelle. Aucune action externe n'est effectuée par cet ADR.

## Sources

- [Skills.sh API](https://www.skills.sh/docs/api)
- [GitHub REST API — repositories](https://docs.github.com/en/rest/repos/repos#get-a-repository)
- [Hugging Face Hub API](https://huggingface.co/docs/hub/api)
- [Arena Leaderboard Dataset](https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset)
- [OpenRouter — modèles et propriétés](https://openrouter.ai/docs/api/api-reference/models/get-models)
- [OpenRouter — benchmarks Artificial Analysis](https://openrouter.ai/docs/api/api-reference/benchmarks/get-benchmarks)
- [Hugging Face — résultats d'évaluation et preuves](https://huggingface.co/docs/hub/main/en/eval-results)
