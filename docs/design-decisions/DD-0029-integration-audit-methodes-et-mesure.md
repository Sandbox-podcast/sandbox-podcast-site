# DD-0029 : intégration de l'audit, méthodes et mesure

Date : 2026-10-15. Décidée par l'agent sur délégation (PD-0003), pour traiter les actions locales de l'[issue #68](https://github.com/Sandbox-podcast/sandbox-podcast-site/issues/68).

Cette décision complète DD-0025. Le rapprochement de la copie `audit-confiance-parcours` avec `main` reprend les corrections encore absentes, sans revenir sur les archives, les badges, l'accueil et les éditions horaires déjà livrés.

Chaque édition affiche le dernier relevé inclus, la date du calcul, la publication et sa version. Le lien de méthode conserve l'édition. Les anciennes mesures de stars ou d'installations cumulées ne deviennent pas des variations récentes ; un ancien score Models sans prix n'alimente pas la vue qualité-prix. Un profil v3 affiché doit correspondre à la preuve figée de l'édition. Les scores et autorisations de publication ne changent pas.

Le choix de mesure est daté et valable 180 jours pour l'accord comme pour le refus. Une ancienne valeur non datée, expirée, future ou illisible est redemandée. Le retrait arrête les nouveaux envois, efface les cookies GA4 accessibles et se propage aux autres onglets. Un chargement tardif du tag ne doit pas rejouer les événements retirés. Vercel relit le consentement avant chaque envoi, même après le démontage de son composant.

GA4 reste bloqué par défaut. `NEXT_PUBLIC_GA4_READY=true` ne sera utilisé dans un environnement réel qu'après vérification du flux et désactivation de la mesure améliorée. L'essai antérieur avec `qa-sensitive` avait montré l'envoi automatique du terme de recherche. Les événements manuels conservent uniquement des identifiants contrôlés et des chemins sans requête ni fragment ; l'administration est exclue. Les événements des badges respectent le même verrou.

La page de confidentialité utilise les informations confirmées par Lou : l'équipe du podcast Sandbox, `sandbox.podcast.pro@gmail.com`, durée GA4 retenue de 14 mois. La vérification effective du compte reste une action d'exploitation. Le texte n'affirme pas que cette vérification a été effectuée.

Les polices locales utilisent Next/font avec métriques de repli et `font-display: optional`. Les changements éditoriaux du pilote ne remplacent que la copie historique reconnue ; une nouvelle rédaction dans l'administration est préservée. Les liens épisode/projet utilisent les ressources et les chapitres existants.

Les routes JSON administratives bornent la lecture du flux avant analyse, y compris en l'absence de Content-Length. Elles réutilisent le lecteur borné des images. Le limiteur de tentatives actuel reste propre à chaque processus : cette limite est documentée, sans prétendre à une protection distribuée. Une CSP avec nonce imposerait un rendu dynamique ; la politique conserve le rendu statique actuel et les origines explicites, sans unsafe-eval ni régies publicitaires.

La CI exécute les parcours HTTP sur PGlite éphémère et les parcours de consentement sur Playwright. Les services Analytics sont remplacés par des doubles locaux. Les fichiers éditoriaux de chaque serveur de test sont isolés sous `.local` et refusés en production. Ces tests démontrent le fonctionnement du code, pas la réception dans les propriétés distantes.

Les migrations SQL historiques de la copie d'audit sont exclues de l'intégration. Aucune base distante n'est migrée. Les références de travail utilisent l'issue #68, qui remplace les anciennes issues supprimées à la demande de Lou. Les commits, pushes et publications attendent une demande explicite du propriétaire.

`.gitattributes` fixe les textes à LF sous Windows et en CI. Les migrations SQL historiques et `old/` sont exemptés pour préserver leurs octets ; le formatage ne réécrit pas les licences tierces.
