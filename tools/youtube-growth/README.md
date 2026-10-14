# SANDBOX YouTube Growth Agent

Outil Python pour [Sandbox Podcast](https://www.youtube.com/@SandboxFR). Il complète le site existant sans modifier `old/`. Voir [ADR-0026](../../docs/adr/ADR-0026-growth-agent-et-extraits-youtube.md) et [la livraison du 14 octobre](../../docs/site/youtube-growth-2026-10-14.md).

## Connexion et audit

Python 3.12 minimum; FFmpeg et ffprobe pour les rendus. Depuis ce dossier :

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:PYTHONPATH = "src"
python -m youtube_growth.cli doctor
```

Activer YouTube Data API v3 et YouTube Analytics API dans Google Cloud, puis préparer un client OAuth Desktop. Garder son JSON hors de Git.

```powershell
python -m youtube_growth.auth C:\chemin\client_secret.json
python -m youtube_growth.cli audit --video-id GgSiPkADCz4
```

Le jeton est enregistré dans `.local/youtube-token.json` après vérification de la chaîne `UCuATIBXo5uvNLVm-gCgMenA`. Une autre chaîne est refusée, même si le compte l'administre. Un navigateur connecté ne connecte pas le programme. `--token`, `YOUTUBE_LOCAL_TOKEN_PATH` et `YOUTUBE_OAUTH_TOKEN_JSON` permettent de choisir une autre source de credentials.

Le consentement initial demande `youtube.readonly` et `yt-analytics.readonly`. Après contrôle initial du pipeline, `auth --allow-writes` demande les droits d'édition et d'upload. La bibliothèque Google renouvelle les credentials; leur révocation est disponible dans les [connexions du compte Google](https://myaccount.google.com/connections).

`audit` collecte chaîne, vidéo, compteurs, uploads, playlists, sections, commentaires, pistes de sous-titres et quatre rapports Analytics. Les refus et absences de données sont explicites. Les impressions de miniatures, leur CTR et l'attribution Short vers émission demandent un relevé Studio. Les rapports bruts restent dans `.local/growth/audits/`, ignoré par Git. Ne pas publier ce dossier comme artefact public.

## Métadonnées et restauration

Préparer un JSON avec les propriétés voulues parmi `title`, `description` et `tags`, puis :

```powershell
python -m youtube_growth.cli plan --video-id GgSiPkADCz4 --patch .local/patch.json
python -m youtube_growth.cli apply .local/growth/metadata-plan.json
python -m youtube_growth.cli apply .local/growth/metadata-plan.json --execute
python -m youtube_growth.cli status
```

Sans `--execute`, `apply` simule. L'exécution préserve catégorie et langues, sauvegarde les métadonnées dans `.local/growth/backups/`, puis inscrit l'intention dans SQLite avant l'appel. Une modification faite depuis la préparation bloque le plan. Une réponse réseau perdue impose une vérification avant reprise. Aucune vidéo n'est supprimée.

`restore CHEMIN_SAUVEGARDE` simule une restauration; ajouter `--execute` pour l'appliquer. Les sauvegardes ne contiennent pas de jeton.

## Sans master

- Studio, "Extraits et Shorts" : nouvelles vidéos créées sur ses serveurs, selon l'éligibilité. Le 14 octobre, l'extrait horizontal était disponible pour l'épisode 1, mais "Nouveau Short" était désactivé.
- Application YouTube, "Remix", "Convertir en Short" : jusqu'à 60 secondes de sa propre vidéo publique, sous conditions.
- "Clip" sur la page de lecture : lien vers 5 à 60 secondes, sans nouvelle vidéo verticale.
- Studio, "Options", "Télécharger" : copie autorisée de sa propre vidéo pour le montage local. Sa résolution peut être inférieure au master.

Le programme n'appelle aucun endpoint privé et n'utilise pas de téléchargeur tiers. Exporter la transcription accessible depuis le navigateur, puis préparer les passages sans appel IA payant :

```powershell
python -m youtube_growth.cli --state-dir .local/episode-1 native-pack --transcript .local/transcript-youtube.txt --spec episodes/GgSiPkADCz4.json --duration 4701 --first "2026-10-15T17:00:00+02:00"
```

Le dossier contient huit candidats, les paroles brutes, leurs timestamps, quatre sélections et un calendrier proposé de trois publications par semaine. Aucune sélection n'est marquée publiée. Les fins des sous-titres sont inférées depuis le début suivant.

## Rendu local

Les dispositions `slide`, `panel` et `speaker` sont choisies dans `native-pack.json` après inspection des scènes. `fit` conserve le cadre complet. Ces cadrages sont vérifiés pour une source 1280 x 720. Ils ne constituent pas une détection automatique des intervenants.

```powershell
python -m youtube_growth.rendering --source "C:\chemin\copie-studio.mp4" --transcript .local/transcript-youtube.txt --pack .local/episode-1/native-pack.json --output .local/episode-1/shorts
```

Exports H.264/AAC en 1080 x 1920, sous-titres ASS, habillage bleu nuit/cyan et normalisation audio. Le fichier source reste intact. Chaque export est sondé puis décodé intégralement. Le manifeste conserve les empreintes et bornes, avec un statut de revue. Relire les sous-titres à l'écoute avant publication. L'export 1080p ne crée pas de détails supplémentaires dans la source 720p.

Le rendu refuse de remplacer un dossier dont un clip possède déjà un identifiant YouTube ou une tentative d'upload incertaine. Pour réviser un clip téléversé, choisir un nouveau dossier de rendu et conserver le manifeste précédent. Un rendu local ne met pas à jour une vidéo déjà présente sur YouTube.

Le pipeline historique `youtube_growth.shorts` reste disponible pour un nouveau master : transcription et sélection par OpenAI, facturées au compte API configuré. Aucun appel payant n'a été fait pour la sélection du premier épisode. Après génération et relecture, lancer `--approve`, puis `--publish` dans une commande distincte. La validation est liée aux médias et au texte. Un upload interrompu avec résultat incertain bloque la reprise au lieu de créer un doublon.

## Activation permanente

Le workflow `.github/workflows/youtube-growth.yml` prévoit un polling toutes les 30 minutes. Il exige la branche par défaut et les Secrets/Variables configurés. Le premier polling initialise un curseur sans retraiter l'historique; `audit` peut viser explicitement le premier épisode.

Le polling reste en lecture seule sur GitHub : son cache n'est pas un journal durable d'écritures. Un stockage hébergé persistant, OAuth et le contrôle initial manquent avant l'activation des publications automatiques. `YOUTUBE_POST_EPISODE_COMMENT` et `YOUTUBE_AUTO_REPLY` sont désactivés par défaut. Un commentaire de lancement doit être lié au contenu réel.

Test natif, épinglage, podcast, Communauté, écrans de fin et vidéo associée gardent une tâche Studio. Les résultats d'un test viennent de Studio; une rotation séquentielle n'est pas un test contrôlé. Le petit échantillon de départ ne justifie pas un gagnant statistique.

```powershell
python -m unittest discover -s tests -v
```

Références : [OAuth](https://developers.google.com/youtube/v3/guides/auth/installed-apps), [Analytics](https://developers.google.com/youtube/analytics/channel_reports), [extraits Studio](https://support.google.com/youtube/answer/15824265?hl=fr), [remix](https://support.google.com/youtube/answer/12836917?hl=fr), [téléchargement propriétaire](https://support.google.com/youtube/answer/56100?hl=fr), [tests natifs](https://support.google.com/youtube/answer/16391400?hl=fr).
