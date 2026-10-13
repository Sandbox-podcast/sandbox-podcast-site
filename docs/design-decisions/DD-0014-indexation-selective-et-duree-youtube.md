# DD-0014 — Indexation sélective et durée YouTube fiable

- Date : 2026-10-13
- Statut : accepté pour l'implémentation locale
- Décision : décidée par l'agent sur délégation (PD-0003), après l'autorisation explicite de Lou d'ouvrir l'indexation.

## Contexte

Le site utilise encore `SITE_DATA_MODE=mock` pour distinguer les fixtures, mais un premier épisode réel et des éditions réelles des classements peuvent être publiés depuis Postgres. Le blocage SEO global empêchait leur découverte. La durée enregistrée de l'épisode 1 (13 min) contredit les chapitres de sa description et les 4 702 secondes indiquées par le lecteur YouTube. La clé YouTube Data API n'est pas configurée sur le serveur de production.

## Décision

- L'indexation dépend de la preuve de contenu **par page**. Une page d'épisode doit être publiée, liée à une vidéo YouTube et contenir une description et un résumé substantiels. Les hubs podcasts et thèmes ne sont indexables que si des épisodes éligibles existent. La page À propos est indexable. Les classements gardent leur contrôle existant : édition réelle, publiée et non vide. Les fixtures et pages vides restent en `noindex` et hors sitemap. Les traductions non relues ne sont pas ouvertes par cette décision.
- `SITE_DATA_MODE` conserve son rôle de provenance des données et ne devient pas un interrupteur SEO global. Le sitemap reflète les mêmes critères que les métadonnées `robots`. `robots.txt` laisse lire les pages aux moteurs pour qu'ils voient le `noindex` et annonce le sitemap.
- L'import admin préfère `contentDetails.duration` de YouTube Data API. Sans clé, il lit la durée dans le lecteur officiel YouTube IFrame API au moment de l'import ; le lecteur est visible et ne démarre pas la lecture. Un épisode existant lit également sa durée dès l'ouverture dans l'éditeur, sans vérification manuelle. Une durée plus courte que les chapitres empêche l'enregistrement. L'éditeur préremplit les chapitres et ressources depuis la description existante. La date de publication d'une **nouvelle** vidéo nécessite toujours la Data API : oEmbed et le lecteur ne la fournissent pas.
- La fiche publique masque toute durée contredite par les horodatages jusqu'à republication, et expose les chapitres et liens issus de la description. Le balisage `VideoObject` inclut des `Clip` seulement pour les segments dont l'intervalle est connu.
- Le domaine canonique public sert de repli quand Vercel fournit son sous-domaine. La configuration explicite `SITE_URL=https://www.sandboxpodcast.fr` en Production reste à vérifier dans [l'issue #40](https://github.com/Sandbox-podcast/sandbox-podcast-site/issues/40).

## Suite

Après la fusion de la PR, rouvrir l'épisode 1 dans l'admin : le lecteur renseigne automatiquement **4 702 s**. Republier pour enregistrer cette durée ainsi que les chapitres et ressources. Vérifier ensuite la fiche, le sitemap, les balises canoniques et la Search Console sur la production. L'indexation effective par les moteurs dépend de leur exploration et ne se déduit pas du seul déploiement.
