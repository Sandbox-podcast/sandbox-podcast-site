# DD-0030 : une page pour les replays du podcast

Date : 2026-10-15.

Demande de Lou : adapter le site à un épisode vidéo par semaine, avec un seul épisode disponible au départ. Retirer le podcast sous les classements de l'accueil et supprimer l'organisation par thèmes, les vidéos traitant du même sujet global.

Conception décidée par l'agent sur délégation (PD-0003).

L'accueil conserve les classements. Un lien direct "Le podcast" ouvre `/podcast`, sans sous-menu. Cette page affiche le dernier replay, sa date, sa durée vérifiée et son résumé, puis les épisodes précédents par date décroissante. Le dernier épisode ne figure pas une deuxième fois dans l'historique. Avec un seul épisode, aucune section vide d'historique n'est affichée. Sans épisode, la page indique qu'aucun replay n'est disponible.

La miniature et le titre sont séparés pour conserver le titre complet lisible. La page ne comporte ni filtre, ni tri, ni carrousel, ni catégories. Elle suffit à la cadence hebdomadaire demandée. L'abonnement YouTube reste accessible.

Les fiches `/episodes/[number]` conservent leurs URL, le lecteur, les chapitres et les ressources. Leur fil d'Ariane revient à `/podcast`. Les thèmes disparaissent de la navigation, du pied de page, des cartes, des fiches et de la recherche. L'admin ne demande plus de thèmes et ne propose plus de mise en avant sur l'accueil.

Les anciennes URL `/episodes`, `/topics` et `/topics/[slug]` redirigent en permanence vers `/podcast`, y compris en anglais, espagnol et allemand. Les anciennes routes d'articles et `/latest` renvoient aussi vers le podcast. Le sitemap référence `/podcast` et les fiches indexables, sans catalogue thématique. Les métadonnées de série et la liste structurée des replays sont placées sur `/podcast`.

Les champs historiques `topics` et `featured` restent compatibles avec les publications existantes. L'éditeur conserve ces valeurs à la sauvegarde, sans les exposer ni les utiliser pour organiser les replays. Aucune migration ni suppression de données éditoriales n'est nécessaire.

Cette décision remplace les parcours de bibliothèque et de thèmes de DD-0003 et DD-0008, ainsi que le bloc podcast placé sous les classements dans DD-0028.

Validation : les tests couvrent les états vide, un épisode et plusieurs épisodes, l'ordre chronologique, l'absence de doublon, la navigation directe, l'éditeur sans thèmes, les redirections dans les quatre langues et le sitemap après publication.

Vérification locale du 15 octobre 2026 : `pnpm check` réussi, avec 593 tests du site dans 93 fichiers, sept tests du générique et quatre tests des jingles. Le build de production réussit et génère 203 pages statiques.

Le script `apps/site/scripts/test-podcast.mjs` valide 19 parcours : accueil, accès direct au podcast et fiche à 320, 390, 768 et 1440 pixels, douze redirections permanentes dans les quatre langues et trois pages traduites. Aucun débordement horizontal ni erreur JavaScript n'est relevé. Les captures et le rapport sont conservés dans `apps/site/.local/podcast/`.

Les replays du contrôle navigateur utilisent une base éphémère et un épisode de test au titre long. Les redirections sont contrôlées sur une instance locale du build de production, car le serveur personnalisé des fixtures ne conserve pas les fonctions de configuration Next.js. La commande utilise `SANDBOX_BROWSER_CHANNEL=chrome` et `SANDBOX_TEST_REDIRECT_ORIGIN` pour cette instance séparée. Aucune publication distante n'est effectuée.
