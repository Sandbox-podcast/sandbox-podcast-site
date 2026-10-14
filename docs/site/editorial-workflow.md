# Site média : travail éditorial et administration

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

Pour l'import complet d'une vidéo, ajouter `YOUTUBE_API_KEY` au fichier local ignoré `apps/site/.env.local` et, plus tard, aux variables serveur de Vercel. La clé ne doit jamais être placée dans le frontend ou dans Git.

## Je veux... donc je...

| Objectif                                        | Commande ou action                                                                               | Fichier                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Créer un épisode                                | ouvrir `/admin`, coller l'URL YouTube et la description complète avec ses sources                | brouillon local ou Postgres                       |
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

Dans l'admin, la création d'un épisode demande seulement l'URL YouTube et une description complète avec ses sources. Le collage de l'URL lance l'import. La date et la durée viennent de l'API YouTube quand elle est configurée ; sans clé, l'éditeur lit la durée dans le lecteur YouTube officiel. La durée ne se saisit plus en secondes. Le titre et la miniature viennent de la vidéo, et le résumé, les chapitres et les ressources sont extraits de la description collée. Si celle de YouTube existe, elle est recopiée dans le champ tant que l'équipe n'y a pas encore écrit. Le compte connecté détermine l'animateur quand il correspond à Lou, Nicolas ou Loïc ; sinon, le choix des animateurs apparaît. Sans clé YouTube, la création reste indisponible car oEmbed et le lecteur ne fournissent pas la date de publication : l'interface demande de configurer `YOUTUBE_API_KEY` et ne fabrique pas cette valeur. Les épisodes existants conservent leur éditeur détaillé, avec la durée en lecture seule, actualisée automatiquement depuis le lecteur si l'API manque. Dans cet éditeur, les liens HTTPS visibles dans la description Markdown sont ajoutés aux ressources au chargement, après modification de la description et lors de la sauvegarde ; les ressources déjà éditées sont conservées. La fiche publique et la recherche affichent aussi ces liens avant toute republication. Une vidéo déjà utilisée est signalée avant l'enregistrement et rejetée par la validation du contenu. Les formulaires "Thèmes" et "Sources" remplacent l'édition JSON de ces deux collections. La saisie rapide d'un avis ou d'une fiche de classement enregistre un brouillon ; "Publier" reste une action séparée. Le Markdown complet reste disponible dans chaque classement.

Depuis `/admin`, l'équipe peut importer une vidéo à partir de son URL YouTube. Avec `YOUTUBE_API_KEY` sur le serveur, l'import récupère le titre, la chaîne, la miniature, la date, la durée et la description via YouTube Data API v3. Les horodatages et liens effectivement présents dans la description retenue par l'équipe deviennent des chapitres et des ressources à vérifier. Les liens Spotify et Apple Podcasts de cette description sont aussi repris. Sans clé, l'import oEmbed fournit le titre, la chaîne et la miniature ; la durée vient du lecteur, mais la date manquante empêche encore de créer un nouvel épisode. YouTube ne fournit pas les chapitres automatiques via ce point d'API : sans horodatages dans la description, aucun chapitre n'est inventé. L'admin présente un seul bloc de ressources, sources et annexes ; les anciens champs `sources` sont convertis en ressources lors de l'édition d'un épisode.

### Changer la photo d'un animateur

Dans `/admin`, ouvrir "Animateurs", choisir le profil, puis "Choisir une photo" : JPEG, PNG ou WebP, au moins **400 × 400 px**, **8 Mo maximum**. Le serveur recadre l'image en carré au centre, la convertit en WebP de 800 px et retire ses métadonnées. L'aperçu montre le résultat. "Publier" la rend visible sur `/about`. En production, appliquer d'abord la migration additive `0011_host_photos.sql`. Voir [DD-0019](../design-decisions/DD-0019-photos-des-animateurs-depuis-l-admin.md).

Le champ "Description · Markdown" accepte les paragraphes, retours à la ligne, titres, listes, gras, italique, code et liens HTTPS. L'aperçu dans le formulaire utilise le même rendu que la fiche publique. La description source reste enregistrée telle quelle ; le HTML saisi est ignoré et les images distantes ne sont pas chargées. Les liens non HTTPS ou non internes restent du texte.

La section "Slides" de "/admin" affiche l'index statique des présentations dans un cadre isolé. On peut y ouvrir un deck, le parcourir au clavier, puis ouvrir l'index dans un grand onglet. Les supports HTML continuent d'être ajoutés au dépôt selon le guide des slides ; cette section sert à les consulter.

Les pages publiques tirent aussi les ressources et les chapitres de la description publiée lorsque les champs structurés sont vides. Une durée contredite par un horodatage de chapitre reste masquée, y compris dans les données structurées. Pour corriger la durée stockée, ouvrir l'épisode dans `/admin`, actualiser YouTube et publier après l'import automatique ; un conflit avec les chapitres bloque l'enregistrement. La page À propos lit les réglages publiés à chaque requête pour tenir compte des modifications après le build.

### Choisir une miniature nette

Le site cherche automatiquement la meilleure variante YouTube existante, y compris pour les épisodes déjà publiés. Si la vidéo ne fournit qu'une petite image, ouvrir l'épisode dans `/admin`, puis choisir un fichier dans "Miniature de l'épisode". Préparer un visuel 16:9 d'au moins **1280 × 720 px** en JPEG, PNG ou WebP, de **5 Mo maximum**. L'admin montre l'aperçu et confirme les dimensions optimisées. Enregistrer le brouillon ou publier ensuite : l'envoi du fichier seul ne change pas la page publique. "Revenir à la miniature YouTube" retire la sélection personnalisée lors de la prochaine sauvegarde.

En production, appliquer la migration additive `0008_episode_thumbnails.sql` avant le premier envoi. Les images optimisées sont conservées dans Postgres ; en développement elles vont dans `.local/episode-thumbnails/`, ignoré par Git. Sauvegarder cette table avec le contenu éditorial. Le stockage est borné à 1,5 Mo par image optimisée et les fichiers précédents ne sont pas supprimés automatiquement. Voir [DD-0012](../design-decisions/DD-0012-miniatures-episodes.md).

Le champ "Description · Markdown" accepte les paragraphes, retours à la ligne, titres, listes, gras, italique, code et liens HTTPS. L'aperçu dans le formulaire utilise le même rendu que la fiche publique. La description source reste enregistrée telle quelle ; le HTML saisi est ignoré et les images distantes ne sont pas chargées. Les liens non HTTPS ou non internes restent du texte.

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
