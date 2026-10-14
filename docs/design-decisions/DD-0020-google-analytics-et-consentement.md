# DD-0020 — Google Analytics et consentement

**Statut :** décidée par l’agent sur délégation (PD-0003)

**Date :** 2026-10-14

## Contexte

Lou demande la connexion du compte Google Analytics au site média `www.sandboxpodcast.fr`. Le site utilise déjà Vercel Analytics. Le code ne contenait pas de flux GA4, de gestion du consentement ou d’identifiant de mesure.

## Décisions

- Ajouter Google Analytics 4 au moyen de `gtag.js`, avec l’identifiant fourni `G-45XWR4KJ1M` intégré comme valeur par défaut et `NEXT_PUBLIC_GA_MEASUREMENT_ID` comme remplacement facultatif.
- Charger Google Analytics et Vercel Analytics uniquement après acceptation explicite de la mesure d’audience. Un refus persiste localement et bloque les deux outils. La bannière permet de modifier ensuite le choix.
- Envoyer les vues de page publiques manuellement, sur le chemin uniquement, sans query string ni fragment. Exclure `/admin`.
- Ne pas ajouter d’événement personnalisé ni de conversion tant qu’une décision métier ne définit pas l’usage attendu.
- Réutiliser une propriété GA4 existante si elle correspond au domaine. L’identifiant fourni n’a pas pu être vérifié dans la session Google ouverte, qui n’a aucun compte Analytics provisionné. Le propriétaire doit confirmer que l’identifiant correspond au domaine ; il doit aussi accepter les conditions d’utilisation et choisir les options de partage des données lui-même.

## Conséquences

- L’identifiant fourni est public et inclus dans le code. `NEXT_PUBLIC_GA_MEASUREMENT_ID` n’est nécessaire que pour remplacer cette valeur par défaut dans l’environnement Production du projet Vercel réellement relié au domaine.
- La mesure améliorée du flux doit être désactivée pour que Google n’émette pas ses propres vues de page en parallèle.
- La décision technique de consentement ne remplace pas la validation de la politique de confidentialité, des mentions sur les cookies ou des réglages de rétention du compte. Cette vérification reste bloquante avant activation.

## Références

- [Documentation Google sur Consent Mode](https://developers.google.com/tag-platform/security/guides/consent)
- [Documentation Google sur la mesure des applications monopages](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications)
- [Plan de mesure et procédure d’activation](../site/google-analytics.md)
