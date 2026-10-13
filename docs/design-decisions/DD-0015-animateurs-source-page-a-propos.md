# DD-0015 : Les animateurs alimentent la page À propos

- Statut : acceptée
- Date : 2026-10-13
- Demande fonctionnelle : propriétaire
- Choix de compatibilité décidés par l'agent sur délégation (PD-0003)

## Contexte

Les liens sociaux étaient saisis à deux endroits : dans les fiches Animateurs et dans les réglages de l'identité du site. La page `/about` lisait uniquement les réglages de l'identité, ce qui rendait la publication depuis une fiche Animateur sans effet visible.

## Décision

1. La collection éditoriale Animateurs est la source des noms et liens GitHub, LinkedIn et X affichés sur `/about`.
2. La page affiche les animateurs dans l'ordre de la collection et ignore les profils marqués comme signatures de remplacement.
3. Les réglages de l'identité du site restent responsables des textes de la page À propos, pas des fiches d'équipe.
4. Les anciens réglages `team` sont ignorés par le schéma Zod. Les données déjà publiées dans `hosts` continuent d'alimenter la page sans migration de base.

## Conséquences

- Une publication de liens dans Animateurs met à jour `/about`.
- L'admin n'expose plus un second formulaire de cartes d'équipe dans « Identité du site ».
- La source de contenu pour les traductions de `/about` suit les noms et liens des animateurs publiés.

## Complément du 2026-10-13

Les fiches Animateurs portent aussi deux champs facultatifs affichés sur `/about` : `aka` (pseudo sous le prénom, casse conservée) et `photo` (chemin d'un fichier servi depuis `public/`, par exemple `/team/nicolas.jpg` ; les URL externes sont refusées par le schéma). Une carte avec photo affiche un portrait carré bord à bord à la place du monogramme. L'admin saisit le chemin, mais ne téléverse pas le fichier : la photo s'ajoute par un commit.
