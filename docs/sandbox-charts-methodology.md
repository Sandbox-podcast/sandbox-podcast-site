# Méthodologie SANDBOX CHARTS

Implémentation : [github-charts.ts](../apps/site/src/domain/github-charts.ts). La page publique présente la configuration de la dernière édition publiée ; chaque édition conserve sa propre version.

## Relevés et éligibilité

GitHub fournit les stars, forks, watchers, issues ouvertes et, lorsque disponible, le nombre de commits sur la branche par défaut pendant les sept derniers jours. Le dépôt conserve l'identifiant GitHub pour suivre les renommages. La collecte des contributeurs et releases n'est pas branchée : ces valeurs restent nulles.

La qualification automatique exige un dépôt public, non fork, non archivé, non désactivé, mis à jour dans les 90 derniers jours et ayant au moins 100 stars. L'équipe peut modifier son suivi. Un projet classable doit être suivi, non bloqué et hors liste d'exclusion, avec au moins 200 stars ou 100 stars gagnées sur la période. Ces seuils sont configurables.

Le relevé J−7 utilise la date observée la plus proche, à ±1 jour par défaut, jamais une date future ou celle du jour. La différence affichée porte sur l'intervalle réellement observé. Le détail conserve les dates des baselines. Il faut vingt projets éligibles pour figer le classement principal avec la configuration initiale.

## Momentum Score v1

| Composante           | Poids prévu | Calcul                                            |
| -------------------- | ----------: | ------------------------------------------------- |
| Star velocity        |        45 % | Stars du jour moins stars de la baseline          |
| Relative growth      |        20 % | Gain positif / maximum(stars de la baseline, 200) |
| Fork velocity        |        15 % | Forks du jour moins forks de la baseline          |
| Contributor activity |        10 % | Différence de contributeurs, si mesurée           |
| Repository activity  |        10 % | 100 × exp(−jours depuis le dernier push / 30)     |

Les quatre premières composantes sont ramenées en percentiles sur le pool éligible avant de sélectionner le Top 20. Les gains négatifs valent zéro pour le score ; ils restent négatifs dans les données brutes. Une égalité reçoit le rang moyen. Un seul candidat recevrait 50, mais le seuil de publication reste appliqué. L'activité est déjà bornée entre 0 et 100.

Le pourcentage de croissance affiché utilise le dénominateur réel, sans plancher. Si la baseline vaut zéro, le pourcentage reste absent. Ainsi, le plancher corrige le scoring sans réécrire la mesure.

Une composante absente reste nulle dans la provenance. Le score divise la somme pondérée par la somme des poids disponibles. Sans contributeurs, la couverture de Momentum est de 90 %. Les compteurs absents ne deviennent pas des zéros.

## Rising Score v1

| Composante      | Poids prévu |
| --------------- | ----------: |
| Acceleration    |        40 % |
| Relative growth |        30 % |
| Star velocity   |        20 % |
| Freshness       |        10 % |

Rising retient les projets classables avec au plus 25 000 stars et une accélération positive. Il compare les vitesses sur deux intervalles de sept jours, ramenées à sept jours si les dates observées diffèrent. Accélération = (vitesse récente − vitesse précédente) / vitesse précédente. Une vitesse précédente nulle ou négative ne permet pas ce calcul et n'est pas remplacée.

Les trois premières composantes deviennent des percentiles dans le pool Rising. La fraîcheur vaut 100 × exp(−âge du dépôt en jours / 180). Rising peut contenir moins de vingt entrées si moins de vingt projets remplissent ses conditions.

## Éditions, mouvements et vues longues

Une édition publiée est identifiée par sa date UTC (`AAAA-MM-JJ`). Les éditions déjà figées en semaine ISO restent valides et ne sont pas recalculées. Les exécutions Vercel prévues sont : découverte quotidienne à 01:00 UTC, collecte GitHub à 02:00 UTC, collecte Skills/Models à 02:30 UTC, gel à 03:00 UTC. Le gel automatique exige une collecte du jour terminée. Le score GitHub et Skills continue de comparer ce relevé à celui d'il y a sept jours. Le mouvement, lui, compare la nouvelle édition à la publication précédente lorsqu'elles se suivent d'au plus huit jours.

Le mouvement vaut rang précédent − rang actuel. Un résultat positif monte, un résultat négatif descend, zéro reste stable. NEW désigne une absence dans l'édition précédente, y compris un retour. La première édition et une comparaison indisponible affichent un tiret dans l'interface.

THIS MONTH, 3 MONTHS et ALL TIME utilisent la moyenne de 100 / rang sur les semaines disponibles ; une absence dans une édition vaut zéro point de présence. Le mois suit la date du lundi. Les métriques de croissance cumulées ne couvrent que les relevés disponibles dans les éditions retenues. Les pourcentages affichés restent ceux du dernier relevé du projet, sans moyenne des percentiles de pools différents.

Les signaux sectoriels comparent les stars gagnées sur une cohorte identique de dépôts entre deux éditions et dédupliquent un même projet. Les records portent sur l'historique disponible. Une interruption casse une série de semaines consécutives à la première place.

## Limites

Les stars et forks mesurent l'attention GitHub. Ils ne prouvent ni la qualité du code, ni sa sécurité, ni son adoption en production. L'activité v1 repose sur la récence du push ; le volume de commits est conservé comme mesure supplémentaire. Un compteur qui chute de plus de 20 % après au moins 100 stars est mis en attente de contrôle manuel.

Les données d'une source manquante ne sont pas inventées. Les commentaires de l'équipe, les catégories et la watchlist ne modifient pas les métriques. La collecte réelle des Skills et Models reste une étape ultérieure.
