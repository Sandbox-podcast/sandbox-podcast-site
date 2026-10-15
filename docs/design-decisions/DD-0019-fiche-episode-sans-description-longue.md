# DD-0019 : Fiche d'épisode sans description longue

- Date : 2026-10-13
- Statut : implémentée localement
- Demande de Lou : retirer le bloc "À propos de l'épisode", qui répète les chapitres et les ressources extraits de la description, et revoir la disposition pour éviter un espace vide.
- Conception décidée par l'agent sur délégation (PD-0003).
- Remplace l'affichage de la description longue prévu par [DD-0003](DD-0003-parcours-podcast-et-theme-rouge.md).

La fiche conserve le résumé court dans son en-tête. Les thèmes y sont déplacés et le sommaire donne accès à la vidéo, aux chapitres et aux ressources. Le bloc "À propos de l'épisode" et son ancre sont retirés.

Le lecteur occupe la largeur disponible. Juste dessous, les chapitres et les ressources commencent sur la même ligne dans deux colonnes. Les titres portent le nombre d'entrées. La colonne des ressources reste accessible au défilement. Sous 56 rem, les deux colonnes se suivent : chapitres, puis ressources. Le lecteur audio éventuel reste sous la vidéo.

La description source reste enregistrée et consultable dans l'admin avec son aperçu Markdown. Elle continue d'alimenter les chapitres, les ressources et les données structurées existantes. Les ressources éditées à la main, leurs notes, leurs ancres et les liens horodatés sont conservés. Aucun contenu éditorial n'est supprimé et aucune migration n'est nécessaire.

La page reste partagée entre les quatre langues. Les états sans vidéo, sans chapitre et sans ressource restent explicites.

## Validation locale

- `pnpm test` : 59 fichiers, 328 tests réussis, dont trois nouveaux tests de la fiche. Le premier passage a dépassé le délai d'un test existant de miniatures ; les relances ont réussi sans modifier ce test.
- `pnpm lint --ignore-pattern '.local/**'` : réussi. Seule la copie de contrôle locale est exclue de l'analyse.
- `pnpm typecheck` et `pnpm build` : réussis, avec 213 pages statiques générées au build.
- Prettier : les dix fichiers de cette modification sont conformes.
- `pnpm check` : arrêté au format sur 112 fichiers hors de cette modification. Aucun contrôle n'est désactivé et ces fichiers ne sont pas reformatés dans cette tâche.
- Navigateur : contrôles à 1280, 390 et 320 px, sans débordement horizontal. Les deux colonnes commencent ensemble sur ordinateur et se suivent sur mobile. La page anglaise utilise les mêmes blocs. Les états sans vidéo, chapitre ou ressource sont vérifiés.

Le contrôle visuel a utilisé une copie temporaire dans `.local/episode-layout-preview`, sans écriture dans les publications éditoriales. Cette copie et son serveur sont retirés après vérification ; les captures sont conservées. Aucun commit, push ou déploiement n'est effectué. La mise en ligne reste à faire par le propriétaire.

## Fichiers concernés

- `apps/site/src/app/(fr)/episodes/[number]/page.tsx` : retrait du bloc, déplacement du lecteur et des thèmes, titres et sommaire.
- `apps/site/src/app/globals.css` et `site-polish.css` : disposition, alignement, compteurs et lisibilité des ressources.
- `apps/site/test/episode-page.test.ts` : absence de doublon, extraction, ressources éditées, audio et états vides.
- `apps/site/test/episode-description.test.ts` : descriptions des tests adaptées au rôle éditorial du Markdown.
- Ce document, `docs/README.md`, `docs/site/README.md`, `docs/site/editorial-workflow.md` et DD-0003 : décision et documentation de l'affichage public.
