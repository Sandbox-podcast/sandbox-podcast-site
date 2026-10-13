# Automatisation de la chaîne YouTube SANDBOX

Ce dossier prépare une passe d'optimisation pour [@SandboxFR](https://www.youtube.com/@SandboxFR). Il reste distinct du site média et ne modifie pas `old/`.

## Ce qui tourne sur GitHub

- GitHub Actions vérifie la chaîne toutes les 30 minutes et repère les nouveaux uploads publics. Le premier passage initialise ses curseurs sans retraiter l'historique.
- Pour une nouvelle vidéo, l'outil produit trois propositions PNG (1280 × 720) à partir de la miniature et du titre. Les fichiers sont joints au run comme artefact pendant 30 jours.
- Après activation, il peut publier un commentaire de lancement et répondre à un commentaire admissible par exécution. Les messages sensibles, personnels, déjà répondus ou hors du contexte de l'épisode sont laissés à l'équipe.
- Les Actions publiques restent désactivées tant que `YOUTUBE_EXECUTE_ACTIONS` n'est pas passé à `true`.

## Shorts créés depuis le master local

La personne qui dispose du master lance l'outil sur son ordinateur après la mise en ligne de l'épisode. Le master n'est ni envoyé sur GitHub ni remplacé. L'outil crée jusqu'à sept clips verticaux sous `.local/shorts/`, avec transcription, citations de titres vérifiées dans la transcription et sous-titres incrustés. Les clips générés sont en 1080 × 1920, de 15 à 60 secondes, avec la vidéo complète conservée au centre sur un fond flouté.

### Préparation du poste

1. Installer Python 3.12 ou plus récent.
2. Installer FFmpeg et `ffprobe` dans `PATH`, avec le filtre `subtitles` (libass).
3. Installer les dépendances Python et autoriser le compte qui a accès à la chaîne :

   ```powershell
   cd tools/youtube-growth
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   $env:PYTHONPATH = "src"
   python -m youtube_growth.auth C:\chemin\client_secret.json --token .youtube-token.json
   ```

4. Définir `OPENAI_API_KEY` et `YOUTUBE_SHORTS_MODEL` (ou réutiliser `OPENAI_MODEL`). La transcription passe par l'API audio OpenAI et le texte transcrit est ensuite envoyé au modèle de sélection. Ces appels sont facturés au compte API ; l'audio et sa transcription ne sont jamais envoyés à GitHub.

### Générer, relire, puis programmer

Dans le même terminal PowerShell, définir la clé, puis préparer les fichiers en local :

```powershell
$env:OPENAI_API_KEY = "votre-clé-api"
$env:YOUTUBE_SHORTS_MODEL = "votre-modèle-Responses-API"
python -m youtube_growth.shorts "C:\media\episode.mp4" --source-video-id IDENTIFIANT_YOUTUBE --count 7
```

Cette première commande ne publie rien. Elle affiche les titres, durées et heures proposées, et sauvegarde un manifeste reprenable sous `.local/shorts/`. Ouvrir les clips pour les relire, notamment la transcription automatique et le cadrage.

Quand le lot est prêt, reprendre la même commande avec `--publish` :

```powershell
python -m youtube_growth.shorts "C:\media\episode.mp4" --source-video-id IDENTIFIANT_YOUTUBE --count 7 --publish
```

Les Shorts sont téléversés en privé puis programmés chaque jour à 17 h, heure de Paris, en commençant le lendemain. Une autre première date peut être indiquée avec `--first-publish-at "2026-10-14T17:00:00+02:00"`. Le manifeste conserve les identifiants et dates déjà téléversés : une reprise ne crée pas de doublon. Les vidéos non envoyées dont la date est passée sont replacées après les vidéos déjà programmées.

Si une transcription est interrompue, relancer la même commande réutilise le manifeste et les sélections conservées. Chaque personne qui programme avec son compte Google doit disposer de l'autorisation YouTube appropriée sur la chaîne. Le jeton local est ignoré par Git.

## Fonctions que Studio garde en manuel

- L'API YouTube ne sait pas épingler un commentaire : l'administrateur épingle le commentaire de lancement dans YouTube Studio.
- L'expérience native « Test & compare » se configure et se consulte dans YouTube Studio sur ordinateur. Les trois propositions de miniatures sont à charger dans cette expérience ; le script ne la démarre ni ne la mesure.
- Le script ne télécharge jamais la vidéo depuis YouTube. Les Shorts ne peuvent être produits qu'à partir du master local autorisé.

## Préparer GitHub Actions

1. Dans Google Cloud, activer YouTube Data API v3 et créer un identifiant OAuth d'application de bureau pour le compte propriétaire de la chaîne.
2. Autoriser une fois l'accès sur un poste de confiance. Pour GitHub Actions, enregistrer le contenu de `.youtube-token.json` dans le secret `YOUTUBE_OAUTH_TOKEN_JSON`. Ne jamais ajouter le jeton à Git.
3. Ajouter les variables du dépôt :

   | Variable                           | Valeur de départ                                                           |
   | ---------------------------------- | -------------------------------------------------------------------------- |
   | `YOUTUBE_EXECUTE_ACTIONS`          | `false`, puis `true` après revue du premier run                            |
   | `YOUTUBE_POST_EPISODE_COMMENT`     | `true`                                                                     |
   | `YOUTUBE_AUTO_REPLY`               | `true`                                                                     |
   | `YOUTUBE_EPISODE_COMMENT_TEMPLATE` | `Merci d'avoir écouté cet épisode de SANDBOX ! Qu'en retenez-vous ? {url}` |
   | `OPENAI_MODEL`                     | Identifiant d'un modèle Responses API autorisé sur le compte               |

   Ajouter `OPENAI_API_KEY` comme secret. Les commentaires admissibles sont envoyés au fournisseur configuré pour proposer une réponse ; les requêtes Responses utilisent `store: false`, sous réserve des conditions du compte API.

4. Donner l'accès au dépôt aux administrateurs et uploaders via les rôles GitHub existants. Le code ne crée pas d'invitations.
5. Après mise sur la branche par défaut, lancer le workflow `YouTube SANDBOX — optimisation` une première fois et consulter son résumé et ses artefacts. Activer `YOUTUBE_EXECUTE_ACTIONS` seulement après la revue.

## Développement et contrôle local

```powershell
cd tools/youtube-growth
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:PYTHONPATH = "src"
python -m unittest discover -s tests -v
```

Les appels aux services ne sont pas faits pendant les tests. L'état local de la surveillance est dans `.state/` ; les rendus Shorts sont dans `.local/shorts/`. Ces dossiers sont ignorés par Git.

## Activation restante

Le workflow GitHub ne surveillera la chaîne qu'après son ajout sur la branche par défaut et la configuration des Secrets/Variables. Les Shorts sont déclenchés par la personne qui a le master en lançant la commande locale. Les identifiants OAuth, la clé OpenAI et les permissions de chaîne doivent être configurés par l'équipe ; aucun secret n'est inclus dans ce dépôt.
