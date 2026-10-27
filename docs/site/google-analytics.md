# Mesure d'audience et consentement

Le site utilise Vercel Web Analytics après accord. Le tag GA4 via `gtag.js` est activé en production depuis le 16 octobre 2026 après validation du flux et du consentement. Le code conserve un blocage par défaut en l'absence de `NEXT_PUBLIC_GA4_READY=true`. L'identifiant fourni par Lou est `G-45XWR4KJ1M` ; `NEXT_PUBLIC_GA_MEASUREMENT_ID` peut le remplacer. La page `/confidentialite` et le pied de page donnent accès aux préférences.

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

Le 16 octobre vers 15 h 33 UTC, la recette sur le domaine public a confirmé `youtube_open` dans Temps réel, avec `placement=home`, puis `experience_interaction` après ouverture des explications du classement. Le choix de mesure du navigateur a ensuite été remis au refus. Les liens des objets du plateau vers Charts, Time Machine et le vidéoclub ne portaient pas l'événement de découverte ; le correctif déployé les couvre, ainsi que l'entrée mobile du vidéoclub. La réception depuis le plateau est confirmée le 17 octobre.

Le 17 octobre, la recette après déploiement confirme la réception de `discovery_open` depuis le plateau, `youtube_open` et `experience_interaction` dans GA4. Speed Insights charge après accord ; le tableau Production/Mobile ne contient encore aucun événement. L'accord est retiré après recette et les scripts sont absents après rechargement. Les performances mobiles réelles et l'attribution YouTube restent à vérifier. Voir le [suivi du 17 octobre](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/suivi-issue-68-2026-10-17.md).

Le 16 octobre, les cinq événements du plan initial et `discovery_open` ont été reçus dans Temps réel. Les vues effectivement obtenues sur YouTube restent à rapprocher des clics mesurés sur le site. Voir le [compte rendu de mise en service](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/issue-68-mise-en-service-2026-10-16.md). Référence technique : [événements GA4](https://developers.google.com/analytics/devguides/collection/ga4/events).

### Contrôles de configuration

Les tests du 14 octobre sur le build local de production observent le chargement du tag et une transmission `page_view` seulement après acceptation. Le refus ne charge pas le tag ; après retrait, les navigations observées n'ajoutent pas d'envoi. Le collecteur Google répond de manière opaque au navigateur : un statut JavaScript 0 ne signifie ni HTTP 0 ni validation dans une propriété.

Le compte Google Sandbox a été sélectionné le 16 octobre dans la session existante. La propriété `558931246` et le flux `16126152490` correspondent au domaine public et à l'identifiant de mesure attendu. Avec l'accord de Lou, la mesure améliorée a été désactivée et la conservation des événements portée à 14 mois. Ces réglages ont été relus après enregistrement. Le déploiement Vercel et les contrôles ont été réalisés par la console du projet `sandboxpodcastpro-5518/sandbox-podcast`, accessible dans le navigateur.

Procédure à conserver pour les futures activations :

1. Ouvrir la propriété existante du podcast et vérifier son identifiant de mesure et son domaine.
2. Vérifier la conservation déclarée de 14 mois et la désactivation de la mesure améliorée.
3. Après désactivation de la mesure améliorée, construire une prévisualisation avec `NEXT_PUBLIC_GA4_READY=true`. Vérifier qu'aucun terme saisi ni paramètre d'URL ne part, puis tester accepter, refuser, retirer et naviguer vers un second chemin.
4. Vérifier `page_view` et les actions ci-dessus dans Temps réel ou DebugView, puis l'absence de nouveaux événements après retrait.
5. Activer le même réglage sur la production seulement après ces contrôles. Vérifier aussi la collecte Vercel sur le projet qui sert le domaine public. Les captures locales et la validation du filtre ne prouvent pas l'activation distante.

## Sources

Les mentions reprennent les choix confirmés par la propriétaire et le fonctionnement du code. Références : [information des personnes, CNIL](https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence), [conservation du choix, CNIL](https://www.cnil.fr/en/cnil-direct/question/cookies-si-jai-refuse-ses-cookies-un-site-web-peut-il-me-redemander-de-les), [CSP Google sans fonctions publicitaires](https://developers.google.com/tag-platform/security/guides/csp), [conservation GA4](https://support.google.com/analytics/answer/7667196), [mesure améliorée](https://support.google.com/analytics/answer/9216061), [vues automatiques et changements de page](https://developers.google.com/analytics/devguides/collection/ga4/views), [données Vercel Web Analytics](https://vercel.com/docs/analytics/privacy-policy).
