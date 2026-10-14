# DD-0019 : photos des animateurs importées depuis l'admin

- Date : 2026-10-14
- Statut : décidée par l'agent sur délégation (PD-0003), à la demande de Nicolas

## Constat

Le complément de [DD-0015](DD-0015-animateurs-source-page-a-propos.md) demandait d'ajouter la photo d'un animateur dans `public/team/`, puis de passer par une PR. Changer un portrait demandait donc un commit et un déploiement.

## Décision

1. La fiche Animateur de `/admin` propose « Choisir une photo » à la place du champ de chemin. Le fichier doit être en JPEG, PNG ou WebP, peser 8 Mo au plus et mesurer au moins 400 × 400 px.
2. Le serveur vérifie l'image, la recadre en carré au centre et la convertit en WebP de 800 × 800 px au plus, sans l'agrandir. Les métadonnées (EXIF, position GPS) sont retirées. Le résultat pèse 500 ko au plus.
3. Comme pour les miniatures d'épisode ([DD-0012](DD-0012-miniatures-episodes.md)), le WebP est identifié par son SHA-256. Il est stocké dans la table `host_photos` (migration additive 0011) en production, et dans `apps/site/.local/host-photos/` en développement. Il est servi par `/api/host-photos/<sha256>.webp`. Aucun nouveau service ni compte n'est nécessaire.
4. L'envoi du fichier ne publie rien. La photo apparaît sur `/about` après « Publier ». « Retirer la photo » remet le monogramme à la prochaine sauvegarde.
5. Les chemins versionnés existants (`/team/lou.jpg`, `/team/nicolas.jpg`) restent valides.

## Conséquences et limites

- La migration 0011 doit être appliquée en production (`pnpm --filter @podcast/site db:migrate`) avant le premier import. Sans elle, l'import affiche « Enregistrement de la photo impossible. ».
- Les photos remplacées ne sont pas supprimées. Une purge demanderait une décision séparée, car elle supprime des données réelles.
- Le recadrage est centré : une photo dont le visage est loin du centre doit être recadrée avant l'envoi. L'aperçu de l'admin montre le résultat exact.
