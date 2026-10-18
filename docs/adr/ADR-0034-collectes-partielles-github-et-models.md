# ADR-0034 : collectes partielles GitHub et Models

Date : 18 octobre 2026. Statut : accepté pour le code local.

Décision décidée par l'agent sur délégation (PD-0003), en traitant les échecs de collecte constatés sur l'issue 68. Elle ne publie aucun classement, ne fusionne aucune entité et ne renseigne pas `CHARTS_REVIEWED_PROFILE_VERSIONS`.

## Dépôt GitHub introuvable

Une collecte quotidienne qui reçoit `Could not resolve to a Repository` enregistre l'erreur puis passe le dépôt en `ignored`, uniquement si aucun statut manuel n'est posé. Le relevé du jour compte encore comme échec : le job reste partiel. Les passages suivants ne redemandent plus ce nom.

Un dépôt privé, une identité GitHub changée, une chute de stars ou une limite de quota ne déclenchent pas cet abandon. Un statut manuel d'administration est conservé.

## Sources Models indépendantes

Hugging Face et Arena ne sont plus chargés dans le même `Promise.all`. L'échec de l'une, y compris un HTTP 503 après les tentatives déjà prévues, est inscrit dans le journal et n'efface pas le catalogue reçu de l'autre, ni celui d'OpenRouter lorsqu'il répond. Aucune liste vide n'est inventée à la place d'une source en échec.

Si Hugging Face et Arena échouent tous les deux et qu'aucune autre source n'a fourni de fiche, le job est `failed` et aucune mesure n'est écrite.

## Conséquences

Le prochain passage GitHub peut redevenir complet une fois les noms introuvables écartés. Le prochain passage Models peut enregistrer les sources encore disponibles. Ni l'un ni l'autre ne publie une édition : les seuils d'historique, de corroboration et de revue de profil restent inchangés.
