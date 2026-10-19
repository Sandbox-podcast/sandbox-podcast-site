# DD-0061 News : collecte horaire et fil cumulatif

Date : 2026-10-19. Besoin précisé par Lou ; mise en œuvre décidée par l'agent sur délégation (PD-0003).

Le workflow GitHub Actions existant reste programmé à la minute 23 de chaque heure. Il interroge les dix sources de NEWS_MEDIA, prépare les fiches et leurs quatre langues, puis appelle l'API cron authentifiée. GitHub peut retarder un démarrage ; cette programmation ne garantit pas un intervalle réel de 60 minutes.

Les tables Postgres news_items et news_source_status, créées par la migration 0016 existante, conservent les articles et le dernier état des médias. L'URL canonique unique empêche les doublons. Une nouvelle collecte ajoute ses fiches sans supprimer les anciennes. Les candidats entrants restent limités aux publications des quatorze derniers jours ; cette fenêtre ne limite plus la lecture de l'historique déjà publié.

Le fil public lit 30 articles par requête, du plus récent au plus ancien. Le curseur combine la date et l'identifiant pour parcourir les dates identiques sans répétition. Le bouton de suite appelle GET /api/news et ajoute les résultats au fil. Le plafond de 200 articles et l'expiration des articles affichés après quatorze jours sont retirés de la lecture Postgres. Les filtres côté navigateur s'appliquent aux articles déjà chargés.

Le drapeau SANDBOX_NEWS_PUBLIC autorise le pipeline. La présence de fiches effectivement lisibles autorise la page publique, sa carte et son radar. Un flux vide ou une base indisponible masque ces accès et renvoie 404 sur les quatre pages News. Les aperçus locaux restent distincts et non indexables. Dès qu'un article est lisible, l'accueil choisit le décor studio-news-radar-v4.webp. Cette règle remplace l'ouverture d'une page vide prévue par DD-0059.

Le collecteur retente une fois les erreurs réseau et les réponses HTTP 5xx. Il ne retente pas les refus HTTP 403. There's An AI For That est interrogé normalement à chaque passage au lieu de rester désactivé par une condition dans le code ; un refus reste signalé. Le bilan du workflow liste les sources en échec et échoue si tous les nouveaux candidats sont rejetés par la génération ou la traduction.

Aucune migration, variable distante ou publication supplémentaire n'est incluse dans ce correctif local. Le modèle local absent de ce poste n'a pas été téléchargé ; la génération réelle complète reste à contrôler sur le runner configuré.
