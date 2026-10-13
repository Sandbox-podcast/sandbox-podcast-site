# ADR-0025 — Automatisation de la chaîne YouTube SANDBOX

- Date : 2026-10-13
- Statut : accepté pour le périmètre réalisable dans le dépôt ; activation distante en attente de configuration
- Décision : décidée par l'agent sur délégation (PD-0003), à la demande de Lou

## Contexte

Lou demande qu'une nouvelle vidéo déclenche la création de plusieurs miniatures, un commentaire ancré, des réponses aux commentaires et la préparation de Shorts quotidiens. Le dépôt contient déjà l'identité visuelle de la chaîne dans `brand/youtube/`.

L'API YouTube Data v3 permet de détecter des vidéos, lire des commentaires, publier un commentaire de premier niveau ou une réponse, téléverser une miniature choisie et téléverser/programmer une vidéo fournie par le client. Elle ne fournit pas de méthode pour épingler un commentaire ni pour démarrer l'expérience native « Test & compare ». L'API ne fournit pas non plus le fichier audiovisuel d'une vidéo afin de le découper. Lou précise que la personne qui détient le master sur son ordinateur lancera localement la création des Shorts ; aucun stockage commun n'est requis.

## Décision

Créer `tools/youtube-growth/`, un outil Python lancé par GitHub Actions toutes les 30 minutes. Il repère les nouvelles vidéos publiques, produit trois propositions de miniatures, peut publier un commentaire de lancement et peut répondre aux commentaires avec un fournisseur IA configuré. Les actions publiques restent conditionnées par `YOUTUBE_EXECUTE_ACTIONS`; les commentaires sensibles ou hors contexte sont ignorés et signalés pour revue. Le premier lancement établit un curseur sans retraiter l'historique.

Le commentaire de lancement est publié comme commentaire de premier niveau et doit être épinglé manuellement dans YouTube Studio. Les miniatures restent des propositions téléchargeables en artefact GitHub ; l'équipe doit les sélectionner dans Test & compare sur Studio, qui mesure la part de temps de visionnage. Aucune rotation séquentielle n'est appelée un test A/B.

Ajouter une commande locale `python -m youtube_growth.shorts` qui prend explicitement le chemin d'un master présent sur l'ordinateur de l'uploader, transcrit et sélectionne jusqu'à sept extraits de 15 à 60 secondes, crée des vidéos verticales avec sous-titres incrustés et conserve les rendus dans un dossier ignoré par Git. Sans `--publish`, elle ne fait que préparer les fichiers. Avec `--publish` et le jeton OAuth local de l'uploader, elle téléverse les Shorts comme vidéos privées et les programme un par jour à 17 h, heure de Paris. Un manifeste local permet de reprendre un run sans refaire la transcription ni retéléverser les clips déjà programmés. Le master ne quitte pas la machine ; son audio est envoyé à l'API de transcription, puis le texte transcrit à l'API de sélection. Une vidéo YouTube ne sera pas téléchargée par une méthode non officielle.

## Sécurité et limites

- Le jeton OAuth est un secret GitHub, jamais un fichier versionné.
- Les commentaires sont transmis au fournisseur IA configuré lorsqu'une réponse est évaluée ; les réponses ne sont envoyées que si le modèle renvoie une décision valide et positive.
- Les commentaires sensibles, contenant des coordonnées, sans réponse fiable, ou déjà répondus ne reçoivent pas de réponse automatisée.
- Les caches d'état GitHub ne sont pas une base transactionnelle. En cas de curseur disparu, l'outil se réinitialise sans rejouer l'historique.
- Les administrateurs autorisés doivent avoir accès au dépôt GitHub. Aucun compte n'est ajouté ici faute de liste d'identifiants.

## Conséquences

L'automatisation ne devient active qu'après le push sur la branche par défaut, l'autorisation OAuth et la configuration des Secrets/Variables GitHub. Les réponses/commentaires publiés nécessitent un projet API YouTube éligible et l'accord explicite de l'équipe dans la configuration. La programmation de Shorts exige l'intervention locale d'un uploader qui a accès au master, une clé OpenAI, FFmpeg et un jeton OAuth YouTube autorisé. L'API de programmation impose un upload privé et une date future ; l'équipe vérifie chaque rendu avant d'utiliser `--publish`.
