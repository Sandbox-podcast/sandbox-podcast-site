# ADR-0022 — Traductions déclenchées dans le harnais

- Date : 2026-10-08
- Statut : implémentation locale
- Déclenchement manuel et fichiers locaux : choix explicite de Lou
- Architecture : décidée par l’agent sur délégation (PD-0003)

## Contexte

Lou demande les mêmes pages, contenus et assets dans les 115 langues disponibles. Les textes éditoriaux du site sont encore simulés ; les classements de production utilisent des données réelles. Après avoir évoqué une génération automatique depuis l’admin, Lou précise que les traductions seront déclenchées manuellement par un prompt dans le harnais. Aucun service externe de traduction n’est prévu.

## Décision

La publication d’un contenu ne déclenche aucune traduction. Les fichiers locaux constituent la base de l’interface et des traductions versionnées. L’admin exporte les textes publiés et le dictionnaire de la langue cible. Le harnais prépare seulement les entrées manquantes, traduit des lots et produit des JSON validables et réimportables.

L’extraction couvre les textes du site, thèmes, animateurs, épisodes publiés, chapitres, ressources, fiches, avis et méthodes. Les textes des éditions de classements publiées sont inclus ; les scores, rangs, métriques, identifiants, URLs et médias ne sont pas traduits. Les descriptions complètes et fragments de balisage sont extraits ensemble.

Chaque texte source possède une empreinte SHA-256 après normalisation des espaces. L’import vérifie la source courante, les nombres, liens, paramètres, références et code. Les lots invalides sont refusés avant écriture. Les imports sont idempotents par langue et empreinte. Une correction met à jour cette traduction ; un texte source modifié crée une nouvelle identité et ne reçoit pas l’ancienne traduction.

En développement, les imports sont conservés dans un JSON ignoré par Git. Sur Vercel, la migration additive 0006 stocke les traductions dans `site_translation_messages` sur Neon. Le dictionnaire servi combine les fichiers locaux et ces imports manuels. Le rôle admin et une requête de même origine sont requis pour importer ; viewer/editor peuvent exporter les sources. L’import invalide les pages pour afficher les nouvelles traductions.

Le harnais ne publie pas seul et ne fait aucun appel à une API de traduction. Le propriétaire valide la migration et la mise en production. L’import ne change pas les barrières SEO d’ADR-0020 : les pages partagées traduites restent `noindex` avant relecture.

## Conséquences

Le nouveau contenu reste visible dans toutes les langues, avec sa source en attendant le passage manuel dans le harnais. La génération consomme le budget du harnais choisi par l’équipe. Une traduction remplie n’est pas une traduction relue : les langues régionales et variantes nécessitent une revue native. Aucun service, clé IA ou tâche planifiée supplémentaire n’est nécessaire dans Vercel.

Voir [le prompt et la procédure](../site/prompt-traductions-harnais.md). La validation locale porte sur le format, le rendu, les droits et la persistance ; elle ne prétend pas certifier toutes les traductions linguistiques.
