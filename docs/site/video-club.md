# Vidéoclub des projets

Le 16 octobre, la correction des écarts de production retire la restriction au développement. La porte et la vignette mobile sont disponibles dans le build de production, avec des routes dans les quatre langues. Voir [DD-0047](../design-decisions/dd-0047-parite-accueil-production.md). Les validations historiques ci-dessous décrivent le prototype initial.

Les boîtiers fermés et ouverts utilisent maintenant des assets VHS photographiques avec fond transparent. La cassette ouverte remplace le dessin CSS initial. Voir [les assets, prompts et contrôles](refonte-2026-10-15/accueil-plein-ecran-et-vhs.md) et [DD-0038](../design-decisions/dd-0038-accueil-plein-ecran-portraits-reels-et-vhs.md).

Prototype demandé par Lou le 15 octobre 2026. Décision : [DD-0035](../design-decisions/dd-0035-videoclub-local-des-projets.md).

## Essayer en local

Depuis le dépôt :

```powershell
pnpm --filter @podcast/site exec next dev --webpack --hostname 127.0.0.1 --port 3219
```

Ouvrir `http://127.0.0.1:3219/nos-projets/video-club`.

Depuis l'accueil local, la petite porte à droite dans le décor ouvre directement les rayons. Le lien "Retour au plateau" revient à l'accueil. [Image, intégration et validation](refonte-2026-10-15/porte-video-club.md).

La [dernière version du décor](refonte-2026-10-15/decor-chaleureux-et-porte-animee.md) reprend l'image chaleureuse fournie par Lou. La porte s'ouvre au clic avant l'entrée ; la réduction des mouvements donne un accès immédiat.

1. Entrer dans le vidéoclub.
2. Choisir le rayon d'un créateur en bas de l'écran. Les flèches gauche et droite changent de rayon lorsque le décor a le focus ; haut avance, bas recule.
3. Cliquer une VHS pour la ramasser.
4. Ouvrir la boîte pour afficher la fiche. Les vidéos se chargent au clic sur leur bouton de lecture.
5. Reposer la cassette avec le bouton ou Échap.

La recherche atténue les autres titres sans déplacer les cassettes et cadre le rayon du premier résultat. La liste donne accès aux mêmes projets. Le lien "Catalogue classique" revient à la vue actuelle.

## Périmètre

Les 34 projets et leurs médias viennent de `content/personal-projects.json`. Aucun appel à une base ou à un fournisseur 3D n'est nécessaire pour parcourir les rayons. Les vidéos distantes conservent les limites décrites dans [Nos projets](nos-projets.md).

Le décor principal utilise une image photoréaliste générée avec ImageGen. Les cassettes restent des éléments HTML interactifs, superposés aux étagères. La perspective CSS et les positions de caméra prédéfinies déplacent l'ensemble. Le décor CSS initial reste disponible en repli si l'image échoue. Il ne propose pas de déplacement libre. Les mouvements sont supprimés si la préférence système le demande. Les mobiles disposent des boutons de rayon et de la liste. [Image, provenance et prompt](video-club-image.md).

La page est accessible dans les builds de développement et de production. Elle conserve une directive de non-indexation et les liens vers le catalogue classique.

## Validation

L'entrée depuis le plateau et les boutons de chaînes sont vérifiés dans le [rapport du 15 octobre](refonte-2026-10-15/porte-video-club.md). Après cette intégration, `pnpm check` passe avec 615 tests du site et 11 tests média.

Les tests `test/video-club.test.ts` vérifient l'inventaire complet, les attributions, la conservation du catalogue, les positions de caméra, l'accès en production, les routes multilingues et la reprise des sources et vidéos sans chargement automatique.

L'itération photoréaliste ajoute le contrôle de présence du décor WebP dans le projet, son budget de 500 Ko et son utilisation sans dépendre du dossier de génération. Les six tests du vidéoclub passent séparément après cette modification.

Après intégration du décor, `pnpm check` passe avec 611 tests du site et 11 tests média. La première exécution dans le bac à sable Windows échouait sur des fichiers temporaires de transformation absents ; la relance hors bac à sable passe sans modification des tests. Le navigateur confirme le chargement de l'image, les 34 titres, l'ouverture de Sillage et l'absence de lecteur vidéo avant clic. À 390 x 844 pixels, la sélection de Sillage dans le rayon Nicolas et la fermeture par Échap fonctionnent. Le cadrage est restauré sur ordinateur.

Validation locale du 15 octobre 2026 : `pnpm check` passe (formatage, lint, types, 610 tests du site et 11 tests média). Les cinq tests propres au vidéoclub passent aussi séparément. Aucun test ni contrôle désactivé.

Le parcours navigateur vérifie l'entrée, le rayon Nicolas, la sélection de Sillage, l'ouverture de la boîte, l'affichage de sa fiche et le chargement de sa vidéo au clic. La lecture de Sillage avance jusqu'à 46 secondes sans erreur du lecteur (`readyState` 4). La fermeture retire le lecteur. L'essai à 390 x 844 pixels vérifie la sélection dans le rayon Nicolas, la fermeture par Échap, une recherche sans résultat et sa remise à zéro. Le cadrage est ensuite restauré sur ordinateur.

Captures prises dans le navigateur : entrée, rayons, cassette en main, fiche Sillage et entrée mobile. Elles sont conservées dans les fichiers de restitution de la conversation, hors Git. Le prototype n'a pas été déployé. La réduction des mouvements est implémentée dans le CSS et dans l'ouverture ; son comportement système n'a pas fait l'objet d'une émulation navigateur.

## Habillage du 16 octobre 2026

L'interface du magasin et des fiches reprend désormais l'ivoire, l'encre et le cyan de l'accueil V11. Les photographies du décor et des VHS sont conservées. Voir [DD-0040](../design-decisions/dd-0040-videoclub-habillage-editorial.md) et [les contrôles du lot](refonte-2026-10-15/refonte-editoriale-mobile-v11.md).
