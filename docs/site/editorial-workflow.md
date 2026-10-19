# Site média : travail éditorial et administration

Depuis le 19 octobre, la création d'un épisode accepte une description vide et une durée absente. Sans date YouTube, le site utilise la date d'ajout de la vidéo. Le titre reste modifiable ; la miniature et l'iframe ne dépendent pas de la durée. Voir [DD-0060](../design-decisions/dd-0060-publication-episode-sans-duree.md).

SANDBOX CHARTS possède sa fabrique dans la section Classements : [collectes, catalogue, éditions et méthode](sandbox-charts.md). Les commentaires éditoriaux sont conservés dans `charts_editorial`, avec brouillon, publication et ETag ; les positions et mesures restent figées. Les anciennes définitions Markdown restent accessibles dans un panneau dépliable.

Les JSON versionnés dans `content/` restent le contenu initial du site. Le backoffice `/admin` permet de créer et modifier les épisodes, leurs chapitres et ressources, les réglages de la marque, les profils de la page À propos et les autres collections éditoriales. Il peut enregistrer un brouillon, puis publier. En développement, les écrits sont conservés dans `.site-content.local.json`. En production, l'API utilise Postgres/Neon, une ligne par entité et par couche. L'accueil, les pages de thèmes et le flux RSS sont rendus à chaque requête pour lire les épisodes publiés dans Postgres : le build Vercel ne charge pas cette base. Voir [ADR-0016](../adr/ADR-0016-administration-editoriale-vercel.md) et [ADR-0017](../adr/ADR-0017-persistance-editoriale-postgres.md).

## Lancer le site

Depuis `apps/site` (ou depuis la racine avec `corepack pnpm --filter @podcast/site <script>`) :

```bash
pnpm dev            # développement, /admin demande un compte configuré
pnpm build          # génération statique des pages et images OpenGraph
pnpm start          # sert le build et les routes du backoffice
pnpm test           # tests du domaine, du pipeline, du contenu et des squelettes
pnpm content:check  # validation du contenu (schémas, références, continuité)
```

Variables d'environnement : `SITE_URL` (URL canonique explicite hors domaine Vercel ; à défaut, `https://www.sandboxpodcast.fr` sur Vercel, puis `http://localhost:3000` en local), `SITE_DATA_MODE` (`mock` par défaut, pages en `noindex` et sitemap vide ; `live` autorise l'indexation après remplacement des données simulées), `SITE_ADMIN_USERS` (tableau JSON de comptes `{ "username": "lou", "passwordHash": "scrypt:<sel hexadécimal de 32 caractères>:<empreinte hexadécimale de 128 caractères>" }`), `SITE_ADMIN_SECRET` (32 caractères minimum) et `DATABASE_URL` ou `POSTGRES_URL` pour Postgres. Le fichier local `apps/site/.env.local` contient les trois comptes générés et est ignoré par Git. `BLOB_STORE_ID` ou `BLOB_READ_WRITE_TOKEN` sont facultatifs pendant une migration : `db:seed` peut alors lire une ancienne publication Blob. Le login échoue si les deux variables d'administration ne sont pas présentes. Le cookie de session expire après huit heures. Le propriétaire renseignera les variables de production dans Vercel ; elles ne sont pas publiées depuis le dépôt.

Avant d'activer l'admin en production, exécuter `pnpm --filter @podcast/site db:migrate` avec l'URL de la base. Pour importer une publication initiale, exécuter ensuite `pnpm --filter @podcast/site db:seed`. Cette commande privilégie l'ancien Blob lorsqu'il est accessible ; sinon elle importe `content/`. Elle refuse une base contenant déjà une publication. Sauvegarder l'ancien contenu avant de changer de stockage. Sans base configurée, les pages publiques servent les JSON de Git et les écritures admin sont refusées.

