# DD-0063 Stabilisation des classements, News et Time Machine

Date : 19 octobre 2026. Décidée par l'agent sur délégation (PD-0003), à la demande de Lou. Analyse technique complémentaire confiée à Sol 6.1.

## Classements

Le pilote contrôle les quatre familles, dont Rising (« À suivre »), après le gel GitHub. Il ne relance pas une deuxième collecte GitHub pour Rising. Le repli vers une édition observée de Rising dépend de ses propres données et de son propre profil. Les réponses `current` ne sont plus mises en cache ; les archives gardent leur cache.

Rising conserve ses critères : deux fenêtres de sept jours, une accélération positive, moins de 25 000 étoiles et vingt projets admissibles. Un compteur de découvertes n'est pas une édition publiable. L'interface explique l'attente et donne accès au classement GitHub. Aucun historique ni rang n'est inventé pour remplir l'onglet.

## News

Cette décision complète DD-0062. La migration additive 0018 ajoute les réservations à la file créée par 0017. Chaque réservation porte sur cinq candidats et expire après vingt minutes. Le compteur de tentatives avance au moment de la réservation ; un arrêt brutal ne peut donc pas rejouer indéfiniment les mêmes premières entrées. La clôture exige l'identifiant de réservation. Un article déjà publié est réconcilié à la réservation suivante, même si l'accusé précédent a été perdu.

Le runner traite plusieurs lots dans un budget de vingt-deux minutes, avec une marge pour terminer un lot avant le timeout. Une erreur d'infrastructure reste visible dans le résultat final. Une traduction rejetée ne bloque plus toutes les autres fiches du lot. L'API accepte les statuts d'un sous-ensemble connu des sources pendant la transition entre les versions à dix et à 105 sources ; elle continue à vérifier les identités et URL. Le nouveau worker exige le protocole de file 2 avant toute collecte.

Les essais réels avec Qwen3-1.7B ont produit des réponses vides ou des résumés inutilisables. Le modèle retenu est Qwen3-4B-Instruct-2507, quantifié Q4_K_M. Les poids restent hors Git et sont installés sur le runner, sans API de génération payante :

- Modèle [Qwen officiel](https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507/tree/cdbee75f17c01a7cc42f958dc650907174af0554), licence Apache 2.0.
- Fichier [Unsloth GGUF](https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF/tree/a06e946bb6b655725eafa393f4a9745d460374c9), révision figée.
- SHA-256 : `3605803b982cb64aead44f6c1b2ae36e3acdb41d8e46c8a94c6533bc4c67e597` ; 2 497 281 120 octets.

Le résumé doit contenir trois phrases distinctes et trois citations exactes. Le schéma contraint les citations à des passages choisis dans l'extrait ; il ne démontre pas à lui seul que chaque reformulation est juste. La première personne de l'éditeur est refusée. Le titre reprend la première phrase validée pour éviter une affirmation supplémentaire. « Aujourd'hui » est retiré des fiches conservées dans l'historique. Les traductions préservent les nombres écrits en chiffres et protègent explicitement les unités « tokens d'entrée » et « tokens de sortie ». Une fiche incomplète ou refusée reste hors du fil public.

La découverte trie les liens datés avant de limiter les lectures à douze articles par source. Les changelogs prennent les vingt entrées datées les plus récentes, quel que soit l'ordre du HTML. Les paragraphes d'article sont préférés aux métadonnées et éléments de navigation pour construire l'extrait.

Les cartes de blog dans un en-tête ou une zone annexe restent des liens admissibles. Les chemins localisés du blog Perplexity sont inscrits explicitement. Pour Meta, Alibaba Cloud et Ai2, le parseur accepte les libellés de date visibles de l'éditeur, sans extraire une date citée dans un paragraphe narratif. Le passage complet dispose d'un budget de huit minutes partagé avec les requêtes et leurs redirections ; une panne réseau ne prolonge pas indéfiniment la collecte.

Un contrôle du fil public signale une collecte datant de plus de trois heures, un fil vide ou l'absence de source lisible. Ce contrôle ne prouve ni la qualité de chaque résumé ni un déclenchement toutes les heures. Les retards réellement observés sur GitHub Actions restent un point d'exploitation : une garantie stricte demande un planificateur disposant du niveau de service voulu. Aucun compte, forfait ou service supplémentaire n'est activé par cette décision.

La publication d'un candidat conserve la date de la dernière collecte reçue par la file. Elle ne la remplace pas par l'heure de publication : traiter un ancien arriéré ne doit pas rendre artificiellement vert le contrôle de fraîcheur. Génération et traductions partagent une échéance de quatorze minutes, qui annule aussi les sous-processus ; une reprise article par article respecte donc la réservation de vingt minutes.

## Navigation et Time Machine

Le menu et le footer partagés utilisent « Actualités », avec EN/ES/DE. Le décor radar existant est réutilisé ; sa zone cliquable est vérifiée avec un fil publié. La Time Machine conserve sa direction artistique, présente les années près de la chronologie et affiche les archives récentes en premier. Le survol ne change plus la sélection. Le clic, le clavier et le tactile permettent de choisir un événement ; les filtres avancés restent disponibles.

## Livraison

Les correctifs complémentaires restent locaux. La PR 94 a déjà livré le registre et le protocole 2, mais la file n'existe pas dans le schéma Neon consulté après son déploiement. Commits, pushes, PR, migrations et publication du complément attendent l'accord du propriétaire conformément à AGENTS.md. Appliquer 0017 puis 0018 après sauvegarde de la base cible et vérification du journal des migrations, livrer les corrections de l'application et du worker, puis contrôler un cycle réel. Le [rapport d'audit](../site/audit-stabilisation-2026-10-19.md) distingue les preuves locales des vérifications et blocages de production.
