# DD-0075 Suspension temporaire des traductions publiques

- Date : 21 octobre 2026.
- Statut : correctif local, livraison distante à autoriser.
- Décision explicite de Lou : « met le site en français uniquement pour l'instant. retire le choix de langue en haut à droite ».

Les échecs récurrents du job de traduction News déclenchent des emails GitHub. Les marqueurs de protection des nombres sont altérés par le moteur. Une reprise locale laisse aussi une phrase allemande refusée par son contrôle de segmentation.

Le site public est temporairement limité au français. Le sélecteur est retiré de l’en-tête, les URL traduites redirigent en 307 vers leurs chemins français et le sitemap ainsi que les variantes de langue annoncées sont limités au français. Les paramètres des liens sont conservés ; le choix enregistré dans un ancien cookie ne déclenche plus de redirection étrangère.

Le workflow News conserve la collecte, la génération française, la publication et le contrôle de santé. Son job de traduction est retiré. Aucun échec n’est transformé artificiellement en réussite. Les dictionnaires, outils et données traduites restent conservés.

La redirection temporaire permet une réactivation ultérieure. Cette réactivation demandera de rétablir ensemble les langues publiques, le sélecteur, le routage et le traitement de traduction, après correction et recette sur les textes qui échouaient.

Voir le [diagnostic et la validation](../site/incident-emails-news-2026-10-21.md). Aucun changement de compte, préférence de notification, secret ou base distante n’est effectué dans ce lot local.
