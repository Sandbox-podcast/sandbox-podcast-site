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
- L'admin n'expose plus un second formulaire de cartes d'équipe dans "Identité du site".
- La source de contenu pour les traductions de `/about` suit les noms et liens des animateurs publiés.

## Complément du 2026-10-13

Les fiches Animateurs portent aussi deux champs facultatifs affichés sur `/about` : `aka` (pseudo sous le prénom, casse conservée) et `photo` (chemin d'un fichier servi depuis `public/`, par exemple `/team/nicolas.jpg` ; les URL externes sont refusées par le schéma). Une carte avec photo affiche un portrait carré bord à bord à la place du monogramme. L'admin saisit le chemin, mais ne téléverse pas le fichier : la photo s'ajoute par un commit. Remplacé le 2026-10-14 par l'import depuis l'admin ([DD-0021](DD-0021-photos-des-animateurs-depuis-l-admin.md)).

## Portraits du 14 octobre 2026

À la demande du propriétaire, le portrait de Lou est remplacé par `/team/lou.png` et celui de Loïc est ajouté dans `/team/loic.png`. Les deux fichiers fournis sont conservés à l'identique ; les anciens fichiers restent dans le dépôt. La photo de Nicolas, les pseudos et les liens déjà publiés sont conservés.

Le cadrage carré bord à bord et le fondu bas reprennent la présentation de production. Les images sont servies en qualité 90, ajoutée aux qualités autorisées de Next.js, avec une largeur déclarée de 26 rem sur ordinateur. Le nom affiché dans la carte rend le portrait décoratif pour les lecteurs d'écran.

Compatibilité décidée par l'agent sur délégation (PD-0003) : un profil publié sans photo ou pseudo reprend le champ manquant du même profil dans Git. L'ancien chemin standard de Lou, `/team/lou.jpg`, reprend aussi sa nouvelle photo dans Git. Une autre photo explicitement choisie reste prioritaire. Les autres champs éditoriaux ne sont pas remplacés et aucune migration de base n'est nécessaire.

## Photos de Lou et Loïc, 14 octobre 2026

À la demande du propriétaire, les portraits fournis sont conservés dans `apps/site/public/team/lou.png` et `apps/site/public/team/loic.png`, puis associés aux profils `lou` et `loic` par le champ facultatif `photo`, déjà utilisé en production. Le champ local provisoire `photoPath` est retiré.

La page de production a été vérifiée le 14 octobre 2026 : le local reprend sa structure, le portrait de Nicolas (`/team/nicolas.jpg`), les pseudos `aka`, les liens sociaux des trois animateurs et le texte d'introduction. Les nouvelles photos de Lou et Loïc restent celles fournies dans cette conversation.

Chaque portrait occupe un carré bord à bord en haut de sa carte, avec un fondu limité à la partie basse, comme en production. Ce carré évite l'agrandissement imposé par le précédent conteneur haut de 65 % de la carte. Les images sont demandées pour une largeur de 26 rem sur ordinateur, en qualité 90, autorisée dans Next.js. Les cartes d'une même rangée gardent la même hauteur ; les profils sans photo conservent leur initiale. Le portrait est décoratif pour les lecteurs d'écran puisque le nom figure dans la carte.

Compatibilité décidée par l'agent sur délégation (PD-0003) : si un profil déjà publié ne contient pas encore de photo ou de pseudo, la lecture reprend le champ manquant du même profil dans Git. Pour Lou, l'ancienne photo standard `/team/lou.jpg` est remplacée à la lecture par le nouveau portrait du dépôt. Les autres photos renseignées dans le contenu publié restent prioritaires. Les autres champs du profil publié ne sont pas remplacés. Aucune migration de base n'est nécessaire.

Validation locale : 340 tests réussis avec deux workers, TypeScript et lint des fichiers modifiés validés. La page répond en HTTP 200 avec trois portraits et les liens restaurés. Les trois variantes WebP de 640 px en qualité 90 répondent aussi en HTTP 200. Le contrôle global reste bloqué par des écarts de formatage hors de cette modification. La dernière vérification visuelle locale reste à refaire : l'onglet a conservé une page d'erreur de connexion pendant le redémarrage, puis le navigateur a refusé sa navigation automatique. La page de production a été consultée dans le navigateur.
