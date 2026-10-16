# Mesure d'audience et consentement

Le site utilise Vercel Web Analytics après accord. Le tag GA4 via `gtag.js` est prêt mais bloqué par défaut tant que la configuration de son flux n'est pas validée. L'identifiant fourni par Lou est `G-45XWR4KJ1M` ; `NEXT_PUBLIC_GA_MEASUREMENT_ID` peut le remplacer. La page `/confidentialite` et le pied de page donnent accès aux préférences.

Le responsable confirmé est " L'équipe du podcast Sandbox ", joignable à `sandbox.podcast.pro@gmail.com`. La propriétaire indique une conservation GA4 des événements de 14 mois. Le choix d'accepter ou de refuser est daté et vaut 180 jours. Les anciennes valeurs sans date sont redemandées. Le retrait bloque les nouveaux envois et efface les cookies GA4 accessibles au site ; il ne supprime pas les données déjà reçues. Les cookies GA4 expirent après 180 jours sans prolongation automatique.

Voir [DD-0020](../design-decisions/DD-0020-google-analytics-et-consentement.md) pour le choix initial et [DD-0029](../design-decisions/DD-0029-integration-audit-methodes-et-mesure.md) pour cette correction.

## Plan de mesure

| Événement                | Déclenchement                                   | Paramètres utiles                                |
| ------------------------ | ----------------------------------------------- | ------------------------------------------------ |
| `page_view`              | Nouveau chemin public après accord              | Chemin, titre, référent sans requête ni fragment |
| `episode_play_requested` | Clic pour charger le lecteur                    | Numéro d'épisode                                 |
| `episode_source_open`    | Clic sur une source d'épisode                   | Numéro d'épisode, index de ressource             |
| `episode_project_open`   | Clic de l'épisode vers un projet                | Numéro d'épisode, slug du projet                 |
| `project_episode_open`   | Clic d'un projet vers l'épisode ou son chapitre | Numéro d'épisode, slug du projet                 |

Une demande de lecteur ou un clic ne prouve pas un visionnage. Les conversions YouTube sont relevées dans Studio avec leur période et leur attribution. Les événements manuels ne contiennent ni texte saisi, ni e-mail, ni URL de ressource. Le titre de la recherche est fixe. La zone `/admin` est exclue. Les signaux Google et la personnalisation publicitaire sont désactivés.

Le 14 octobre, l'essai de recherche `qa-sensitive` sur le build de production a observé ce marqueur dans un événement automatique `view_search_results`. Nos événements manuels étaient expurgés, mais la mesure améliorée les contournait. La variable `NEXT_PUBLIC_GA4_READY` vaut donc `false` par défaut. La mesure améliorée du flux GA4 doit rester désactivée : les vues sont envoyées manuellement pour éviter les doublons et les URL de recherche brutes. Les événements standards propres à GA4, comme `session_start`, peuvent subsister. Le filtre `beforeSend` de Vercel relit le choix et son expiration à chaque envoi, même si le script a survécu à son composant.

## Vérification de la réception

### Événements de découverte ajoutés le 15 octobre

`discovery_open` mesure les liens principaux de l'accueil, avec une destination parmi `charts`, `time-machine`, `podcast` et `projects`. `youtube_open` couvre les liens directs de l'accueil, du podcast, de la fiche d'épisode et du pied de page. Le numéro d'épisode n'est fourni que lorsqu'un replay précis est visé. `experience_interaction` distingue les onglets, l'ouverture de l'explication des données, la demande de copie d'un lien et la demande d'export. Un clic de partage ne prouve pas la réussite de la copie.

Ces événements passent par le même accord, le même contrôle d'expiration et le même verrou GA4. Les paramètres `placement`, `destination` et `action` sont limités à des listes fermées. Ils ne contiennent pas le texte de recherche. Les pages vues permettent d'étudier les entrées et le parcours de la découverte à l'épisode, puis à YouTube ; les clics vers YouTube doivent être rapprochés des données de Studio, sans les assimiler à des abonnements. Aucune cible chiffrée n'est fixée avant une première période d'observation.

La réception et l'attribution dans les comptes distants restent à vérifier lors de l'activation. Référence technique : [événements GA4](https://developers.google.com/analytics/devguides/collection/ga4/events).

### Contrôles de configuration

Les tests du 14 octobre sur le build local de production observent le chargement du tag et une transmission `page_view` seulement après acceptation. Le refus ne charge pas le tag ; après retrait, les navigations observées n'ajoutent pas d'envoi. Le collecteur Google répond de manière opaque au navigateur : un statut JavaScript 0 ne signifie ni HTTP 0 ni validation dans une propriété.

La session GA4 accessible affiche le compte " bress " sans propriété Sandbox. Le connecteur Vercel refuse l'accès au projet de production attendu, `sandboxpodcastpro-5518/sandbox-podcast`. Ces accès restent nécessaires pour confirmer l'association du flux, la désactivation de la mesure améliorée et la réception dans les rapports. Aucune propriété ni préférence de compte n'a été créée ou modifiée.

1. Ouvrir la propriété existante du podcast et vérifier son identifiant de mesure et son domaine.
2. Vérifier la conservation déclarée de 14 mois et la désactivation de la mesure améliorée.
3. Après désactivation de la mesure améliorée, construire une prévisualisation avec `NEXT_PUBLIC_GA4_READY=true`. Vérifier qu'aucun terme saisi ni paramètre d'URL ne part, puis tester accepter, refuser, retirer et naviguer vers un second chemin.
4. Vérifier `page_view` et les actions ci-dessus dans Temps réel ou DebugView, puis l'absence de nouveaux événements après retrait.
5. Activer le même réglage sur la production seulement après ces contrôles. Vérifier aussi la collecte Vercel sur le projet qui sert le domaine public. Les captures locales et la validation du filtre ne prouvent pas l'activation distante.

## Sources

Les mentions reprennent les choix confirmés par la propriétaire et le fonctionnement du code. Références : [information des personnes, CNIL](https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence), [conservation du choix, CNIL](https://www.cnil.fr/en/cnil-direct/question/cookies-si-jai-refuse-ses-cookies-un-site-web-peut-il-me-redemander-de-les), [CSP Google sans fonctions publicitaires](https://developers.google.com/tag-platform/security/guides/csp), [conservation GA4](https://support.google.com/analytics/answer/7667196), [mesure améliorée](https://support.google.com/analytics/answer/9216061), [vues automatiques et changements de page](https://developers.google.com/analytics/devguides/collection/ga4/views), [données Vercel Web Analytics](https://vercel.com/docs/analytics/privacy-policy).
