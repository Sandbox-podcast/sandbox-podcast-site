# ADR-0030 : reprise et contrôle des classements

Date : 2026-10-15
Statut : décidée par l'agent sur délégation (PD-0003)

## Constat

Le 15 octobre, les API publiques servent GitHub et Skills du 10 octobre, Models du 12. Le workflow de l'ADR-0028 échoue avant tout appel : la variable d'origine et le secret GitHub Actions sont absents. Les crons Vercel ont déjà été retirés. Une collecte manuelle ne répare pas cette configuration.

La collecte GitHub parcourt plus de dix mille candidats avec les dépôts déjà suivis ; son budget de temps ne suffit pas. Le catalogue OpenRouter contient aussi des modèles audio ou vidéo avec un contexte textuel nul : la validation strictement positive rejette tout le catalogue.

Les profils v3 exigent une revue et des preuves suffisantes avant publication. Une collecte réussie ou un brouillon ne prouve donc pas que le classement public a été actualisé.

## Décision

- Conserver les horaires 03:17 et 15:17 UTC, les créneaux 00:00 et 12:00, les seuils et les éditions immuables.
- Utiliser l'origine de production par défaut. Le secret reste obligatoire, protégé et identique à `CRON_SECRET` côté serveur.
- Exécuter trois chaînes indépendantes, GitHub, Skills et Models. Reprendre chaque collecte au maximum trois fois, puis tenter le gel et vérifier l'édition réellement accessible par l'API publique. Une source en panne ne coupe pas les autres chaînes.
- Collecter d'abord les dépôts suivis, puis au maximum cent candidats par passage. Réserver quarante secondes à OpenSSF. Le reliquat mesure les dépôts suivis non collectés.
- Traiter un contexte OpenRouter égal à zéro comme une valeur non applicable, sans accepter de valeur négative ni inventer une capacité textuelle.
- Renvoyer HTTP 503 pour un résultat partiel, insuffisant ou échoué. Un profil non relu laisse un brouillon et un résultat partiel. Le contrôle public reste l'autorité finale.
- Vérifier chaque heure l'âge des éditions publiques, indépendamment du secret. Au-delà de dix-huit heures depuis le début du créneau, le workflow échoue. Après une actualisation, exiger exactement l'édition du créneau courant.
- Afficher le retard dans la page publique et invalider le cache des pages après un gel. Les poussées horaires, facultatives, demandent la variable explicite `SANDBOX_CHARTS_BURSTS_ENABLED=true`.
- Pour un rejeu historique, rechercher une collecte terminée dans le créneau concerné ; une collecte plus récente ou une tentative échouée ultérieure ne doit pas masquer cette preuve.

## Limites et mise en service

Le contrôle horaire utilise le même fournisseur que le planificateur. Il ne constitue pas un SLA ni une alerte indépendante d'une panne générale de GitHub. Les notifications dépendent des réglages GitHub du responsable. Aucun abonnement, message externe ou service payant n'est ajouté.

Le code doit être déployé avant l'activation du nouveau workflow. Le secret GitHub Actions doit être configuré séparément. La revue des profils et les identités Models contradictoires restent nécessaires ; aucun seuil n'est abaissé pour publier. Les observations absentes ne peuvent pas être reconstituées à partir des compteurs actuels.

Voir le [constat et la procédure de reprise](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/incident-classements-2026-10-15.md).