Pour déplacer les trois comptes existants dans Postgres, exécuter `pnpm --filter @podcast/site admin:bootstrap` avec `SITE_ADMIN_USERS` et l'URL de la base. L'import reprend leurs empreintes, leur donne le rôle `admin` et refuse une table déjà peuplée. Après l'import, vérifier les connexions de Lou, Nicolas et Loïc avant de retirer `SITE_ADMIN_USERS` de l'environnement. Les rôles `viewer` et `editor` limitent respectivement à la lecture et aux brouillons ; le serveur réserve la publication au rôle `admin`. Un compte stocké en base peut changer son mot de passe depuis `/admin` ; le changement exige le mot de passe actuel, renouvelle la session et invalide les cookies signés avec l'ancienne empreinte. Les administrateurs voient aussi la section "Utilisateurs" pour créer un compte, modifier le rôle ou le nom affiché, réinitialiser un mot de passe, désactiver ou réactiver un compte. La désactivation empêche toute nouvelle session ; le dernier administrateur actif et le compte connecté lui-même sont protégés.

L'import d'une vidéo fonctionne sans clé API : le serveur lit les informations du lecteur dans la page publique YouTube. `YOUTUBE_API_KEY` reste facultative pour cet import. Si elle est configurée, l'import essaie la Data API puis la page publique en cas d'échec. La clé reste côté serveur, hors du frontend et de Git. Voir [DD-0058](../design-decisions/dd-0058-import-youtube-sans-cle-api.md).

## Je veux... donc je...

| Objectif                                        | Commande ou action                                                                               | Fichier                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Créer un épisode                                | ouvrir `/admin`, coller l'URL YouTube et vérifier le titre ; description facultative             | brouillon local ou Postgres                       |
| Ajouter les sources et mentions d'un épisode    | coller les liens dans la description ; ils deviennent des ressources à vérifier                  | idem                                              |
| Lier un projet à un épisode                     | ajouter une mention avec `"entity": "<slug>"` (la fiche affiche alors l'épisode et l'horodatage) | idem                                              |
| Modifier l'accueil et les cartes de l'équipe    | ouvrir `/admin` -> "Identité du site", puis enregistrer ou publier                               | brouillon local ou Postgres                       |
| Modifier un épisode existant                    | ouvrir `/admin` -> "Épisodes", sélectionner l'entrée et utiliser le formulaire                   | brouillon local ou Postgres                       |
| Ajouter un avis (OUR TAKE)                      | `/admin` -> "Classements" -> "Un avis" ; choisir la fiche, signer et écrire (320 caractères max) | brouillon local ou Postgres                       |
| Ajouter un projet ou un modèle                  | `/admin` -> "Classements" -> "Une fiche" ; fournir le lien officiel et une phrase                | brouillon local ou Postgres                       |
| Modifier un classement (poids, critères, texte) | éditer le profil de scoring ou la définition                                                     | `content/scoring/*.json`, `content/charts/*.json` |
| Ajouter un classement                           | `pnpm content:new chart <slug> "<Titre>"`, puis définir son pool et brancher un connecteur       | `content/charts/<slug>.json`                      |
| Publier un snapshot historique de démonstration | `pnpm week:run -- --week <AAAA-Wnn>`, puis `pnpm content:check`                                  | `data/snapshots/<classement>/<semaine>.json`      |

Les commandes CLI du tableau créent des fichiers valides avec des textes "À compléter" volontairement visibles. Ces snapshots hebdomadaires servent les anciennes démonstrations du site ; SANDBOX CHARTS v3 collecte et publie des éditions live dans Postgres. Les anciennes commandes d'articles sont conservées dans le dépôt, mais ces contenus n'ont plus de pages publiques autonomes. `content:check` échoue si une référence est cassée (entité inconnue, semaine sans snapshot, animateur inconnu, thème inconnu, horodatage hors durée). Il avertit sans échouer pour les liens à compléter et les vidéos manquantes.

Dans l'admin, coller l'URL YouTube importe le titre et la miniature. Le titre reste modifiable. La description est facultative ; si YouTube la fournit, elle remplit le champ tant que l'équipe n'y a pas écrit. Ses horodatages et ses liens alimentent les chapitres et les ressources. Le compte connecté détermine l'animateur quand il correspond à un profil ; sinon, le formulaire demande de le choisir. Une date YouTube absente est remplacée par la date d'ajout de la vidéo. Une durée manquante ne bloque aucune sauvegarde et reste omise sur le site. Les épisodes existants conservent leurs champs de ressources, miniature, animateurs et liens d'écoute. Une vidéo déjà utilisée est signalée et refusée par la validation du contenu. Voir [DD-0060](../design-decisions/dd-0060-publication-episode-sans-duree.md).

