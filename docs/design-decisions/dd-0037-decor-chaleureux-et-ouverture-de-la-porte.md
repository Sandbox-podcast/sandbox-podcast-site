# DD-0037 : décor chaleureux et ouverture de la porte

15 octobre 2026. Décidée par l'agent sur délégation (PD-0003), selon les demandes de Lou. Cette décision remplace le visuel de DD-0033 et DD-0036, et complète le parcours de DD-0035.

Lou fournit une [image de studio](https://chatgpt.com/s/m_6ad126abd10881918935aa7673c1f5eb) avec une table en bois, trois sièges vides, des plantes et des éclairages chauds. Il demande de l'utiliser sur l'accueil, d'y ajouter la porte du vidéoclub, puis d'animer son ouverture.

Le fond de l'accueil utilise cette image, optimisée en WebP. Une variante complète intègre la porte dans le panneau sombre à droite des étagères. La légende devient "Décor provisoire" : l'image fournie ne montre pas les animateurs. Les originaux et les versions précédentes sont conservés.

En développement, le clic fait pivoter le battant vers l'intérieur. Le vidéoclub apparaît dans l'ouverture, puis le cadrage se rapproche avant la navigation. Le parcours dure 1,1 seconde. Le battant réutilise les pixels du décor, avec un découpage CSS ; aucune image de porte indépendante n'est ajoutée. Le magasin n'est chargé dans l'ouverture qu'au clic.

Le lien reste natif sans JavaScript et avec les clics modifiés. L'entrée est immédiate si les mouvements sont réduits par le système ou par le bouton du plateau. Le retour navigateur réinitialise la porte. Le vidéoclub et son entrée restent réservés au développement. Les boutons YouTube et Spotify gardent leurs destinations.

[Provenance, prompt et contrôles](../site/refonte-2026-10-15/decor-chaleureux-et-porte-animee.md).
