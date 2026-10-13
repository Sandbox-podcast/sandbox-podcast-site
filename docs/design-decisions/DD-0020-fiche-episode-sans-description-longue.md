# DD-0020 : Fiche d'épisode sans description longue

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

- Reprise des seuls changements de la fiche sur le `main` actuel, dans une branche isolée.
- `pnpm check` : réussi, avec format, lint, types et 396 tests dans 66 fichiers. Les trois nouveaux tests couvrent le retrait du doublon, les ressources éditées et les états vides.
- `pnpm build` : réussi.
- Navigateur : contrôles à 1280, 390 et 320 px, sans débordement horizontal. Les deux colonnes commencent ensemble sur ordinateur et se suivent sur mobile. La page anglaise utilise les mêmes blocs. Les états sans vidéo, chapitre ou ressource sont vérifiés.
- Les alertes de format observées dans la copie Windows venaient des fins de ligne CRLF. La copie de contrôle a été normalisée en LF avant les vérifications, sans changement des réglages Git ni ajout de fichiers étrangers à la PR.

Le contrôle visuel a utilisé une copie temporaire dans `.local/episode-layout-preview`, sans écriture dans les publications éditoriales. Cette copie et son serveur sont retirés après vérification ; les captures sont conservées. La livraison passe par une PR à la demande de Lou. La fusion et la publication finale restent sous le contrôle du propriétaire.

## Fichiers concernés

- `apps/site/src/app/(fr)/episodes/[number]/page.tsx` : retrait du bloc, déplacement du lecteur et des thèmes, titres et sommaire.
- `apps/site/src/app/globals.css` et `site-polish.css` : disposition, alignement, compteurs et lisibilité des ressources.
- `apps/site/test/episode-page.test.ts` : absence de doublon, extraction, ressources éditées, audio et états vides.
- `apps/site/test/episode-description.test.ts` : descriptions des tests adaptées au rôle éditorial du Markdown.
- Ce document, `docs/README.md`, `docs/site/README.md`, `docs/site/editorial-workflow.md` et DD-0003 : décision et documentation de l'affichage public.
