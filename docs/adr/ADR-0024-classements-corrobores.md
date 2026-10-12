# ADR-0024 : classement corroboré et calcul conservateur

- Date : 2026-10-12
- Statut : accepté pour l'implémentation locale
- Décision : décidée par l'agent sur délégation (PD-0003)

## Contexte

ADR-0019 calcule GitHub et Rising avec les seuls relevés GitHub. ADR-0021 permet encore de classer un modèle avec un seul évaluateur. Une source indisponible peut alors suffire à fixer un rang. Les éditions déjà publiées sont immuables et conservent leur ancienne méthode.

Le [catalogue des sources](../site/multi-source-ranking-sources.md) distingue les fournisseurs utilisés, les données de contexte et les pistes écartées. Plusieurs sites republient les mêmes événements GitHub ou mélangent modèle et agent. Leur nombre ne constitue pas une corroboration.

## Décision

### Dépôts GitHub et Rising

Le score GitHub existant reste un sous-score, noté G pour GitHub et R pour Rising. Le second avis provient des contrôles de pratiques de sécurité de l'API OpenSSF Scorecard. Neuf contrôles sont retenus : Code-Review, Security-Policy, Dangerous-Workflow, Token-Permissions, Pinned-Dependencies, Vulnerabilities, Signed-Releases, Branch-Protection et CI-Tests. Les contrôles de popularité ou d'activité ne sont pas repris.

Un rapport OpenSSF est admissible si son identité correspond exactement au dépôt GitHub, si au moins six de ces neuf contrôles ont une note entre 0 et 10, si sa date ne dépasse pas celle de l'édition et s'il date de quatorze jours au plus. Un contrôle absent ou inconcluant reçoit la valeur neutre 5 dans le calcul. Cette convention évite qu'un contrôle non renseigné augmente artificiellement la note. Le résultat OpenSSF n'est ni un audit de code ni une garantie de sécurité.

```text
m = nombre de contrôles admissibles, m >= 6
O = 10 * (somme des m notes + 5 * (9 - m)) / 9
Top = 0,75 * G + 0,25 * O
Rising = 0,85 * R + 0,15 * O
```

Chaque projet classé doit avoir ses relevés GitHub du jour et à J-7, ainsi qu'un rapport OpenSSF admissible. Le collecteur retient les 80 premiers candidats GitHub et les 80 premiers Rising, puis retire les doublons. Il réutilise les rapports encore admissibles et interroge les dépôts restants par lots de huit avec un délai borné. Il conserve les notes des contrôles, la date et le score global publié par OpenSSF dans des relevés immuables. Le score global OpenSSF n'entre pas dans la moyenne.

Une couverture partielle ne suffit pas toujours à figer le Top 20. Pour chaque dépôt sans second avis, on calcule sa borne haute en supposant O = 100. Si cette borne atteint le score du vingtième dépôt corroboré, le gel est refusé. Rising est omis si un candidat sans second avis pourrait rejoindre sa liste. Ainsi, un score absent ne devient jamais zéro et ne renforce jamais indirectement les autres sources.

### Skills

Les deux familles sont Skills.sh pour les installations sur sept jours et GitHub pour les stars sur sept jours et la récence du dépôt. Chaque mesure est convertie en percentile dans la même édition; les égalités prennent le rang moyen et une cohorte d'un seul élément donne 50. Les deux familles restent obligatoires.

```text
I = percentile des installations gagnées
H = 0,6 * percentile des stars gagnées + 0,4 * percentile de la récence
A = 0,5 * I + 0,5 * H
D = 0,5 * abs(I - A) + 0,5 * abs(H - A)
Skill = max(0, A - 0,2 * D)
```

La pénalité D retire au plus 10 points lorsque les deux familles se contredisent complètement. Elle est conservée dans les mesures de l'édition. Elle ne donne pas une note de sécurité au skill.

### Models et benchmarks

Le score principal exige simultanément un résultat Arena texte avec le seuil de votes défini par ADR-0021 et un Intelligence Index d'Artificial Analysis. Ils sont normalisés séparément en percentiles parmi les seuls modèles ayant les deux résultats. Le score suit la même moyenne avec pénalité D que Skills, à poids égaux. Une seule évaluation ne produit plus de rang principal.

Coding et Agents exigent chacun Arena et Artificial Analysis. Reach exige Hugging Face Hub et OpenRouter. Les mesures de vision, recherche, contexte, débit et prix restent traçables, mais ne créent plus seules une dimension classante. Value peut combiner le score principal corroboré et le prix mesuré par OpenRouter; le prix reste identifié comme mesure d'un fournisseur.

La date publiée par chaque ligne Arena et `meta.as_of` d'Artificial Analysis doivent être comprises dans les quatorze jours précédant la collecte. Une date absente ou future n'est pas remplacée par la date du collecteur. Le rapprochement des modèles demeure exact sur l'identifiant normalisé et l'organisation canonique; un doute laisse les références séparées.

## Effets sur l'exploitation

- Versions des nouveaux gels : `github-cross-source-v2`, `rising-cross-source-v2`, `skills-cross-source-v2` et `models-cross-source-v2`.
- Aucune migration supplémentaire : les références et relevés OpenSSF utilisent les tables de la migration 0005. Les éditions passées restent intactes.
- L'API OpenSSF ne demande pas de secret supplémentaire. `OPENROUTER_API_KEY` devient nécessaire pour publier une nouvelle édition Models avec deux évaluateurs. Sans elle, Models reste en attente.
- Un seuil de vingt candidats corroborés demeure requis pour Skills, Models et GitHub. Les premières éditions réelles, les quotas et les droits d'usage des fournisseurs restent à vérifier avant activation en production.

## Limites

Les percentiles mesurent une position dans le pool suivi de la semaine, pas une qualité absolue. Les poids sont des choix éditoriaux explicites, non des paramètres entraînés. Le score OpenSSF mesure des pratiques détectables automatiquement; il peut manquer des risques réels. Les installations, stars et téléchargements peuvent être manipulés. Le contrôle croisé, les dates, les seuils et la borne haute limitent certaines erreurs mais ne prouvent pas qu'un projet est le meilleur dans tous les usages.

## Sources

- [OpenSSF Scorecard API](https://api.scorecard.dev/) et [description des contrôles](https://github.com/ossf/scorecard/blob/main/docs/checks.md)
- [Skills.sh API](https://www.skills.sh/docs/api)
- [Arena Leaderboard Dataset](https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset)
- [OpenRouter Benchmarks API](https://openrouter.ai/docs/api/api-reference/benchmarks/get-benchmarks)
