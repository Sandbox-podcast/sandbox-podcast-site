# DD-0050 : préparation de l'épisode 003

Date : 18 octobre 2026.

Décision décidée par l'agent sur délégation (PD-0003), à la demande de Lou.

Lou demande de commencer le support de l'épisode 3 avec une dizaine d'actualités du 16 au 18 octobre, à sélectionner ensuite ensemble. Le Build porte sur des skills IA qui donnent des sujets de shorts, avec une recherche sur Instagram et les autres réseaux.

Le support HTML suit l'ordre du dernier épisode : Radar, Build, Clash, Bêta. Il reprend le logo, la police et les visuels de séquence existants. Les nouveaux sujets, sources et propositions de démonstration sont dans `apps/site/public/slides/episode-003/content.json`.

Les dix actualités ont un écran, une capture locale et des notes. La date désigne l'annonce ou la publication d'origine, et non la date d'une reprise. Les démonstrations de skills sont des propositions ; elles ne sont pas présentées comme exécutées. Le relevé skills.sh mesure des installations cumulées, pas des utilisateurs actifs. L'échantillon social comprend des exemples plus anciens, signalés comme références de format.

Chaque actualité et skill démarre avec le choix "À trier". L'équipe peut garder, réserver ou écarter un sujet. Les choix sont enregistrés dans le navigateur et exportables en JSON. Ils ne modifient pas les fichiers éditoriaux ni un compte externe. Le support garde les sujets écartés accessibles pour la discussion.

La préparation initiale reste locale. Le 18 octobre, Lou demande une PR unique pour cette V1. Cette demande autorise sa livraison sur une branche dédiée ; elle ne demande ni fusion ni déploiement en production.

Guide et réserves : [préparation de l'épisode](../site/episode-003-preparation.md).
