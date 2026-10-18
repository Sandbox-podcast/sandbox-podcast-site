# ADR-0035 : édition observée quand la corroboration ne peut pas couvrir le Top

Date : 2026-10-18
Statut : décidée par l'agent sur délégation (PD-0003)

## Constat

Le 18 octobre, les pages publiques servent encore GitHub et Skills du 10 octobre, et Models du 12. Les relevés GitHub et Skills du jour existent. Le gel v3 refuse pourtant toute édition.

OpenSSF Scorecard ne couvre que sept dépôts récents. Le profil `github-reference-v3` exige ce signal pour chaque candidat. Une absence est traitée comme une note haute possible, donc des dépôts déjà mesurés sur sept jours peuvent encore « entrer dans le Top » et bloquent la publication. Le même mécanisme bloque Skills : assez de skills ont leurs deux signaux, mais des candidats incomplets gardent une borne optimiste.

`CHARTS_REVIEWED_PROFILE_VERSIONS` reste vide. Même un gel v3 publiable resterait un brouillon. Cette revue n'est pas contournée.

Models n'a pas de relevé du 18 octobre : la collecte du jour s'est arrêtée avant d'écrire, et des identités contradictoires restent en attente. Aucune édition Models nouvelle n'est fabriquée.

## Décision

- Conserver les seuils, les poids et l'interdiction de publier `github-reference-v3`, `rising-reference-v3`, `skills-reference-v3` et `models-reference-v3` sans revue.
- Quand ce profil corroboré n'est pas publiable, publier une édition distincte si au moins vingt candidats ont la mesure demandée :
  - GitHub : `github-momentum-observed`, progression réelle sur sept jours des dépôts open source suivis. OpenSSF n'entre pas dans le score.
  - Rising : `rising-momentum-observed`, accélération réelle, seulement si vingt jeunes dépôts ont deux fenêtres de sept jours.
  - Skills : `skills-installs-observed`, progression réelle des installations. Les étoiles GitHub restent affichées comme contexte. Elles ne votent pas dans le score. Un même dépôt ne contribue qu'une fois, avec le skill dont la progression d'installations est la plus forte.
- Omettre les candidats sans cette mesure. Ne pas leur attribuer une note, ni une borne de 100, ni une valeur reconstituée.
- Ne pas comparer les rangs d'une édition à ceux d'une édition précédente qui utilise une autre version de score. L'ancienne édition de popularité cumulée ne devient pas une montée ou une descente.
- Laisser le job en résultat partiel : l'édition observée est publique, le profil corroboré ne l'est pas. Models reste bloqué tant qu'une collecte du jour et des identités distinctes ne permettent pas un calcul honnête.

## Conséquences

La page peut afficher un Top du jour sans prétendre que les pratiques d'ingénierie ou une seconde source ont été vérifiées. Le texte de méthode de ces versions le dit. Le contrôle horaire reste rouge tant que Models, ou un créneau de plus de dix-huit heures, n'a pas d'édition publique du créneau attendu.

Une revue ultérieure des profils v3 pourra publier une édition corroborée sur un créneau suivant. Elle ne réécrit pas l'édition observée déjà figée.

L'édition Skills de 00:00 UTC le 18 octobre liste plusieurs skills du même dépôt. Les mesures sont immuables, donc elle reste dans l'archive. L'édition de 12:00 UTC le même jour, publiée à 17:25 UTC, reprend les mêmes relevés du matin et ne garde que le skill le plus installé de chaque dépôt (130 dépôts mesurés).
