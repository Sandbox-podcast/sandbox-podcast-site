# DD-0075 : obtenir le badge depuis le classement

Date : 26 octobre 2026. Statut : implémenté localement.

## Demande de Lou

La fiche `/charts/project/:slug#badges` ajoute une étape inutile pour obtenir un badge. Chaque ligne du classement doit donner accès au projet officiel et au badge, sans parcours de sous-pages.

## Décision

Le classement affiche « Projet officiel » et, lorsqu'une distinction est disponible, « Obtenir mon badge » sous chaque ligne, même si les détails sont fermés. Le premier lien ouvre la source officielle de l'entité. Le second ouvre une fenêtre sur le classement, avec aperçu, formats Markdown/HTML/SVG, copie et téléchargement immédiatement accessibles.

La disponibilité vient toujours des éditions et attributions officielles. Une lecture serveur au clic vérifie le rang actuel et les Awards actifs. Un rang périmé ou un Award retiré n'est pas proposé. Si plusieurs distinctions existent, un sélecteur permet de choisir dans la même fenêtre. Chargement, erreur avec reprise et absence de badge sont explicites.

Le lien « Ouvrir la fiche » et le partage par ligne quittent ce parcours. Les détails de calcul restent consultables sur place. Les anciennes fiches et les destinations des badges déjà intégrés restent accessibles pour conserver les liens partagés et leurs preuves.

Le parcours suit la demande explicite de Lou. La fenêtre, son sélecteur et le maintien des anciennes URL sont décidés par l'agent sur délégation (PD-0003). Cette décision remplace le lien vers la fiche prévu dans ADR-0031 pour les lignes de classement.

## Vérification

Les tests du classement vérifient les actions accessibles sans ouvrir les détails, le lien externe et l'absence de détour vers la fiche. Les tests de la route couvrent les états de disponibilité, les Awards sans dépôt GitHub, les retraits, les projets absents et les pannes.

La recette navigateur sur base PGlite éphémère couvre la copie depuis le classement, le maintien de l'URL, le rendu mobile, Échap et le retour du focus, puis l'erreur et la reprise. Les vérifications des anciennes intégrations restent dans cette recette.

Résultats locaux du 26 octobre :

- `pnpm test` passe : 1 281 tests de l'application, sept tests de l'intro et 28 tests vidéo/conducteur.
- `pnpm --filter @podcast/site test:badges:dialog` passe : accès sans déplier, source officielle, copie des trois formats, téléchargement, presse-papiers bloqué, changement de distinction, clavier, mobile, erreur et reprise. Les captures sont dans `apps/site/.local/badges-e2e-43392/` ; les noms longs des projets sont des fixtures.
- Le contrôle TypeScript passe. ESLint et Prettier passent sur les fichiers de ce lot.
- `pnpm check` s'arrête sur le formatage de 104 fichiers hors de ce lot. Le lint global signale aussi les copies de `gsap.min.js` dans les exports vidéo déjà présents. Ces fichiers ne sont pas modifiés ici.
- La recette historique `test:badges:e2e`, adaptée à la nouvelle entrée par fenêtre, passe la copie et les anciennes intégrations avant de s'arrêter sur `/charts/awards/2000-W01` : réponse HTTP 200 au lieu du 404 attendu. Ce contrôle reste actif ; la correction du statut Awards n'entre pas dans ce lot.

La publication attend une demande de Lou ; ce travail reste local.
