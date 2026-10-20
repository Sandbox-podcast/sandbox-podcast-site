# DD-0068 Textes publics alignés sur la vision de SANDBOX

Date : 20 octobre 2026. Décidée par l'agent sur délégation (PD-0003), après validation par Lou de la direction et de la compatibilité décrite ci-dessous.

## Besoin

Les textes publics présentaient surtout un fil d'actualité et des tests d'outils. [vision.md](../../vision.md) décrit un talk-show sur les effets de l'IA dans les produits et les équipes, animé par deux développeurs et un Product Manager. Les essais et les projets nourrissent cette discussion.

## Décision

La promesse d'accueil devient "Ce que l'IA change pour ceux qui construisent." Le repère "Le talk-show IA, engineering et produit" précise le format. L'introduction expose les trois points de vue : "Deux développeurs et un Product Manager confrontent leurs expériences de l'IA, du code aux choix produit et au travail des équipes."

Les textes des pages Émission, À propos, Projets, News, Charts et Time Machine reprennent cette direction, avec les limites réelles de chaque rubrique. News garde sa mention de synthèse automatique et ses sources. Charts présente les mesures disponibles et les critères, sans prétendre que l'équipe a testé chaque projet ou modèle. La Time Machine conserve ses événements sourcés et sa disponibilité en français. Les contenus factuels des épisodes, articles et fiches, les textes légaux et les fonctions d'administration restent hors de cette réécriture. Les formulations retenues figurent dans le [travail de positionnement](../site/pitch-vision-2026-10-20.md).

## Anciennes publications de réglages

Les réglages publiés depuis l'administration remplacent les réglages Git. Modifier seulement `content/site.json` laisserait donc les anciens textes actifs sur un site possédant déjà une publication.

La compatibilité s'applique à la lecture publique, dans `setSiteSettingsOverride`. Pour chacun des neuf champs de présentation, `resolvePublishedSiteSettings` compare la valeur à une liste fermée de textes historiques exacts, attestés dans Git et les publications observées. Seule une égalité exacte reprend le texte actuel de Git. Les apostrophes différentes sont des variantes distinctes et ne sont ajoutées que lorsqu'elles ont été relevées. Aucun rapprochement approximatif, nettoyage des espaces ou remplacement global ne s'applique.

Un enregistrement mêlant ancien titre et introduction personnalisée reçoit uniquement le nouveau titre. Le nom, le mot-symbole, les plateformes et les autres données ne font pas partie de cette compatibilité. La fonction renvoie une copie, sans modifier la publication chargée. Aucune écriture Postgres, aucun enregistrement admin et aucune migration ne sont déclenchés.

Limite acceptée : si le propriétaire réutilise volontairement une valeur historique exactement identique pour l'un de ces neuf champs, la lecture publique affichera le texte actuel de Git. Le texte enregistré restera intact. Pour afficher à nouveau cette phrase historique à l'identique, une évolution explicite de la liste de compatibilité sera nécessaire. Les textes personnalisés différents, même d'un seul espace, sont conservés.

## Contrôles

Les tests couvrent les anciennes valeurs, les variantes publiques attestées, les champs manquants, les réglages partiellement personnalisés, l'absence de mutation et le rendu d'un titre personnalisé. Un test d'intégration charge une ancienne publication Postgres, vérifie les nouveaux textes dans l'accueil et À propos, puis vérifie que le contenu stocké et l'API d'écriture n'ont pas changé.

La recette HTTP locale utilise aussi une publication ancienne réelle, conservée dans le fichier local de contenu. La recette navigateur contrôle les titres, les traductions, les boutons et les mises en page de 320 à 1440 pixels. Le repère du hero et son titre sont regroupés dans le flux pour éviter le chevauchement observé avec le nouveau titre sur ordinateur.

## Variantes constatées après livraison

La recette publique du 20 octobre, après le déploiement du commit `1f4ead0`, a relevé deux variantes enregistrées en production : "Un podcast pour y voir plus clair." et "Podcast indépendant · IA · développement · open source". Les dictionnaires Git attestaient déjà ces deux textes historiques. Leur ajout à la liste fermée corrige le titre et le sur-titre dans les quatre langues sans connexion admin ni modification du stockage. Les tests vérifient ces valeurs exactes et conservent les contrôles des textes personnalisés.

## Livraison

Le changement reste local jusqu'à autorisation de publication. Les profils sociaux disposent de textes préparés séparément ; ce travail ne les modifie pas à distance.
