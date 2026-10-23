# ADR-0040 : vidéos YouTube thématiques locales

- Date : 2026-10-20
- Statut : implémenté et rendu sur les épisodes 01 et 02 ; écoute éditoriale complète à faire.
- Décision : décidée par l'agent sur délégation (PD-0003), à la demande de Lou.

## Besoin et existant

Lou demande des vidéos autonomes de 5 à 15 minutes à partir des émissions, sans modifier la génération des Shorts ni publier les résultats. Il précise que les deux émissions disponibles sur YouTube doivent servir à la recette.

`youtube_growth.shorts` transcrit et sélectionne avec OpenAI. `youtube_growth.rendering` produit les Shorts depuis une copie Studio et une transcription existante. Le lot E02 possède aussi trente compositions HyperFrames, un contrôle audio et sa propre file de distribution. La source E02 et sa transcription française mot à mot sont déjà locales. La copie E01 est récupérée par le téléchargement officiel de YouTube Studio ; sa transcription existante est réutilisée. Aucun téléchargement tiers ni endpoint privé n'est ajouté.

## Choix

Ajouter `youtube_growth.thematic` dans le même outil Python. Réutiliser les appels FFmpeg, les empreintes, le verrou, les écritures JSON atomiques, les SRT et la palette bleu nuit/cyan. Les commandes historiques, leurs limites et leurs manifestes ne sont pas modifiés. Refuser une destination non vide qui ne possède pas déjà un manifeste thématique correspondant.

Le plan éditorial conserve des plages chronologiques et des preuves citées pour la question, le développement et la conclusion. Une accroche de 5 à 15 secondes rejoue une intervention réelle ; le corps la replace ensuite dans son contexte. Le moteur retire uniquement les pauses de plus de 1,8 seconde sans parole transcrite. L'analyse IA peut proposer plusieurs plages pour exclure une digression ; le moteur local garde le corps continu.

Deux méthodes sont explicites :

- `local`, sans service payant : règles de discussion pour cinq familles de sujets, avec repérage de la question, d'une clôture, d'exemples et de positions. Ce vocabulaire est limité et sensible aux formulations ; il ne constitue pas une compréhension générale d'une nouvelle émission.
- `openai` : une analyse sémantique de toute la transcription, avec modèle et clé configurés par l'opérateur. Aucun appel payant n'est déclenché par défaut. Le résultat est validé puis mis en cache. Ce chemin est testé avec des réponses simulées ; aucun appel réel n'a été fait pendant la recette, faute de clé configurée.

Le classement pondère intérêt pour l'audience, discussion, autonomie, accroche, substance et rétention. Il reste un avis éditorial. Le moteur peut retenir zéro sujet et ne comble pas un quota. Les chevauchements et les sujets identiques sont écartés. La similarité sémantique plus fine dépend de l'analyseur IA.

Les MP4 sont horizontaux H.264/AAC, sans agrandissement de la source 720p. Une source 1920 × 1080 reste en 1080p. La normalisation dynamique puis LUFS agit sur le mix disponible ; aucune séparation des trois voix n'est revendiquée. Les miniatures 1280 × 720 utilisent une image réelle de la source et trois à cinq mots. Les SRT suivent le montage et sont aussi intégrés comme piste sélectionnable, ou incrustés avec une option.

Les caches dépendent de l'empreinte du master, du texte, du modèle, du prompt et des paramètres. Un autre master ou une révision doit utiliser un autre dossier. Les rendus sont installés après décodage complet et contrôle des horloges audio/vidéo. Une recette supplémentaire compare l'image et le son à la source au début, au milieu et à la fin de chaque plage conservée.

## Portée et limites

Le traitement n'a aucune commande d'upload. Il ne lit ni ne modifie la file des réseaux, les comptes ou les identifiants de Shorts publiés. Aucun commit, push, PR ou déploiement n'est réalisé.

Les limites fondées sur les pauses ASR ne certifient pas une fin de phrase. Les erreurs de transcription ne sont pas corrigées en inventant une citation. Les tests techniques et les comparaisons avec la source ne remplacent pas une écoute éditoriale intégrale avant publication. La recette et les sorties sont décrites dans [le rapport du 20 octobre](../site/youtube-thematiques-2026-10-20.md).