Les horodatages et liens présents dans la description retenue par l'équipe deviennent des chapitres et des ressources à vérifier. Les liens Spotify et Apple Podcasts de cette description sont aussi repris. Si la page publique est inaccessible, oEmbed fournit encore le titre, la chaîne et la miniature ; il suffit pour préparer l'épisode. Sans date YouTube, le site retient la date d'ajout de la vidéo dans l'admin. Sans horodatages dans la description, aucun chapitre n'est inventé. L'admin présente un seul bloc de ressources, sources et annexes ; les anciens champs `sources` sont convertis en ressources lors de l'édition d'un épisode.

Le champ "Description · Markdown" accepte les paragraphes, retours à la ligne, titres, listes, gras, italique, code et liens HTTPS. L'aperçu dans le formulaire permet de vérifier la description source, conservée telle quelle. La fiche publique affiche le résumé court, les chapitres et les ressources selon [DD-0022](../design-decisions/DD-0022-fiche-episode-sans-description-longue.md). Le HTML saisi est ignoré et les images distantes ne sont pas chargées. Les liens non HTTPS ou non internes restent du texte.

### Changer la photo d'un animateur

Dans `/admin`, ouvrir "Animateurs", choisir le profil, puis "Choisir une photo" : JPEG, PNG ou WebP, au moins **400 × 400 px**, **8 Mo maximum**. Le serveur recadre l'image en carré au centre, la convertit en WebP de 800 px et retire ses métadonnées. L'aperçu montre le résultat. "Publier" la rend visible sur `/about`. En production, appliquer d'abord la migration additive `0011_host_photos.sql`. Voir [DD-0021](../design-decisions/DD-0021-photos-des-animateurs-depuis-l-admin.md).

Le champ "Description · Markdown" accepte les paragraphes, retours à la ligne, titres, listes, gras, italique, code et liens HTTPS. L'aperçu dans le formulaire permet de vérifier la description source, conservée telle quelle. La fiche publique affiche le résumé court, les chapitres et les ressources selon [DD-0022](../design-decisions/DD-0022-fiche-episode-sans-description-longue.md). Le HTML saisi est ignoré et les images distantes ne sont pas chargées. Les liens non HTTPS ou non internes restent du texte.

La section "Slides" de "/admin" affiche l'index statique des présentations dans un cadre isolé. On peut y ouvrir un deck, le parcourir au clavier, puis ouvrir l'index dans un grand onglet. Les supports HTML continuent d'être ajoutés au dépôt selon le guide des slides ; cette section sert à les consulter.

Les pages publiques tirent aussi les ressources et les chapitres de la description publiée lorsque les champs structurés sont vides. Une durée contredite par un horodatage de chapitre reste masquée, y compris dans les données structurées. Pour corriger la durée stockée, ouvrir l'épisode dans `/admin`, actualiser YouTube et publier après l'import automatique ; un conflit avec les chapitres fait omettre la durée sans bloquer l'enregistrement. La page À propos lit les réglages publiés à chaque requête pour tenir compte des modifications après le build.

### Choisir une miniature nette

Le site cherche automatiquement la meilleure variante YouTube existante, y compris pour les épisodes déjà publiés. Si la vidéo ne fournit qu'une petite image, ouvrir l'épisode dans `/admin`, puis choisir un fichier dans "Miniature de l'épisode". Préparer un visuel 16:9 d'au moins **1280 × 720 px** en JPEG, PNG ou WebP, de **5 Mo maximum**. L'admin montre l'aperçu et confirme les dimensions optimisées. Enregistrer le brouillon ou publier ensuite : l'envoi du fichier seul ne change pas la page publique. "Revenir à la miniature YouTube" retire la sélection personnalisée lors de la prochaine sauvegarde.

