# Mesure d’audience Google Analytics

Le site conserve Vercel Analytics et ajoute Google Analytics 4 via `gtag.js`. L’identifiant `G-45XWR4KJ1M` fourni par la propriétaire est intégré comme valeur par défaut ; `NEXT_PUBLIC_GA_MEASUREMENT_ID` peut le remplacer si nécessaire. Les deux outils mesurent la fréquentation seulement après un choix explicite dans la bannière. Le site envoie manuellement un événement `page_view` par chemin, sans requête ni fragment d’URL. Les routes `/admin` ne sont pas mesurées. Aucun événement personnalisé de conversion, de formulaire ou de clic n’est défini. Google Analytics peut aussi générer ses événements automatiques standards (par exemple `first_visit`, `session_start` et `user_engagement`).

Décision de conception : [DD-0020](../design-decisions/DD-0020-google-analytics-et-consentement.md).

Cette règle technique est décidée par l’agent sur délégation (PD-0003). Elle ne vaut pas validation juridique des traitements ni des mentions d’information, qui restent à vérifier par la propriétaire avant activation.

## Plan de mesure

| Événement   | Déclenchement                                                             | Données envoyées                                                   |
| ----------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `page_view` | Chargement ou navigation vers un nouveau chemin public, après acceptation | Chemin, titre de page, référent réduit à son origine et son chemin |

Les paramètres de requête et fragments sont retirés des vues et du contexte de page. Les identifiants de compte, formulaires et clics ne sont pas envoyés par cette intégration. La mesure améliorée du flux doit rester désactivée pour empêcher les événements automatiques de défilement, clics sortants et changements d’historique en plus des vues manuelles.

À la date du 14 octobre 2026, l’identifiant `G-45XWR4KJ1M` a été fourni par la propriétaire et intégré. La session Google ouverte pour cette configuration n’a pas de compte Analytics provisionné ; l’association de cet identifiant à un flux Web pour `www.sandboxpodcast.fr` n’a donc pas pu être vérifiée. L’assistant Google affiche les conditions d’utilisation et les choix de partage de données du compte. La session Vercel actuellement connectée n’a pas accès au projet de production ; le projet attendu est `sandboxpodcastpro-5518/sandbox-podcast` selon la [fiche de mise en service](mise-en-service-neon-vercel.md).

## Activation

1. Dans la session Google voulue, créer/provisionner le compte Analytics si nécessaire. Le propriétaire doit lire et accepter les conditions d’utilisation lui-même et décider des options de partage de données. Si le compte existe sous une autre session Google, réutiliser celui-là plutôt que créer un doublon.
2. Vérifier que `G-45XWR4KJ1M` est bien l’identifiant du flux Web de `www.sandboxpodcast.fr`. Si ce n’est pas le cas, sélectionner ou créer le bon flux et remplacer l’identifiant intégré.
3. Dans les réglages du flux, désactiver la mesure améliorée : le site envoie lui-même les vues `page_view` afin de retirer les requêtes des URL et d’éviter les doublons. Les événements automatiquement collectés par GA4, comme `session_start`, peuvent toutefois subsister.
4. Le code inclut déjà l’identifiant par défaut. Si l’identifiant du flux diffère, ajouter `NEXT_PUBLIC_GA_MEASUREMENT_ID` à **Production uniquement** sur le projet Vercel qui sert `www.sandboxpodcast.fr`. Ne pas mettre de secret dans cette variable : l’identifiant de mesure est public.
5. Redéployer, accepter la mesure sur le site, puis vérifier `page_view` dans Temps réel ou DebugView. Refuser doit laisser les deux outils de mesure inactifs ; le contrôle « Préférences de mesure » permet de changer ensuite le choix.

La mise en production reste en attente de la vérification de l’identifiant fourni, de l’accès au bon projet Vercel et de la revue des mentions légales / cookies. Le compte Analytics et le domaine n’ont pas été modifiés par ce changement local.
