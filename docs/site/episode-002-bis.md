# Épisode 002 BIS

Prototype local indépendant, sans modification du support original ni publication.

## Ouvrir

Depuis la racine du dépôt, avec ses dépendances déjà installées :

```powershell
node experiments/episode-002-bis/serve.mjs
```

- Conducteur : <http://127.0.0.1:4324/episode-002-bis/>
- Les anciens liens `?view=director` affichent désormais la même interface simple.
- Source navigateur OBS, 1920 × 1080 : <http://127.0.0.1:4324/episode-002-bis/?obs>

Conserver le serveur ouvert. Même paramètre `session` dans les deux fenêtres pour une répétition indépendante. Éviter de recharger la page avec une ancienne ancre pendant l'émission : l'ancre sélectionne ce sujet. Les pages ne passent jamais toutes seules au sujet suivant.

## Conduite

Ordre : Radar, Build, Clash, Bêta.

- Précédent / Suivant, flèches ou Espace : parcourir les points, puis passer au sujet suivant. Maj + Espace revient en arrière. Le retour entre sujets retrouve le dernier point.
- Sujets : choisir directement un sujet, classé dans Radar, Build, Clash ou Bêta.
- Cliquer sur un métier, un outil ou un point permet de l'afficher directement.
- Le menu « ••• » regroupe le plein écran, les notes et sources, les zooms et vidéos du sujet. Le plein écran conserve la navigation.
- Les commandes OBS restent dans un volet fermé du menu Options. Aucun panneau de régie n'est affiché.
- Raccourcis : 1 à 4 pour les séquences, O pour les sujets, N pour les notes, Z pour le zoom, C pour le chiffre, F pour le plein écran.
- Échap : fermer la vidéo ou le panneau, revenir à la vue normale de la source.

Le Build explique les usages, les outils et la méthode. Il ne lance aucune démonstration. La Bêta reprend l'invitation aux questions et aux prochains essais.

L'écran "Où l'IA vous aide" présente huit idées de produits, une par métier : boutique (carte de fidélité, base clients et SMS), agence immobilière (vitrine et aménagements en 3D), restaurant (menu en 3D), menuisier (configurateur de meubles), garage (explications illustrées et accord client), fleuriste (bouquet personnalisé selon le stock), boulangerie (plan de cuisson) et salon de coiffure (essayage de coupes et couleurs). Chaque écran indique la fonctionnalité et le gain visé. Les notes accessibles dans Options expliquent les données, les médias et les validations nécessaires. La sélection initiale reste conservée dans un volet séparé. Les titres du Radar disposent d'une colonne élargie et ne coupent pas les mots ; les dix titres ont été contrôlés dans la régie et la sortie antenne.

Le Radar utilise dix captures réelles prises dans le navigateur le 16 octobre 2026. `media.js` contient les URL, auteurs et repères vidéo. Le zoom de l'étude de persuasion affiche l'avis de préoccupation éditoriale, distinct de l'article initial. Les autres zooms agrandissent la capture sans en modifier le contenu.

Sur Gemini, le menu Options propose le test de Sam Witteveen (1:32 à 3:02) et la pagode 3D de Google. Cliquer charge et lance le lecteur, sans son. « Fermer la vidéo », Échap ou changer de sujet ferme la vidéo. Les contrôles audio du lecteur sont propres à chaque fenêtre ; activer le son dans la sortie destinée à OBS si nécessaire. La lecture dépend d'Internet et de YouTube. En cas d'échec, revenir à la capture. Il n'y a pas de synchronisation vidéo à l'image près ni de copie locale des vidéos.

## Analyse du support original

Les 22 écrans ont été ouverts et inspectés visuellement en localhost. Les sujets sont : Muse Wonder, Gemini 4 Argon, autoréplication des modèles, actions non souhaitées de Claude, Maia 300, lunettes IA en Norvège, REA, Runway, chaîne du froid piratée, persuasion ; artisans et commerçants, huit usages, cinq outils, méthode et commentaires ; tickets, legacy, revue de code et avenir du métier.

