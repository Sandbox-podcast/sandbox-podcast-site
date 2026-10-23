# Site média : podcast et classements tech et IA

Le dépôt sert le site `apps/site` (podcast et classements tech et IA). Les anciens snapshots inclus dans Git sont des données de démonstration. Les classements réels utilisent des relevés datés dans Postgres : voir [la conception du site](docs/site/README.md).

## Sommaire

- [Démarrer](#démarrer)
- [Agent YouTube SANDBOX](#agent-youtube-sandbox)
  - [Installer l'outil](#installer-loutil)
  - [Connecter la chaîne et lancer un audit](#connecter-la-chaîne-et-lancer-un-audit)
  - [Préparer des Shorts sans master vidéo](#préparer-des-shorts-sans-master-vidéo)
- [Agent Social Network Manager](#agent-social-network-manager)
  - [Utiliser l'agent avec Nico et Loïc](#utiliser-lagent-avec-nico-et-loïc)
  - [Préparer et valider une publication](#préparer-et-valider-une-publication)
- [SANDBOX News](#sandbox-news)
- [Fonctionnement des classements](#fonctionnement-des-classements)
  - [Méthodes et profils](#méthodes-et-profils)
  - [Chaîne de calcul](#chaîne-de-calcul)
  - [Preuves et lecture des scores](#preuves-et-lecture-des-scores)
  - [Publication et exploitation](#publication-et-exploitation)
  - [Démarrage des candidats](#démarrage-des-candidats)
- [Documentation](#documentation)
- [Archive](#archive)

## Démarrer

Prérequis : Node 24 et pnpm 12 (`corepack enable`).

```bash
pnpm install
pnpm check
corepack pnpm --filter @podcast/site build
corepack pnpm --filter @podcast/site start
```

## Agent YouTube SANDBOX

L'outil de croissance YouTube est dans [`tools/youtube-growth`](tools/youtube-growth/README.md). C'est un programme Python local pour auditer la chaîne, préparer des changements et sélectionner ou rendre des extraits. Le workflow GitHub Actions peut aussi lancer un polling, sous réserve de sa configuration. Une proposition de publication n'est pas une programmation YouTube : vérifiez le statut `Programmée` et la date dans Studio.

### Installer l'outil

Prérequis : Python 3.12 ou plus. FFmpeg et ffprobe sont nécessaires pour le rendu vidéo. Dans PowerShell :

```powershell
cd tools/youtube-growth
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:PYTHONPATH = "src"
python -m youtube_growth.cli doctor
```

Le diagnostic vérifie les dépendances locales. Il ne se connecte pas à YouTube.

### Connecter la chaîne et lancer un audit

Dans Google Cloud, activez YouTube Data API v3 et YouTube Analytics API, puis créez un client OAuth Desktop. Gardez le fichier JSON du client hors de Git. Depuis `tools/youtube-growth`, lancez l'autorisation en lecture :

```powershell
python -m youtube_growth.auth C:\chemin\client_secret.json
python -m youtube_growth.cli audit --video-id GgSiPkADCz4
```

L'autorisation vérifie que le compte accède à la chaîne SANDBOX attendue. Le jeton local est écrit dans `.local/youtube-token.json`; le rapport d'audit se trouve sous `.local/growth/audits/`. Ces fichiers sont ignorés par Git. Pour voir l'état des opérations :

```powershell
python -m youtube_growth.cli status
```

### Préparer des Shorts sans master vidéo

Exportez la transcription accessible de la vidéo YouTube dans un fichier local. Depuis `tools/youtube-growth`, utilisez `native-pack` pour analyser les passages et préparer un calendrier :

```powershell
python -m youtube_growth.cli --state-dir .local/episode-1 native-pack --transcript .local/transcript-youtube.txt --spec episodes/GgSiPkADCz4.json --duration 4701 --first "2026-10-20T18:30:00+02:00"
```

Le résultat est enregistré dans `.local/episode-1/native-pack.md` et `native-pack.json`. Il contient des passages candidats, leurs horodatages et des dates proposées. Cette étape ne crée ni vidéo verticale, ni Short YouTube, et ne programme aucune publication.

Pour créer les vidéos, utilisez l'outil natif de création d'extraits ou de Shorts dans YouTube Studio lorsqu'il est disponible. Sinon, Studio peut fournir une copie de votre propre vidéo pour un rendu local. Relisez chaque cadrage et chaque sous-titre. Dans Studio, réglez ensuite la visibilité sur `Programmer`, choisissez la date et l'heure, puis vérifiez que la ligne du Short affiche `Programmée`. Une vidéo `Privée` n'est pas programmée.

Pour l'audit, les modifications de métadonnées, le rendu local, le pipeline avec un fichier master et le workflow planifié, consultez le [guide d'exploitation de l'agent](tools/youtube-growth/README.md). Les opérations d'écriture demandent des droits OAuth supplémentaires et une commande explicite.

## Agent Social Network Manager

Le mode opératoire multi-réseaux est décrit dans [`tools/social-network-manager/README.md`](tools/social-network-manager/README.md). Il complète l'agent YouTube sans le remplacer. Le [dossier de lancement](docs/site/social-network-manager-2026-10-17.md) rassemble l'état vérifié des profils, l'identité Instagram, les limites d'accès, le calendrier de 30 jours et les brouillons. Le symbole social réutilise le [kit de marque SANDBOX](brand/social/README.md).

### Utiliser l'agent avec Nico et Loïc

**Pour chaque nouvel épisode : suis le [tutoriel de génération des Shorts par réseau et des vidéos de 5 à 15 minutes](tools/social-network-manager/GENERER.md).** Le code prépare des variantes distinctes pour YouTube, TikTok, Instagram et X ; le master et les MP4 générés restent locaux. La génération fonctionne sans connexion aux comptes sociaux.

1. Ouvrir le dépôt `Sandbox-podcast/sandbox-podcast-site` dans Codex ou un autre agent de code autorisé, sur la branche de travail de l'équipe.
2. Lui demander de lire `AGENTS.md`, `tools/social-network-manager/README.md` et `docs/site/social-network-manager-2026-10-17.md` avant de préparer une tâche.
3. Décrire le résultat voulu et la plateforme. Exemples : « prépare deux variantes TikTok à partir de l'extrait Codex/OpenCode » ou « relève les performances de la semaine et compare-les aux relevés précédents ».
4. Pour une tâche YouTube technique, demander explicitement le guide [`tools/youtube-growth/README.md`](tools/youtube-growth/README.md). Le Social Network Manager ne remplace pas ses commandes ni ses contrôles.
5. Relire les fichiers préparés, les sources, les sous-titres et les statuts réels dans les plateformes avant de proposer une diffusion.

Le dépôt et ses documents donnent le contexte partagé à l'agent. Un agent ouvert sans ce dépôt ne voit pas automatiquement les brouillons, les assets ni l'historique du projet. Les agents peuvent préparer et analyser; ils ne doivent pas publier, programmer, modifier une bio ou répondre publiquement sans l'accord explicite de Lou.

### Préparer et valider une publication

1. Choisir un sujet sourcé et vérifier qu'il n'a pas déjà été publié sur le réseau cible. L'état de départ des comptes est dans le dossier de lancement.
2. Donner à l'agent le lien ou l'identifiant de l'épisode, l'extrait visé, le réseau et l'objectif. Pour un extrait, préciser le fichier source et demander la vérification du contexte, de l'audio, des sous-titres et du cadrage.
3. Demander le texte propre à la plateforme, le visuel ou média associé, la source, les éventuelles réserves éditoriales et le statut proposé (`brouillon`, `à relire` ou `prêt à valider`).
4. Enregistrer les propositions dans le dépôt sans y mettre des jetons, mots de passe, codes de connexion ou exports de statistiques privées.
5. Présenter le contenu final à Lou. Après accord, la personne autorisée effectue la publication dans l'interface officielle ou via une intégration explicitement configurée, puis vérifie le statut public ou programmé et ajoute le lien de preuve au suivi.
6. Relever séparément les résultats natifs à 48 heures et à 7 jours. Toujours noter la plateforme, la période, la source et la valeur; ne pas inventer les mesures absentes.

Les comptes Instagram et TikTok ne sont pas reliés à une API de publication dans ce dépôt. X reste à vérifier. La préparation des textes et du calendrier est disponible, mais aucune publication automatique multi-réseaux n'est active. Pour un audit YouTube, chaque associé doit utiliser un compte ayant le rôle de chaîne approprié et son propre jeton local. Ne pas se transmettre les mots de passe Google ni les jetons OAuth. Commencer par l'accès en lecture; les droits d'écriture ne sont requis que pour une action explicitement autorisée.

## SANDBOX News

SANDBOX News rassemble des actualités sur l'IA et le développement, avec un lien vers le média qui les a publiées. Son collecteur consulte les pages publiques des dix médias définis dans [`news-media.ts`](apps/site/src/domain/news-media.ts), puis examine jusqu'à trois articles récents par source. Il lit leur titre, leur date et les métadonnées ou le passage public de l'article. Une source inaccessible ou une date absente ne donne pas de fiche inventée ; son état reste visible dans le fil. La collecte dépend de la structure des sites et ne garantit pas une couverture exhaustive.

Pour une nouvelle fiche, un petit modèle Qwen local produit un titre français et trois phrases à partir du passage relevé. Le traitement demande trois citations exactes de l'extrait et écarte la fiche si le texte manque ou si les citations ne correspondent pas. Argos Translate traduit ensuite le titre et les trois phrases en anglais, allemand et espagnol. Le site ne publie la fiche que si les quatre versions sont complètes. Il conserve un lien vers l'article source et indique que les résumés sont générés automatiquement ; la source reste le moyen de vérifier les faits.

Le workflow [news-refresh.yml](.github/workflows/news-refresh.yml) lance cette chaîne environ une fois par heure sur GitHub Actions. Il envoie le lot, avec un secret cron, à l'API privée du site, qui vérifie les sources et les dates, écarte les doublons et enregistre les fiches dans Postgres/Neon. Les pages `/news`, `/en/news`, `/es-es/news` et `/de-de/news` affichent les mêmes entrées dans leur langue. Le sitemap n'annonce `/news` que lorsqu'une fiche récente existe. La programmation GitHub est indicative : une exécution peut être retardée ou manquer si une dépendance ou une source est indisponible.

La collecte et la publication restent désactivées tant que leur configuration de production n'est pas faite. Après application de la migration `0016_sandbox_news_autopublishing.sql`, l'activation demande `SANDBOX_NEWS_PUBLIC=1` dans l'environnement du site, la variable GitHub `SANDBOX_NEWS_PUBLIC=true`, l'origine du site et le secret GitHub `SANDBOX_CHARTS_CRON_SECRET` déjà utilisé par les classements. Le premier lancement peut alors se faire depuis l'onglet Actions. La page reste fermée ou `noindex` avant cette activation. Les modèles et leurs dépendances sont installés dans le cache local du runner ; aucune API d'IA payante n'est appelée. Les runners GitHub et leurs minutes restent soumis aux quotas du compte.

Guide du site : [`apps/site/README.md`](apps/site/README.md). Décision, configuration et limites : [DD-0057](docs/design-decisions/dd-0057-automatisation-production-news.md).

## Fonctionnement des classements

SANDBOX CHARTS suit les projets open source sur GitHub, les skills et les modèles IA. Il conserve les mesures et leurs sources dans Postgres, puis calcule des éditions figées avec une méthode versionnée. Le classement GitHub couvre tous les domaines ; son filtre IA historique est retiré de la découverte. L'ambition est une référence internationale vérifiable. Sa couverture et sa reconnaissance restent à démontrer sur des données réelles.

### Méthodes et profils

| Classement | Profil v3 initial                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub     | 70 % de dynamique GitHub sur sept jours et 30 % de pratiques OpenSSF Scorecard. Une licence open source reconnue est requise.                   |
| Rising     | 85 % de croissance et d'accélération GitHub, 15 % d'OpenSSF. Le dépôt doit avoir au plus 25 000 stars et une accélération positive.             |
| Skills     | 70 % d'installations gagnées sur Skills.sh et 30 % de signaux GitHub. La famille dépôt combine les étoiles gagnées (60 %) et la récence (40 %). |
| Models     | 60 % d'Artificial Analysis et 40 % d'Arena texte, avec une identité de variante conservatrice, des dates récentes et au moins 1000 votes Arena. |

### Chaîne de calcul

La chaîne comporte cinq étapes :

1. Découvrir des candidats. La recherche GitHub utilise des partitions générales, des bandes de stars, plusieurs langages et les projets récents. Les sources Skills et Models alimentent leurs propres pools. Trending est collecté chaque jour avant la découverte GitHub ; sa position sert à trouver des candidats, pas de second signal de score.
2. Enregistrer les mesures. Deux collectes quotidiennes créent des créneaux UTC à 00:00 et 12:00, déclenchés à 03:17 et 15:17 UTC. Chaque relevé garde ses compteurs, résultats, références, dates, identités et créneau. GitHub et Skills comparent le relevé courant à une baseline proche de J-7 ; Rising utilise aussi J-14. Ces fenêtres mesurent la progression. Elles ne fixent pas la fréquence de mise à jour. Un compteur absent ne devient pas zéro. Les relevés historiques restent immuables.
3. Détecter les poussées. Le workflow interroge chaque heure le collecteur des étoiles, si son activation est configurée. Il cherche des gains sur 1 h, 6 h et 24 h avec la durée réellement observée et des seuils absolus et relatifs. Les signaux apparaissent séparément dans Rising et peuvent promouvoir un candidat en suivi. Ils ne donnent pas seuls un rang officiel. Le pool est borné par les quotas ; une avance sur Trending n'est pas garantie.
4. Pondérer et contrôler. Les sources sont réparties en familles dont les budgets restent fixes pour tous les candidats. Dans une famille, leur puissance dépend de la pertinence, de la rigueur, de la reproductibilité et de la résistance à la manipulation. Un même jeu de mesures ne reçoit pas deux voix. Le score retranche une pénalité de désaccord à la moyenne pondérée. Les coefficients initiaux sont à calibrer.
5. Figer et publier. GitHub Actions lance le rafraîchissement à 03:17 et 15:17 UTC. Le workflow collecte GitHub et les sources externes, puis calcule les quatre classements. Une édition n'est créée que si ses sources et ses contrôles sont suffisants. Son identifiant est le début du créneau, par exemple `2026-10-13T12:00Z` ; les identifiants quotidiens et semaines ISO historiques restent valides. Un créneau ne peut être écrit qu'une fois, même si le job est relancé. Le profil v3 exige par défaut vingt candidats complets. Un candidat incomplet qui pourrait atteindre le Top bloque le gel. Les nouveaux profils restent en brouillon jusqu'à leur revue et à l'activation de leurs versions exactes.

### Preuves et lecture des scores

Chaque édition v3 conserve une preuve JSON avec le profil, les observations normalisées et leurs liens, les contributions, la couverture, les exclusions, les rangs de sensibilité et une empreinte SHA-256. On peut la télécharger via `/api/charts/<classement>/<édition>/proof` et la rejouer avec `charts:reference`. La sensibilité varie les pondérations et retire les sources ou familles tour à tour ; ses bornes ne sont pas des intervalles de confiance. Les scores sur 100 dépendent du pool suivi et ne se comparent pas directement d'un jour à l'autre.

### Publication et exploitation

Une édition publiée ne peut pas être réécrite. Le mouvement compare deux publications espacées de huit jours au plus. Les avis de l'équipe restent séparés des données et ne changent pas les rangs. Sans édition réelle, le site montre l'attente sans inventer de rangs. Les archives v1 et v2 conservent leurs paramètres, y compris leurs anciens poids. OpenSSF mesure des pratiques ; les étoiles et installations mesurent l'attention ou l'adoption ; aucun de ces signaux ne prouve une supériorité dans tous les usages.

La mise en service demande les accès aux sources, les migrations additives 0009 et 0010, une revue des droits et des quotas, puis une calibration. Le workflow `charts-refresh.yml` porte les cadences horaires et toutes les 12 heures. Il ne s'exécute qu'une fois présent sur la branche par défaut. GitHub Actions évite d'exiger le cron Vercel Hobby, limité à une exécution par jour, pour assurer la cadence horaire et toutes les 12 heures. Voir les [limites Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing) et les [limites des horaires GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule). Le responsable doit configurer la variable GitHub Actions `SANDBOX_CHARTS_ORIGIN` et le secret `SANDBOX_CHARTS_CRON_SECRET`, identique au `CRON_SECRET` serveur. Les collecteurs Trending et poussées restent désactivés tant que leurs drapeaux ne sont pas activés. GitHub Actions peut retarder ou omettre une exécution planifiée ; le guide d'exploitation décrit cette limite et la relève des jobs.

Détails : [conception et audit](docs/site/reference-ranking-design.md), [configuration et reprise](docs/site/reference-ranking-operations.md), [prompt réutilisable](docs/site/prompt-classements-reference.md), [ADR-0026](docs/adr/ADR-0026-classements-de-reference-ponderes.md), [ADR-0027](docs/adr/ADR-0027-detection-precoce-github.md) et [ADR-0028](docs/adr/ADR-0028-cadence-des-classements.md). Les [méthodes historiques](docs/sandbox-charts-methodology.md) et le [guide des sources externes](docs/site/external-rankings.md) décrivent les versions précédentes.

### Démarrage des candidats

Les nouveaux candidats constituent d'abord leurs baselines avant admission au pool officiel : environ sept jours pour GitHub et Skills, quatorze pour Rising. Les poussées peuvent les signaler plus tôt. Après ce délai, une baseline manquante peut bloquer le Top ; elle n'est plus considérée comme une simple attente de démarrage.

## Documentation

- `docs/README.md` : index de la documentation du site.
- `AGENTS.md` : règles pour les agents IA.

## Archive

`old/` contient le travail sur l'ancien projet de plateforme de production de podcasts vidéo (code, 10 POC, ADR, rapport final). Elle n'est plus dans l'espace de travail pnpm : voir `old/README.md`.
