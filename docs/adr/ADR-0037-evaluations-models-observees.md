# ADR-0037 : évaluations Models observées quand les deux sources ne se rejoignent pas

Date : 2026-10-19
Statut : décidée par l'agent sur délégation (PD-0003)

## Constat

Le 19 octobre, l'édition publique Models est encore celle du 12 octobre (`models-cross-source-v1`). Les collectes du 18 octobre ont reçu les catalogues, puis toute l'écriture a été annulée par une identité contradictoire (`qwen317b-qwen`). Le code de l'ADR-0036 isole désormais ce cas au lieu d'annuler le lot.

Le dernier gel réussi, le 15 octobre, laisse 100 modèles avec une évaluation Arena texte d'au moins 1000 votes et 349 avec un indice Artificial Analysis. Six fiches seulement portent les deux. Trente-six références partagées restent en conflit. Les rapprocher automatiquement mélangerait des variantes.

`models-reference-v3` exige les deux évaluations admissibles pour vingt modèles. Il n'est pas publiable. `CHARTS_REVIEWED_PROFILE_VERSIONS` reste vide : un gel v3 publiable resterait de toute façon un brouillon.

L'édition du 12 octobre mélangeait déjà des modèles notés par une seule source, et plusieurs scores de 100 venaient d'épreuves différentes. Le texte de méthode le disait. Le gel v3 a ensuite cessé de publier plutôt que de continuer ce calcul.

## Décision

- Ne pas publier `models-reference-v3` sans revue, et ne pas remplir `CHARTS_REVIEWED_PROFILE_VERSIONS`.
- Ne pas fusionner les identités en conflit. Leurs mesures restent sur leurs fiches.
- Quand le profil v3 n'est pas publiable, et qu'au moins vingt modèles ont une évaluation admissible, publier `models-quality-observed`.
- Une évaluation admissible est une note Arena texte d'au moins 1000 votes, datée d'au plus 14 jours, ou un indice Artificial Analysis daté d'au plus 14 jours.
- Le score d'un modèle est le percentile des évaluations qu'il a vraiment. S'il en a deux, les deux percentiles comptent à parts égales. S'il n'en a qu'une, seul ce percentile compte. L'autre n'est pas estimée et ne vaut pas 100.
- À score égal, le modèle qui a les deux évaluations passe devant. Le slug départage le reste.
- Le rapport qualité-prix n'entre pas dans cette édition : un prix manquant ne devient pas une vue Valeur.
- Moins de vingt évaluations admissibles : aucune édition Models. Le job reste insuffisant.
- Le job qui publie cette édition reste partiel. Les rangs ne se comparent pas à ceux d'une autre version de score.
- L'édition v3 publiable et déjà relue continue de primer. L'édition observée ne la remplace pas.

## Conséquences

La page Models peut afficher un Top du jour sans prétendre que chaque modèle a été vu par Arena et par Artificial Analysis. Deux notes de 100 peuvent décrire les meilleurs résultats de deux épreuves distinctes. Le texte de méthode le dit.

Une revue des identités pourra, plus tard, rapprocher des fiches dont les références concordent. Elle ne réécrit pas l'édition déjà publiée. Une revue du profil v3 pourra publier une édition corroborée sur un créneau suivant.
