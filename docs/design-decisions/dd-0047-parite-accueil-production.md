# DD-0047 : parité de l'accueil entre local et production

16 octobre 2026. Lou demande de corriger tous les écarts constatés entre le local et la production. Conception décidée par l'agent sur délégation (PD-0003).

Le plateau utilise ses portraits détourés associés aux animateurs, indépendamment de l'adresse de leur photo dans l'administration. Les photos éditoriales restent intactes.

Les anciennes publications qui contiennent seulement l'accueil de Spotify utilisent désormais la chaîne présente dans `content/site.json`, comme le fait déjà YouTube. Une adresse précise publiée dans l'administration conserve la priorité. Cette compatibilité s'applique à tous les composants qui lisent `siteConfig.platforms`, sans écraser le contenu publié ni son brouillon.

Le vidéoclub devient accessible en mode production depuis la porte du plateau et la vignette mobile. Sa route est également déclarée dans les pages partagées pour les quatre langues, avant la route générique des fiches projet. La porte conserve la langue courante pendant son animation et sa navigation. Le catalogue classique reste accessible. La non-indexation est conservée pour cette seconde présentation des mêmes projets.

Cette décision remplace la restriction au développement de DD-0035 et DD-0039. Elle ne vaut pas publication technique du lot : les règles de commit, push et publication du dépôt restent applicables.

Les contrôles et les limites sont consignés dans [le rapport des écarts](../site/ecarts-production-2026-10-16.md).
