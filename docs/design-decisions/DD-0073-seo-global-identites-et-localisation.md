# DD-0073 : référencement global, identité et métadonnées traduites

20 octobre 2026. Décision prise par l’agent sur délégation (PD-0003). Lou précise que l’optimisation concerne tout le site ; les recherches sur les skills restent un axe prioritaire dans ce périmètre.

## Constat

Le crawl du sitemap public porte sur 569 URL dans les quatre langues. Elles satisfont le contrôle HTTP, robots et canonique ; chacune présente un titre, une description et un seul H1. Les 88 groupes de titres identiques entre langues et les 73 groupes de descriptions identiques demandent une analyse : les noms propres peuvent rester communs, mais les modèles dynamiques des classements et des fiches GitHub doivent être traduits.

## Décisions

- Décrire chaque famille de classement dans le titre SEO, avec un texte propre à la langue. Les archives conservent leur identifiant d’édition et indiquent leur caractère historique. La présentation graphique `TOP 20` reste indépendante du titre SEO.
- Traduire les titres et descriptions des fiches GitHub à partir d’un modèle déterministe. Conserver les noms et identifiants de dépôt. Ne pas recopier une description externe non traduite, tronquée au milieu d’un mot, dans toutes les variantes de langue.
- Centraliser les identités `WebSite` et `Organization`, avec des identifiants stables et les profils sociaux déjà affichés publiquement. Le nom du publisher suit les réglages publiés, y compris après leur chargement depuis le stockage éditorial.
- Afficher sur À propos les biographies et rôles déjà publiés. Décrire les animateurs comme personnes identifiées, sans ajouter de qualification ou de titre professionnel. Relier les épisodes aux mêmes identités.
- Décrire chaque fiche de projet comme une page documentaire sur une création, avec auteur, sources et date de vérification. Ne pas inventer de note, de tarif ou de date de lancement.
- Générer les variantes de langue du sitemap avec la même fonction que les métadonnées HTML, y compris `x-default`. Une locale non autorisée ne peut pas hériter du `index:true` de sa source.
- Renseigner la date de modification des classements à partir de leur publication réelle. Une archive conserve la date de sa propre édition ; les méthodes et profils sans date disponible restent sans date. La page des replays utilise la publication du dernier épisode.

## Conséquences et limites

Les routes restent stables. Les barrières sur les brouillons, les fixtures et les classements sans données réelles ne changent pas. Les biographies sont reprises de contenus existants et passent par les traductions du site.

Ce lot n’applique pas de configuration Search Console, DNS ou hébergement. Lou autorise ensuite la création d’une PR pour les corrections SEO ; aucune fusion dans `main` n’est effectuée par cette livraison. Une position dans Google ne se déduit pas de l’accessibilité technique. Voir [audit et validation](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/seo-global-2026-10-20.md).
