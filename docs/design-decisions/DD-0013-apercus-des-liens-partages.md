# DD-0013 - Aperçus des liens partagés

- Date : 2026-10-12
- Statut : accepté pour l'implémentation locale
- Décision : décidée par l'agent sur délégation (PD-0003)

## Contexte

Les pages sans carte dédiée annonçaient une adresse d'image qui renvoyait une erreur 404 : Next.js publie les cartes propres aux pages sous une URL avec empreinte. Les pages localisées devaient aussi fournir une image accessible aux réseaux sociaux. Le visuel générique ne reprenait pas le logo officiel.

## Décision

Le visuel générique devient une carte 1200 x 630 avec le logo officiel, le fond bleu nuit et les deux rubriques du site, Podcasts et SANDBOX CHARTS. Il ne dépend d'aucun épisode. La description générale résume le podcast, les sources et les classements sans annoncer de données déjà publiées.

Une route stable, `/api/social-image`, sert ce visuel aux pages sans carte dédiée et aux pages localisées. Les pages françaises avec une carte dédiée laissent Next.js produire l'URL avec empreinte pour Open Graph et X. La même image est annoncée pour les deux réseaux. Les variantes localisées gardent leurs titres et descriptions traduits et utilisent la carte de marque tant qu'aucun visuel traduit ne leur est associé.

Le domaine des liens absolus vient de `SITE_URL` ou de `VERCEL_PROJECT_PRODUCTION_URL`, comme pour les URL canoniques. Le blocage d'indexation des contenus de démonstration reste en place.

## Vérification

Contrôler le titre, la description, `og:image` et `twitter:image` dans le HTML de l'accueil, d'un épisode, d'un classement et d'une page localisée. Ouvrir chaque URL d'image publiée et vérifier la réponse PNG 1200 x 630. Le test `social-share.test.ts` couvre le choix du visuel et le rendu de la carte de marque.
