# ADR-0018 — Comptes du backoffice dans Postgres

- Statut : proposée pour intégration après la PR #3
- Date : 2026-10-07
- Décision : décidée par l'agent sur délégation (PD-0003), en portant la PR #6 dans `apps/site`

## Contexte

La PR #6 introduit des comptes en base et trois rôles, mais modifie l'ancienne application à la racine. Le site actuel vit dans `apps/site` et dispose déjà des trois comptes Lou, Nicolas et Loïc dans `SITE_ADMIN_USERS`.

## Décision

1. Ajouter `admin_users` à la base éditoriale, avec identifiant, empreinte de mot de passe, rôle (`viewer`, `editor`, `admin`) et état actif.
2. Vérifier les droits côté API : lecture, brouillon et publication. Une session en base est invalidée si le compte est désactivé, supprimé ou si son empreinte change.
3. Garder les trois comptes d'environnement jusqu'à l'import explicite. Dès qu'un compte existe en base, les comptes d'environnement cessent d'authentifier : une erreur de base autre qu'une table absente ne provoque pas un repli silencieux.
4. Après `db:migrate`, `pnpm --filter @podcast/site admin:bootstrap` importe les comptes existants et leurs empreintes sans mot de passe en clair. Ils conservent le rôle `admin`, comme avant. L'import refuse une table déjà peuplée.

## Conséquences

Le déploiement du code seul conserve les comptes actuels. L'import est une opération distincte ; il faut sauvegarder la base et vérifier les accès des trois personnes avant de retirer `SITE_ADMIN_USERS`. Les rôles des comptes importés peuvent ensuite être ajustés en base. Aucune interface de gestion des comptes n'est ajoutée dans cette première étape.
