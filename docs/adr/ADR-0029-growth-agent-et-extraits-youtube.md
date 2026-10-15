# ADR-0029 - Growth Agent et extraits depuis YouTube

- Date : 2026-10-14
- Statut : implémentation locale; connexion API et activation permanente en attente
- Décision : décidée par l'agent sur délégation (PD-0003), à la demande de Lou

## Contexte

La mission demande un agent de croissance pour SANDBOX. Le dépôt possède un outil Python, un workflow GitHub et FFmpeg (ADR-0025). Lou ne détient pas le master et délègue le parcours depuis la vidéo YouTube.

Studio donne accès à Sandbox Podcast, chaîne `UCuATIBXo5uvNLVm-gCgMenA`, propriétaire de `GgSiPkADCz4`. La transcription automatique est exportable. Le téléchargement officiel fournit une copie 1280 x 720, 24 images/s, de 4701,553 secondes. Aucun téléchargeur tiers n'est utilisé.

## Décision

Compléter la pile Python existante dans `tools/youtube-growth`, sans nouvelle infrastructure ni service IA payant pour cette sélection. Conserver FFmpeg conformément à la demande de réutilisation. Le site et `old/` restent hors du chantier.

Contrôler la chaîne avec `channels.list(mine=true)` et le propriétaire de la vidéo avant chaque écriture. Le consentement OAuth initial demande lecture YouTube et Analytics; `--allow-writes` demande les droits supplémentaires après contrôle du pipeline. La session navigateur ne sert pas de credentials au programme.

Les modifications de titre, description et tags passent par un plan relisible. Catégorie et langues sont préservées. Sauvegarde, journal SQLite avant l'appel, vérification et restauration couvrent l'opération. Une mutation au résultat incertain n'est pas rejouée automatiquement. Les lectures peuvent réessayer avec le backoff du client Google.

Les rapports Analytics distinguent données disponibles, absentes et refusées. CTR et impressions de miniatures ne sont pas déduits d'autres métriques; les relevés Studio gardent leur provenance et période.

Le parcours sans master examine les outils natifs. Sur l'épisode 1, "Nouvel extrait vidéo" est disponible, mais "Nouveau Short" est désactivé. Un extrait horizontal privé éprouve ce parcours. La copie officielle sert ensuite à produire quatre Shorts. Leurs cadrages sont choisis après inspection des scènes. Aucune diarisation automatique n'est revendiquée.

Huit passages candidats proviennent de la transcription; quatre sont retenus. Trois publications par semaine à 17 h, heure de Paris, constituent le calendrier proposé. Le contrôle des sous-titres à l'écoute précède la publication. Un export 1080 x 1920 ne récupère pas les détails absents de la copie 720p.

Le cache GitHub existant ne garantit pas la reprise d'une écriture. Le polling lit et prépare; ses écritures sont bloquées sur un runner GitHub jusqu'à l'ajout d'un journal distant durable. Les commentaires génériques et réponses automatiques sont désactivés par défaut.

## Validation et limites

Tests : identité, propriétaire, préservation des métadonnées, restauration, mutations ambiguës, verrous, calendriers, données Analytics absentes et chemins de rendu. Chaque vidéo produite est sondée et décodée intégralement. La qualité éditoriale reste distincte du contrôle technique.

La création native d'extraits, le lancement du test natif, l'épinglage, les posts Communauté et la vidéo associée gardent une finalisation Studio. Aucun endpoint privé n'est appelé. Le contrôle initial demandé dans la mission précède l'activation automatique.
