# DD-0069 — Aperçu du vidéoclub à travers la porte

20 octobre 2026. Prototype demandé par Lou après la référence [Three.js / Ian Curtis](https://x.com/threejs/status/2112354428322038013). Réalisation locale autorisée dans la conversation. Choix techniques décidés par l'agent sur délégation (PD-0003).

## Comportement

Sur le plateau défini dans [DD-0064](dd-0064-accueil-impact-ia-et-plateau-au-scroll.md), survoler la porte révèle le vidéoclub dans une ouverture lumineuse. Le déplacement du pointeur décale légèrement l'intérieur. Le focus clavier montre le même aperçu. Le clic ou Entrée agrandit l'ouverture pendant 720 ms, puis rejoint le vidéoclub dans la langue courante.

Le portail reprend la photographie existante du magasin et jusqu'à six pochettes réelles par auteur. Le serveur transmet uniquement les noms, couleurs, identifiants et chemins d'image nécessaires. Aucun projet n'est inventé pour remplir les places.

## Réalisation

Un composant client isolé complète la photographie et les liens existants. Le masque, la lumière et la profondeur utilisent CSS ; aucune dépendance 3D n'est ajoutée. La traversée utilise une couche fixe hors du conteneur du plateau pour éviter le découpage par ses transformations.

Les médias de l'aperçu sont montés au premier survol ou focus. Le portail reste masqué jusqu'au chargement du décor. Un clic avant ce chargement ou après son échec conserve la navigation native. Les clics modifiés conservent leur comportement natif.

Échap ferme l'aperçu et annule une traversée en cours. Le défilement, le redimensionnement, la perte de focus de la fenêtre et son passage en arrière-plan réinitialisent l'effet. Le retour arrière restaure la porte.

Sur téléphone ou pointeur tactile, un toucher ouvre directement le vidéoclub. La réduction des mouvements conserve un aperçu statique au clavier et à la souris, puis une navigation immédiate. Sans JavaScript, le lien reste disponible.

## Portée

Il s'agit d'une profondeur simulée entre deux images. La traversée libre de scènes en Gaussian splatting montrée dans la référence demanderait d'autres ressources et un moteur de rendu.

Aucun commit, push, PR ou déploiement n'est inclus. Les contrôles et captures figurent dans [la recette du portail](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/portail-videoclub-2026-10-20.md).
