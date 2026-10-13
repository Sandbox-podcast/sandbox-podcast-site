# ADR-0023 — Éditions quotidiennes des classements

- Date : 2026-10-10
- Statut : accepté
- Décidée par l'agent sur délégation (PD-0003), après accord du propriétaire sur le rythme quotidien

## Contexte

Les collectes GitHub, Skills et Models tournent déjà chaque jour. Le gel, lui, n'était prévu que le lundi et identifiait l'édition par une semaine ISO (`2026-W41`). Pour l'IA, une semaine entre deux publications est longue. La fenêtre de mesure, elle, a besoin de sept jours d'historique : GitHub et Skills comparent le relevé du jour à celui de J−7, Rising à environ J−14.

L'édition Models `2026-W41` est déjà publiée. Elle reste immuable.

## Décision

Une nouvelle édition immuable est publiée chaque matin, après les collectes, si le classement a assez de candidats. L'identifiant d'une nouvelle édition est la date UTC `AAAA-MM-JJ`. Les éditions déjà publiées en `AAAA-Wnn` restent valides. La migration `0007` élargit la contrainte SQL pour accepter les deux formes. Elle ne réécrit aucune ligne.

Le mouvement compare l'édition du jour à la précédente publication du même classement lorsque moins de huit jours les séparent. Un trou plus long, comme une semaine ISO manquante, n'invente pas de hausse ni de baisse. La fenêtre de score ne change pas : sept jours pour GitHub et Skills, environ quatorze pour Rising, qualité Arena ou Artificial Analysis pour Models.

Le cron `github-weekly` passe de chaque lundi à chaque jour à 03:00 UTC. Il gèle GitHub, Rising, Skills et Models. GitHub et Skills restent en attente tant que l'historique J−7 n'existe pas. Models peut publier dès qu'une collecte du jour est exploitable. L'édition `2026-W41` n'est pas recalculée.

L'ordre des éditions suit leur date réelle, pas le tri alphabétique de l'identifiant : `2026-10-11` est postérieur à `2026-W41`.

Cette cadence remplace le gel du lundi décrit dans ADR-0021. Le reste de cette décision reste en vigueur.

## Conséquences

La première édition GitHub reste impossible avant un second relevé à J−7, vers le 2026-10-17. Skills dépend en plus d'un jeton OIDC accepté par Skills.sh. La prochaine édition Models portera la date du gel, pas un nouveau numéro de semaine, et pourra inclure OpenRouter si la clé est présente au moment de la collecte.

Les URL d'archive acceptent les deux identifiants. Les textes éditoriaux d'épisode restent liés à une semaine ISO.