En production, appliquer la migration additive `0008_episode_thumbnails.sql` avant le premier envoi. Les images optimisées sont conservées dans Postgres ; en développement elles vont dans `.local/episode-thumbnails/`, ignoré par Git. Sauvegarder cette table avec le contenu éditorial. Le stockage est borné à 1,5 Mo par image optimisée et les fichiers précédents ne sont pas supprimés automatiquement. Voir [DD-0012](../design-decisions/DD-0012-miniatures-episodes.md).

La description longue reste consultable dans l'admin avec son aperçu Markdown. Elle alimente les chapitres et les ressources, sans bloc "À propos de l'épisode" sur la fiche publique.

La section "Slides" de `/admin` affiche l'index statique des présentations dans un cadre isolé. On peut y ouvrir un deck, le parcourir au clavier, puis ouvrir l'index dans un grand onglet. Les supports HTML continuent d'être ajoutés au dépôt selon le [guide des slides](slides.md) ; cette section sert à les consulter.

Chaque classement s'édite dans un document Markdown unique contenant sa présentation, sa méthode éditoriale, les fiches de ses projets ou modèles et leurs avis. Les onglets séparés "Projets et modèles", "Avis" et "Méthodes" ont été retirés. Le document est validé puis répercuté dans les données structurées du site. Les rangs, scores, profils de calcul et snapshots restent hors de cet éditeur ; une nouvelle fiche n'entre dans le classement live qu'après collecte, calcul et contrôles suffisants. "Identité du site" propose des champs pour la marque, la métadescription, les plateformes et les cartes de Lou, Nicolas et Loïc sur `/about`. Les animateurs liés aux épisodes disposent de champs sociaux séparés. Le serveur valide la forme et les références avant d'enregistrer ; une entrée éditoriale existante ne peut pas être supprimée depuis l'API.

Les profils d'animation initiaux sont Lou, Nicolas et Loïc. Les anciens épisodes, avis et articles simulés portent la signature "Équipe Sandbox", clairement séparée dans l'admin ; ils ne sont attribués à aucun membre réel de l'équipe.

## Règles éditoriales

- **DATA et OUR TAKE ne se mélangent pas.** Un avis est une phrase courte, signée, rattachée à une entité (et à un classement et une semaine si elle commente un mouvement). Il n'est jamais écrit dans un champ de donnée.
- **Pas de lien inventé.** Une mention sans URL est acceptée (elle est signalée "lien à compléter" sur la page et dans `/admin`), un lien faux ne l'est pas.
- **Le contenu éditorial n'accepte pas de HTML libre.** Les champs et les liens sont validés côté serveur. Les anciens articles conservés dans Git utilisent des blocs typés, sans page publique autonome.
- **Un snapshot publié ne se corrige pas** : on ajoute une note éditoriale, on ne réécrit pas l'histoire.

## Pour aller plus loin

Le projet Vercel `sandbox-podcast` est relié au domaine `www.sandboxpodcast.fr`. Le propriétaire du compte doit configurer la racine de build `apps/site`, la base Neon, les migrations et les comptes d'administration. La clé YouTube est facultative : sans elle, l'import d'un épisode récupère seulement le titre, la chaîne et la miniature. Les constats et étapes précis figurent dans [la transmission Vercel](transmission-vercel-2026-10-07.md). Aucun secret ou token de production n'est inclus dans Git. Le plan Vercel et ses quotas déterminent les coûts du stockage.

## Protection des connexions et corrections

Le lot local du 16 octobre exige la migration additive `0015_admin_login_attempts` avant son déploiement. En production, les tentatives partagent un compteur Postgres et une base indisponible bloque la connexion. Appliquer la migration seulement après sauvegarde, validation de la cible et autorisation, selon [ADR-0032](../adr/ADR-0032-protections-et-persistance-issue-68.md).

La [procédure de correction et de réponse](corrections-et-droit-de-reponse.md) prépare les décisions éditoriales sans réécrire les éditions ni leurs preuves. Sa publication reste soumise à Lou.
