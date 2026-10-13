# DD-0012 — Miniatures haute définition des épisodes

- Date : 2026-10-12
- Statut : décidée par l'agent sur délégation (PD-0003), à la demande de Lou

## Constat

L'accueil agrandissait parfois une miniature YouTube `hqdefault.jpg` de 480 px sur une bannière de plus de 1 200 px. Le texte long de l'épisode prenait aussi une grande partie du visuel. Agrandir ce fichier ne peut pas recréer les détails manquants.

## Décision

1. Pour les épisodes existants qui référencent une petite miniature YouTube, une route du site cherche `maxresdefault`, puis `sddefault`, puis `hqdefault`. Elle vérifie les dimensions réelles avant de servir le premier fichier valable. Avec YouTube Data API, un nouvel import conserve directement la meilleure variante annoncée.
2. L'admin accepte un fichier JPEG, PNG ou WebP de 5 Mo maximum, au format 16:9 et d'au moins 1280 × 720 px. Le serveur contrôle le fichier, corrige son orientation et le convertit en WebP de 1920 × 1080 px au plus, sans agrandir la source. Le résultat doit faire au plus 1,5 Mo.
3. Le WebP est identifié par SHA-256 et stocké sans écraser une image précédente : dans `apps/site/.local/episode-thumbnails/` en développement, dans la nouvelle table `episode_thumbnails` de Postgres en production. La migration additive 0008 est nécessaire avant de permettre l'import en production. Aucun nouveau compte ou service de stockage n'est requis.
4. La miniature chargée dans l'admin prévaut sur l'image YouTube. L'admin peut retirer cette sélection pour revenir à YouTube. Le choix devient public seulement lors de la publication de l'épisode ; le simple envoi du fichier ne publie rien.
5. Le titre de la bannière d'accueil est réduit afin de laisser davantage de place à l'image, sans tronquer le texte.

## Conséquences et limites

- Les épisodes déjà publiés bénéficient de la recherche de meilleure variante après déploiement, sans édition manuelle. Si YouTube ne fournit que 480 px, seul un fichier haute définition importé par l'équipe peut corriger la qualité source.
- Les fichiers importés, y compris ceux qui ne sont finalement pas publiés, restent conservés. Le nom par empreinte évite les doublons ; une politique de purge exige une décision séparée avant toute suppression de données réelles.
- Le stockage et les lectures d'images utilisent les quotas de la base existante. Le responsable du compte vérifie l'espace disponible avant des imports nombreux. La migration et la publication en production restent dans son flux habituel.
- Retour arrière : une version antérieure de l'application ignore `uploadedArtworkPath` et continue d'utiliser YouTube ou le visuel versionné. La table 0007 peut rester en place sans effet sur les anciens épisodes.
