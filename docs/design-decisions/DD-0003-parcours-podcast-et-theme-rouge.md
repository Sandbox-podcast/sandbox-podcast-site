# DD-0003 — Parcours podcast et thème rouge

- Statut : accepté
- Date : 2026-10-07
- Direction produit choisie par la propriétaire à partir du brief de refonte
- Complète DD-0002 pour l'accueil, la navigation et le choix de thème.

## Décision produit

Le site est une bibliothèque de podcasts vidéo inspirée des plateformes de streaming. Les épisodes sont les contenus principaux. La page d'accueil met en avant un épisode puis propose des rangées par date et par thème. La navigation sépare **Podcasts** et **Classements**.

Chaque fiche d'épisode rassemble le lecteur, la description et les chapitres. Une barre latérale regroupe les ressources montrées ou mentionnées dans la vidéo, les liens horodatés et les sources de préparation. Les articles ne sont pas publiés comme contenus autonomes ; leurs anciennes adresses renvoient vers la bibliothèque d'épisodes. Les données historiques d'articles peuvent rester dans le dépôt tant qu'elles servent aux références internes.

La page Classements devient l'espace de consultation des tops hebdomadaires : choix du classement, aperçu du podium, accès au top complet, à la méthodologie et à l'historique.

La recherche couvre les épisodes, leurs mentions et sources, les fiches de projets et modèles, les thèmes et les classements. Le backoffice se concentre sur la création et la publication d'épisodes. Depuis une URL YouTube, il importe le titre, la chaîne et la miniature via oEmbed ; les informations complètes utilisent YouTube Data API v3 et une clé serveur. Les chapitres sont extraits des horodatages de la description quand ils existent. Les ressources, sources et annexes se présentent dans une liste unique.

## Décision visuelle

Le bleu nuit et cyan de DD-0002 reste le thème par défaut. Le propriétaire peut choisir un thème rouge et crème inspiré du visuel Sandbox fourni. Le choix est enregistré localement dans le navigateur ; les couleurs de texte, de mouvement et d'action restent définies par des variables de thème. À la demande du propriétaire, la recherche et le sélecteur de thème du header sont masqués sur mobile pour conserver une navigation lisible. Ils restent accessibles sur les écrans plus larges ; la recherche conserve aussi sa route dédiée.

Les couvertures peuvent utiliser les miniatures YouTube officielles. Le lecteur embarqué sans cookies ne contacte YouTube qu'après activation par la personne qui regarde.

La propriétaire a précisé la mise en scène de l'accueil le 2026-10-07 avec deux références visuelles : un épisode à la une dans un grand cadre illustré, avec titre et actions superposés, puis des rails de vignettes 16:9. Sur ordinateur, une vignette s'agrandit au survol ou au focus clavier et révèle le résumé, les thèmes et les liens vers la fiche. Sur écran tactile, un panneau dépliable donne accès au même résumé. Aucun contrôle factice de lecture ou de liste personnelle n'est ajouté.

Tant que les vraies vidéos ne sont pas renseignées, trois visuels originaux de démonstration illustrent les épisodes existants. Une miniature YouTube renseignée prend la priorité sur ce visuel. Les images de démonstration ne représentent ni les animateurs ni des extraits réels des épisodes.

Les métadonnées de l'accueil décrivent la bibliothèque de podcasts vidéo, les sources par épisode et les classements. La carte de partage reprend le studio illustré de l'épisode à la une, dans la palette bleu nuit et cyan. Le favicon et l'icône mobile simplifient le « A » triangulaire du logo fourni ; ils restent cyan quel que soit le thème choisi dans le navigateur, car les aperçus et icônes ne connaissent pas ce choix local.

Le propriétaire a ensuite demandé de retirer les libellés « Mode démonstration » et les marqueurs similaires de l'interface publique. La décision technique, prise par l'agent sur délégation (PD-0003), est de conserver le `noindex` et un sitemap vide tant que les données restent simulées. Les robots peuvent lire les pages pour constater ce `noindex`. Le moteur de recherche interne reste toujours non indexable. L'URL canonique utilise le domaine de production Vercel si `SITE_URL` n'est pas défini.

Le 2026-10-07, le propriétaire a signalé que `www.sandboxpodcast.fr` affichait encore l'ancien bandeau. Le code local ne le rend plus ; le domaine sert toujours un déploiement antérieur. La suppression visible sur ce domaine exige une nouvelle mise en ligne du code, sans passer `SITE_DATA_MODE` à `live` tant que les données simulées n'ont pas été remplacées.

La page `/about` montre trois cartes de même hauteur pour Lou, Nicolas et Loïc. Chaque carte renvoie seulement vers les profils GitHub, LinkedIn et X disponibles. Les liens de Lou sont renseignés ; ceux de Nicolas et Loïc restent à compléter. L'équipe affichée ici est éditable dans les réglages du site et n'attribue pas les épisodes simulés à de vraies personnes.

Le 2026-10-07, les anciens profils fictifs Alex, Sam et Noa ont été retirés de l'administration. Lou, Nicolas et Loïc sont les trois profils d'animation ; les épisodes, avis et articles simulés gardent une signature collective « Équipe Sandbox ». Décision prise par l'agent sur délégation (PD-0003) pour corriger les noms incohérents sans attribuer des propos inventés à l'équipe réelle.

Le 2026-10-07, la propriétaire a demandé un document Markdown par classement dans l'admin, réunissant présentation, méthode éditoriale, fiches des projets ou modèles et avis. Les onglets séparés « Projets et modèles », « Avis » et « Méthodes » disparaissent de cette interface. Les scores et snapshots restent structurés et immuables. Elle a également demandé de retirer le raccourci de semaine du header général : chaque page de classement possède son propre sélecteur de semaine dans son en-tête.

## Portée et limites

Les épisodes livrés dans le dépôt restent des données de démonstration et ne contiennent pas encore leurs propres identifiants YouTube. Les couvertures typographiques servent donc de repli. La récupération oEmbed nécessite l'accès réseau depuis le site déployé et une session backoffice valide. La récupération complète nécessite en plus `YOUTUBE_API_KEY`. L'API officielle fournit la description et la durée, mais aucun découpage en chapitres automatiques ; l'extraction se limite aux horodatages réellement présents dans la description de la vidéo.