Le support existant emploie une composition répétée en colonnes, avec beaucoup de texte et des métriques dominantes. Il ne montre pas les pages des sources. La hiérarchie se prête à une lecture de présentation ; la conversation dispose de peu de variations visuelles. L'identité sombre, cyan et typographique de SANDBOX est conservée dans BIS, avec des couleurs par séquence et des compositions adaptées aux contenus.

`content.js` conserve exactement les données éditoriales, les notes, actions, transitions et 34 références, ainsi que le texte visible de chaque écran. Les notes restent hors de la sortie OBS. L'ancien support, ses médias et sa démonstration restent à leur emplacement initial.

## Architecture et validation

Fichiers ajoutés dans `experiments/episode-002-bis/` : HTML, CSS, contrôleur, modèle d'état, rendu, données éditoriales, catalogue média, serveur local, assets et tests. Décision : [DD-0045](../design-decisions/dd-0045-episode-002-bis-conducteur-visuel.md).

```powershell
node --test experiments/episode-002-bis/test/*.test.mjs
pnpm exec eslint experiments/episode-002-bis
pnpm exec prettier --check experiments/episode-002-bis
pnpm check
```

Les tests couvrent la conservation éditoriale, l'ordre, la suppression de la démo du parcours, les bornes de navigation, les positions du Clash, les captures locales, les vidéos autorisées, la synchronisation entre clients, la séparation des sessions et le refus des origines externes ou commandes malformées.

Les captures et les deux lecteurs vidéo ont été vérifiés dans le navigateur. La sortie destinée à OBS a été contrôlée dans une fenêtre distincte ; aucun test dans une instance native d'OBS ni mesure CPU/FPS n'a été réalisé. Les sorties conservent leur dernier état si le serveur devient indisponible, puis reprennent la synchronisation à son retour. Un redémarrage remet l'état en mémoire à zéro.

Le contrôle global `pnpm check` a été exécuté et s'est arrêté sur le format de `apps/site/scripts/test-site-rhythm.mjs`, fichier extérieur à ce travail. Il n'a pas été modifié par BIS. Les journaux locaux sont dans `.local/episode-002-bis/`.

Résultats du 16 octobre : 20 tests BIS réussis (14 de modèle/contenu et 6 de serveur), format et lint BIS réussis. `pnpm typecheck` et `pnpm test` réussis. Le lint global relève également cinq erreurs `URL` non défini dans le même script extérieur au périmètre. Les empreintes des 34 fichiers suivis des slides et configurations de production contrôlés sont identiques à l'état avant travail.

Vérification après correction des titres et simplification des cas d'usage : les 14 tests de modèle/contenu passent. Le nouveau `pnpm check` complet passe également (format, lint, types, 656 tests du site, 7 tests vidéo et 4 tests des jingles). Les blocages extérieurs mentionnés ci-dessus ne sont plus présents. Les huit cas d'usage ont été contrôlés dans le navigateur, sans débordement.

L'état Git était déjà modifié avant cette tâche. Une empreinte des fichiers suivis a été enregistrée avant travail. La vérification de préservation porte notamment sur tous les fichiers des slides et les configurations de production ; les changements concurrents hors de ce périmètre ne sont pas attribués à BIS. Aucun commit, push, PR ou déploiement n'a été effectué.

Vérification après simplification de la navigation : 21 tests BIS réussis, dont le parcours exhaustif dans les deux sens. `pnpm check` complet réussi. Dans le navigateur, les flèches passent de Muse 1/3 à 2/3, puis 3/3, puis Gemini 1/3 ; la flèche gauche retrouve Muse 3/3. Le lien historique `?view=director` affiche la vue unique. Les menus Sujets et Options, les notes et la sélection directe des métiers ont été vérifiés. Les 28 fichiers suivis sous `apps/site/public/slides/` ont la même empreinte qu'avant le travail, et leur diff Git est vide. La configuration racine des tests comporte une modification concurrente ajoutant `test:bis` ; elle n'a pas été modifiée lors de cette simplification.
