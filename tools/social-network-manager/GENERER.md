# Générer les Shorts Sandbox avec Nico et Loïc

Le code de génération, les trente compositions corrigées de l'épisode 2, leurs sous-titres et leurs timecodes sont dans ce dépôt. Les MP4 générés et le fichier source restent sur ton ordinateur. Tu n'as besoin d'aucun accès aux comptes sociaux pour effectuer un rendu local.

## Sommaire

- [Récupérer le système](#récupérer-le-système)
- [Choisir le bon pipeline](#choisir-le-bon-pipeline)
- [Installer les outils](#installer-les-outils)
- [Fournir la source de l'épisode](#fournir-la-source-de-lépisode)
- [Préparer les trente compositions E02](#préparer-les-trente-compositions-e02)
- [Rendre un extrait puis le lot](#rendre-un-extrait-puis-le-lot)
- [Contrôler et récupérer les fichiers](#contrôler-et-récupérer-les-fichiers)
- [Travailler avec un nouvel épisode](#travailler-avec-un-nouvel-épisode)
- [Demande à copier dans Codex](#demande-à-copier-dans-codex)
- [Résoudre les blocages](#résoudre-les-blocages)

## Récupérer le système

Clone le dépôt depuis GitHub et ouvre-le dans Codex, ou utilise ton éditeur habituel. Exécute toutes les commandes de ce guide depuis la racine du dépôt, dans PowerShell. Si le dépôt est déjà présent, récupère la branche contenant ce guide avant de commencer.

Les commandes utilisent des chemins relatifs : le dépôt peut être installé ailleurs que dans le dossier de Lou.

| Dossier                                                              | Rôle                                                                                    |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `tools/social-network-manager/episode-02/camera-unique-v2/`          | Pipeline Python et manifeste des trente extraits E02                                    |
| `tools/social-network-manager/episode-02/camera-unique-v2/projects/` | Trente compositions HTML et storyboards : cadrage, sous-titres, habillage et mouvements |
| `tools/youtube-growth/`                                              | Préparation d'autres épisodes, sélection de passages et rendu FFmpeg                    |
| `.local/`                                                            | Sources privées, dépendances locales, rendus et contrôles ; ignoré par Git              |

Les routines Codex de Lou sont en pause depuis le 24 octobre 2026. Cloner le dépôt ne les réactive pas et ne transfère pas sa session. La génération décrite ici se lance manuellement.

## Choisir le bon pipeline

**Pour reproduire les trente Shorts E02 corrigés**, suis ce guide. Le pipeline conserve une seule vidéo à l'écran et les cadrages validés pour cet épisode.

**Pour un nouvel épisode**, utilise le [guide YouTube](../youtube-growth/README.md), puis prépare et relis de nouveaux passages. Le pipeline E02 est une recette figée : remplacer son fichier source par une autre émission produirait des coupes et des sous-titres incorrects. Il ne sélectionne pas automatiquement trente passages dans une nouvelle vidéo.

## Installer les outils

Prérequis : Python 3.12 ou supérieur, Node.js 24, FFmpeg et FFprobe accessibles dans le `PATH`. Les filtres FFmpeg doivent inclure `subtitles` ou `ass` pour les sous-titres du pipeline YouTube.

```powershell
python --version
node --version
ffmpeg -version
ffprobe -version

python -m venv .local/social-venv
& ./.local/social-venv/Scripts/python.exe -m pip install -r tools/social-network-manager/episode-02/camera-unique-v2/requirements-qa.txt

npm install --prefix .local/e02-runtime --no-save --package-lock=false hyperframes@0.8.172 gsap@3.14.2
```

NumPy et Pillow servent aux contrôles audio et aux planches d'images. HyperFrames rend les compositions ; GSAP anime leurs éléments. Les versions correspondent au pipeline conservé. Les installations téléchargent des dépendances ; ce guide ne déclenche aucun service IA payant.

Contrôle des sources versionnées, sans vidéo ni connexion aux réseaux sociaux :

```powershell
& ./.local/social-venv/Scripts/python.exe -m unittest discover -s tools/social-network-manager/episode-02/camera-unique-v2 -p test_pipeline.py -v
& ./.local/social-venv/Scripts/python.exe tools/social-network-manager/episode-02/camera-unique-v2/pipeline.py check
```

Le second contrôle doit annoncer `valid_sources: 30` et `revision: camera-unique-v2`. Il vérifie les compositions ; il ne prouve pas que les vidéos ont été rendues.

## Fournir la source de l'épisode

Récupère auprès de l'équipe la copie autorisée complète de l'épisode YouTube `7KVqydbGow0`, en 1280 × 720 avec audio. Place-la dans `.local/medias/episode-02.mp4`. La copie peut provenir du téléchargement officiel de sa propre vidéo dans YouTube Studio. Un lien YouTube seul ne suffit pas au rendu local.

Le dépôt ne contient pas ce fichier. Ne crée pas de commit avec le master, les MP4 générés ou des identifiants de connexion. Les exports sous `.local/` restent ignorés par Git.

## Préparer les trente compositions E02

La première commande affiche le plan. Elle ne crée aucun média :

```powershell
& ./.local/social-venv/Scripts/python.exe tools/social-network-manager/episode-02/camera-unique-v2/pipeline.py prepare --workspace .local/e02-reproduction --episode .local/medias/episode-02.mp4 --gsap .local/e02-runtime/node_modules/gsap/dist/gsap.min.js --font apps/site/public/slides/episode-002-bis/assets/archivo.woff2 --logo apps/site/public/sandbox-logo.png
```

Après vérification des chemins, relance la même commande avec `--execute`. Elle prépare les segments source, copie les compositions dans un dossier neuf et enregistre les empreintes dans `provenance.json`. Le master reste intact. Ouvre les compositions préparées dans HyperFrames et vérifie l'aperçu avant de rendre.

## Rendre un extrait puis le lot

Commence par un extrait, par exemple E02-007 :

```powershell
& ./.local/social-venv/Scripts/python.exe tools/social-network-manager/episode-02/camera-unique-v2/pipeline.py render --workspace .local/e02-reproduction --cli .local/e02-runtime/node_modules/.bin/hyperframes.cmd --clip E02-007 --execute
```

Vérifie l'image, le cadrage, la voix et les sous-titres. Pour les vingt-neuf autres, répète la commande avec leur identifiant `--clip`. Le rendu refuse d'écraser un fichier existant. Pour rendre les trente ensemble, utilise un workspace neuf et omets `--clip`.

Chaque rendu passe d'abord le contrôle HyperFrames. Les sorties vont dans `.local/e02-reproduction/shorts/`, au format 720 × 1280 à 30 images par seconde. Le temps de calcul dépend de l'ordinateur ; aucun compte social n'est utilisé.

## Contrôler et récupérer les fichiers

Après les rendus :

```powershell
& ./.local/social-venv/Scripts/python.exe tools/social-network-manager/episode-02/camera-unique-v2/pipeline.py qa --workspace .local/e02-reproduction --audio --contact --execute
```

Le pipeline décode les vidéos, vérifie format et durée, compare des fenêtres audio à la source et prépare les images de revue. Ces contrôles ne remplacent pas l'écoute et la relecture des sous-titres.

Après la revue humaine, complète `visual-review.json` selon le [format documenté](episode-02/camera-unique-v2/README.md#vérifier-puis-rendre). Chaque entrée doit porter le SHA-256 du fichier réellement examiné et le nom de la personne qui l'a relu. Aucun script ne peut attester cette revue à ta place.

Pour réunir les trente fichiers contrôlés dans un dossier de livraison neuf :

```powershell
& ./.local/social-venv/Scripts/python.exe tools/social-network-manager/episode-02/camera-unique-v2/pipeline.py install --workspace .local/e02-reproduction --destination .local/e02-bundle --execute
```

Pour produire les quatre coupes Instagram prévues par le manifeste E02 :

```powershell
& ./.local/social-venv/Scripts/python.exe tools/social-network-manager/episode-02/camera-unique-v2/pipeline.py instagram --workspace .local/e02-reproduction --execute
```

Cette commande crée uniquement les quatre variantes dont les intervalles sont conservés dans le manifeste, pas un second lot de trente vidéos. Relis ces coupes séparément avant de les diffuser. Leur limite de moins de 90 secondes correspond à cette recette, sans prétendre décrire toutes les limites actuelles d'Instagram.

La génération ne publie et ne programme rien. Avant tout envoi autorisé, vérifie les publications et réservations natives pour éviter de dupliquer un extrait déjà diffusé. Les statuts historiques versionnés ne remplacent pas cette vérification.

## Travailler avec un nouvel épisode

Le [programme YouTube](../youtube-growth/README.md) contient les commandes `native-pack` et le module `youtube_growth.rendering`. Il permet de préparer un lot à partir d'une transcription horodatée et d'une spécification d'épisode, puis de rendre les passages sélectionnés avec FFmpeg. Le format de rendu accepte au plus dix candidats par lot : répartis trente candidats en plusieurs lots distincts.

Installe ses dépendances dans un environnement Python séparé et suis ses exemples complets. Le parcours `native-pack` s'appuie sur une transcription disponible ; le parcours historique de sélection et transcription par OpenAI nécessite une clé et peut être facturé. Un navigateur connecté à YouTube ne connecte pas le programme Python.

Pour retrouver le rendu E02 sur une nouvelle émission, il faut créer et contrôler de nouvelles compositions, timecodes et sous-titres. Copie-les dans un nouveau dossier versionné ; conserve les sources E02. Ne réutilise pas les anciennes bornes ou les cadrages sans examiner les nouvelles scènes.

## Demande à copier dans Codex

```text
Lis AGENTS.md, tools/social-network-manager/GENERER.md et le README du pipeline choisi.
Je veux générer des Shorts localement, sans publication ni programmation.
Commence par vérifier les dépendances et me signaler la source vidéo manquante.
Pour E02, utilise les trente compositions camera-unique-v2 déjà versionnées.
Pour un nouvel épisode, prépare d'abord une sélection sourcée avec timecodes,
contexte, titres et sous-titres ; fais relire les passages avant de rendre le lot.
Travaille dans un nouveau dossier .local/, préserve le master et les anciens rendus.
Vérifie vidéo, audio et cadrage ; distingue contrôles techniques et revue humaine.
Ne crée aucune routine automatique, ne contacte personne et ne téléverse aucun MP4 sur GitHub.
```

## Résoudre les blocages

| Message ou situation              | Action                                                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Master absent après le clone      | Récupérer la copie autorisée auprès de l'équipe ou dans Studio ; aucune vidéo source n'est incluse dans le code |
| `ffmpeg` ou `ffprobe` introuvable | Installer les outils et vérifier le `PATH` dans un nouveau terminal                                             |
| HyperFrames ou GSAP introuvable   | Vérifier l'installation locale et les chemins sous `.local/e02-runtime/`                                        |
| Destination déjà présente         | Choisir un nouveau workspace ou rendre uniquement les clips qui n'existent pas encore                           |
| Source d'une autre résolution     | Adapter et relire les cadrages avant le rendu ; ne pas prétendre que les contrôles E02 couvrent cette source    |
| Échec audio ou durée              | Conserver les preuves et corriger le rendu avant livraison                                                      |
| Revue visuelle absente            | Examiner les fichiers puis remplir les attestations réelles ; ne pas les inventer                               |

Le [README technique E02](episode-02/camera-unique-v2/README.md) détaille les contrôles, les seuils audio et les limites de reproduction.
