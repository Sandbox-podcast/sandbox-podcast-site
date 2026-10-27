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

## Descriptions fournies par Lou, 26 octobre 2026

Lou demande de reprendre sur `/about` les trois descriptions de son screenshot. Elles sont déjà présentes à l'identique dans `content/hosts.json`. Le contrôle HTTP du domaine public affiche encore « Présentation à compléter. » pour les trois profils.

Compatibilité décidée par l'agent sur délégation (PD-0003) : une biographie publiée vide ou égale à « Présentation à compléter. » reprend celle du même profil dans Git. Une biographie renseignée reste prioritaire ; un profil absent du dépôt conserve son texte. Les noms et liens publiés restent lus dans la collection Animateurs.

Validation locale : les tests de rendu couvrent les trois descriptions visibles avec les fiches publiées provisoires, les biographies vides et la conservation d'une biographie renseignée. La mise en ligne reste à effectuer dans le lot autorisé par Lou.

## Site personnel de Lou, 26 octobre 2026

À la demande de Lou, sa fiche sur `/about` présente uniquement `https://louhusson.com/`. Le champ facultatif `website` de la collection Animateurs est validé en HTTPS. Sur cette page, un site personnel remplace les liens sociaux, y compris dans les données structurées ; les profils sans site conservent leurs liens actuels. Les liens sociaux restent disponibles pour les autres pages.

Compatibilité décidée par l'agent sur délégation (PD-0003) : une fiche publiée sans ce champ reprend le site du même profil dans Git. Un site déjà renseigné dans la fiche publiée reste prioritaire. La modification reste locale jusqu'à la livraison du lot.

Validation locale : 22 tests ciblés réussis, contrôle TypeScript réussi, ESLint et Prettier réussis sur les fichiers modifiés. `pnpm check` s'arrête au formatage de 105 fichiers hors de cette modification. Le test de rendu vérifie un seul lien sur la carte de Lou avec une ancienne fiche publiée, ainsi que la conservation des liens des autres animateurs.

## Photos de Lou et Loïc, 14 octobre 2026

À la demande du propriétaire, les portraits fournis sont conservés dans `apps/site/public/team/lou.png` et `apps/site/public/team/loic.png`, puis associés aux profils `lou` et `loic` par le champ facultatif `photo`, déjà utilisé en production. Le champ local provisoire `photoPath` est retiré.

La page de production a été vérifiée le 14 octobre 2026 : le local reprend sa structure, le portrait de Nicolas (`/team/nicolas.jpg`), les pseudos `aka`, les liens sociaux des trois animateurs et le texte d'introduction. Les nouvelles photos de Lou et Loïc restent celles fournies dans cette conversation.

Chaque portrait occupe un carré bord à bord en haut de sa carte, avec un fondu limité à la partie basse, comme en production. Ce carré évite l'agrandissement imposé par le précédent conteneur haut de 65 % de la carte. Les images sont demandées pour une largeur de 26 rem sur ordinateur, en qualité 90, autorisée dans Next.js. Les cartes d'une même rangée gardent la même hauteur ; les profils sans photo conservent leur initiale. Le portrait est décoratif pour les lecteurs d'écran puisque le nom figure dans la carte.

Compatibilité décidée par l'agent sur délégation (PD-0003) : si un profil déjà publié ne contient pas encore de photo ou de pseudo, la lecture reprend le champ manquant du même profil dans Git. Pour Lou, l'ancienne photo standard `/team/lou.jpg` est remplacée à la lecture par le nouveau portrait du dépôt. Les autres photos renseignées dans le contenu publié restent prioritaires. Les autres champs du profil publié ne sont pas remplacés. Aucune migration de base n'est nécessaire.

Validation locale : 340 tests réussis avec deux workers, TypeScript et lint des fichiers modifiés validés. La page répond en HTTP 200 avec trois portraits et les liens restaurés. Les trois variantes WebP de 640 px en qualité 90 répondent aussi en HTTP 200. Le contrôle global reste bloqué par des écarts de formatage hors de cette modification. La dernière vérification visuelle locale reste à refaire : l'onglet a conservé une page d'erreur de connexion pendant le redémarrage, puis le navigateur a refusé sa navigation automatique. La page de production a été consultée dans le navigateur.
