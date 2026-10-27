# DD-0047 : parité de l'accueil entre local et production

16 octobre 2026. Lou demande de corriger tous les écarts constatés entre le local et la production. Conception décidée par l'agent sur délégation (PD-0003).

Le plateau utilise ses portraits détourés associés aux animateurs, indépendamment de l'adresse de leur photo dans l'administration. Les photos éditoriales restent intactes.

Les anciennes publications qui contiennent seulement l'accueil de Spotify utilisent désormais la chaîne présente dans `content/site.json`, comme le fait déjà YouTube. Une adresse précise publiée dans l'administration conserve la priorité. Cette compatibilité s'applique à tous les composants qui lisent `siteConfig.platforms`, sans écraser le contenu publié ni son brouillon.

Le vidéoclub devient accessible en mode production depuis la porte du plateau et la vignette mobile. Sa route est également déclarée dans les pages partagées pour les quatre langues, avant la route générique des fiches projet. La porte conserve la langue courante pendant son animation et sa navigation. Le catalogue classique reste accessible. La non-indexation est conservée pour cette seconde présentation des mêmes projets.

Cette décision remplace la restriction au développement de DD-0035 et DD-0039. Elle ne vaut pas publication technique du lot : les règles de commit, push et publication du dépôt restent applicables.

Les contrôles et les limites sont consignés dans [le rapport des écarts](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/ecarts-production-2026-10-16.md).

## Complément : écrans panoramiques et interactions du plateau

Après le merge de la PR 71, Lou signale un chevauchement du titre et du portrait sur son écran panoramique, un clic limité au bas de la voiture et demande une surbrillance sur la porte. Ajustement décidé par l'agent sur délégation (PD-0003).

Les portraits et la typographie du plateau s'adaptent désormais à la hauteur disponible. Au-delà du ratio 2:1, le décor central est cadré et prolongé sur les côtés par une version assombrie et floutée. Les images sources restent intactes. L'accueil mobile éditorial est conservé.

L'en-tête transparent laisse passer les clics vers le décor ; ses liens et son sélecteur de langue restent actifs. La zone de la Time Machine couvre le cadre de la voiture. La porte reçoit un éclairage chaud, un contour et un halo au survol, retirés pendant l'ouverture. Le focus clavier conserve son indication dédiée.

Voir [la validation locale](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/plateau-responsive-2026-10-16.md). Ce complément reste local jusqu'à une nouvelle demande de publication.
