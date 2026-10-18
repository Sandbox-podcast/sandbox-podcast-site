# SANDBOX 2 : Shorts et publications

Les 30 vidéos verticales sont dans [shorts/](shorts/). Le téléchargement source depuis Studio et les exports restent locaux ; les médias volumineux sont ignorés par Git.

## Sommaire

- [Fichiers](#fichiers)
- [Calendrier enregistré et nouvelle échéance](#calendrier-enregistré-et-nouvelle-échéance)
- [Lire les états](#lire-les-états)
- [Contrôles](#contrôles)
- [Reprise](#reprise)

## Fichiers

| Fichier ou dossier              | Contenu                                                           |
| ------------------------------- | ----------------------------------------------------------------- |
| `shorts/*.mp4`                  | 30 extraits, 720 x 1280, 30 images/s, son original                |
| `clips-plan.json`               | Sources, timecodes, titres, catégories et chemins                 |
| `publication-queue.json`        | Une ligne par extrait et réseau, avec texte, date et confirmation |
| `replanification-proposee.json` | Dates actuelles et cibles proposées par extrait et par réseau     |
| `render-status.json`            | Résultats techniques des 30 exports                               |
| `shorts/qa-*.jpg`               | Images de contrôle au début, au milieu et à la fin                |
| `composition/projects/`         | Projets de montage HyperFrames et ressources locales              |
| `miniatures/`                   | Trois miniatures de l'épisode long pour le test natif             |
| `audio/`                        | Export audio de l'épisode pour Spotify                            |

## Calendrier enregistré et nouvelle échéance

Dates en Europe/Paris. Le prochain épisode est prévu autour du 25 octobre : les 30 Shorts d'E02 doivent tous être diffusés avant cette date; les Shorts d'E03 commencent du 25 octobre au 1er novembre.

Le tableau ci-dessous décrit les dates déjà inscrites dans la file et ne respecte pas encore cette nouvelle échéance. La proposition de déplacement répartit les 30 publications de chaque réseau sur les six jours du 19 au 24 octobre, à raison de cinq sorties par jour et par réseau. Le détail par extrait, avec les dates actuelles et les cibles, est dans [`replanification-proposee.json`](replanification-proposee.json). Cette proposition est locale : elle ne modifie aucune réservation native. Les lignes `scheduled_confirmed`, `submitting`, `uploading`, `needs_verification` et `queued_native_retry` doivent être réconciliées dans les plateformes avant de considérer le nouveau calendrier comme confirmé.

| Réseau    | Cadence                        | Horaires locaux            | Période du lot           |
| --------- | ------------------------------ | -------------------------- | ------------------------ |
| YouTube   | 3/jour                         | 09:00, 12:30, 20:30        | 19 au 28 octobre         |
| TikTok    | 3/jour                         | 11:30, après-midi, 20:30   | 19 au 28 octobre         |
| Instagram | 4/jour, puis 2 le dernier jour | 10:00, 13:00, 17:00, 20:00 | 19 au 26 octobre         |
| X         | 2/jour                         | 10:30, 15:00               | 19 octobre au 2 novembre |

L'épisode long `7KVqydbGow0` reste non répertorié. Lou a choisi de le rendre public manuellement le 18 octobre à 21 h. Les Shorts commencent le lendemain. Les posts déjà programmés de l'épisode 1 sont conservés.

## Lire les états

- `pending` : pas encore envoyé.
- `uploading` : import en cours ; aucun succès présumé.
- `uploaded_private` : fichier reçu par YouTube, configuration non terminée.
- `submitting` : validation demandée, confirmation à vérifier avant toute nouvelle tentative.
- `scheduled_confirmed` : programmation native confirmée, identifiant ou preuve enregistrée.
- `scheduled_agent` : publication future confiée à l'agent local ; ce n'est pas une réservation native.
- `queued_native_retry` : reprise planifiée d'une programmation native encore non confirmée. Ce statut ne signifie pas que la vidéo sera publiée automatiquement à la date prévue.
- `published_confirmed` : publication visible, avec URL et preuve.
- `needs_verification` : résultat ambigu, vérifier le compte avant de renvoyer.

Lou a terminé la connexion Meta Business Suite le 18 octobre. Le compte `@sandbox.talkshow` est vérifié et la programmation native est désormais accessible. Le premier Reel, E02-007, est réservé le 19 octobre à 10 h. Les 29 autres ont été envoyés par l'outil d'import groupé; leurs états sont mélangés dans la file et doivent être lus avant toute nouvelle tentative. La nouvelle échéance du 24 octobre rend nécessaires la réconciliation et, si Lou valide la proposition, le déplacement des créneaux concernés.

La routine finie `sandbox-e02-confirmer-les-reels-meta` vérifie ces réservations jusqu'au 19 octobre à 9 h 50. Elle conserve le traitement en cours et recherche les doublons avant toute reprise. L'ancienne routine `sandbox-e02-publier-la-file-instagram` reste un secours local pour les éléments qui ne sont pas réservés dans Meta, à 10 h, 13 h, 17 h et 20 h jusqu'au 26 octobre. Elle doit relire les réservations natives avant de publier. Les lignes `submitting` ne doivent pas être renvoyées sans réconciliation. Après confirmation des 30 réservations Meta, arrêter les deux routines.

Les automatisations actives consultées le 18 octobre gardent encore cette ancienne fenêtre : réconciliation Meta jusqu'au 19 à 9 h 50, programmation TikTok jusqu'au 22 et secours Instagram jusqu'au 26. La proposition JSON ne les met pas à jour. Avant leur prochaine action, elles doivent être suspendues ou révisées pour qu'aucune nouvelle réservation E02 ne dépasse le 24 octobre.

**Une réservation native confirmée ne dépend plus de l'ordinateur ni de Codex pour sa diffusion.** Une éventuelle publication par la routine locale exige leur disponibilité. Un seul Reel par créneau, sans rattrapage en rafale des créneaux manqués.

Après la question de Lou sur les 30 publications simultanées, le choix retenu est de répartir le lot. Quatre Reels par jour constituent un test de lancement, pas un optimum validé. [Meta propose des conseils de fréquence personnalisés dans son espace Best Practices](https://about.fb.com/news/2024/10/best-practices-education-hub-creators-instagram/). Les horaires exacts, y compris les ajustements du sélecteur TikTok, figurent dans la file.

### Relevé Meta du 18 octobre à 15 h 35

Cinq Reels sont confirmés : E02-007, E02-017, E02-003 et E02-008 occupent les quatre créneaux du 19 octobre ; E02-015 est réservé le 20 octobre à 17 h. Le lot initial n'a pas donné d'autres réservations visibles et son onglet n'est plus disponible. Les reprises individuelles ont commencé après vérification de Scheduled, Published et Drafts. Les confirmations et leurs preuves figurent dans la file.

Le compositeur Reels consulté refuse les vidéos de 90 secondes ou plus. Les originaux E02-004, E02-005, E02-020 et E02-030 dépassent cette durée. L'autre outil Create post refuse leur format 9:16 ; son éditeur propose seulement une coupe, avec une limite affichée de 60 secondes. E02-020 reste non confirmé, avec ses deux formulaires conservés. Aucun fichier n'a été raccourci ou recadré. Poursuivre les clips compatibles et chercher une voie officielle pour les extraits longs avant de les envoyer de nouveau.

## Contrôles

Les 30 fichiers passent le contrôle des dimensions, de la durée, d'une piste audio unique et le décodage intégral. Les 90 images de début, milieu et fin ont été examinées. Le cadrage principal conserve un second affichage complet de la source pour les démonstrations et le contexte.

Les sous-titres viennent d'une transcription automatique horodatée, avec corrections de termes évidents et ajustements des coupes. Une écoute intégrale des 30 montages n'a pas été réalisée. Les cas métiers restent présentés comme des pistes à cadrer et tester ; les positions du débat restent attribuées à leurs auteurs.

Les contrôles automatiques des plateformes peuvent finir après l'enregistrement d'une programmation. Leur absence de signalement ne garantit pas la diffusion ni la portée. Aucun gain d'abonnés n'est encore attribué à ce lot.

## Reprise

Lire la file avant de reprendre un import. Vérifier la liste native en cas de statut `submitting` ou `needs_verification`. Ne jamais relancer `calendar-e02.py` sur la file existante : ce script de préparation réinitialiserait les confirmations.

Le journal détaillé et les captures sont dans `.local/social-network-manager/`, ignoré par Git. La note de livraison est `.local/social-network-manager/daily/2026-10-18-episode-02-shorts.md`.

Les variantes compressées pour les imports sont dans `shorts/upload-variants/`. Le dossier `shorts/` conserve exactement les 30 MP4 de référence à sa racine. Les variantes gardent les mêmes images, durée et son ; elles restent en 720 x 1280. Elles ont été décodées intégralement après compression. Elles ne constituent pas de nouveaux extraits à republier en double.

Les projets générés par HyperFrames et leurs bibliothèques locales sont exclus du formatage et du lint du dépôt, comme les médias temporaires. Les fichiers de suivi à la racine de ce lot restent contrôlés. Les contrôles du moteur, les sondes vidéo et le décodage vérifient les exports.

### État opérationnel du 18 octobre à 16 h 15

La proposition de replanification des 30 Shorts par plateforme, sur cinq jours de publication du 19 au 24 octobre, a été approuvée. L’autre tâche coordonnée traite YouTube et X ; cette tâche traite Instagram et TikTok. La proposition JSON précise chaque créneau en Europe/Paris. Elle doit être vérifiée dans les listes natives avant d’être considérée comme appliquée.

Meta affiche huit réservations Instagram : E02-007, E02-017, E02-003, E02-008, E02-015, E02-023, E02-018 et E02-012. La file porte aussi 21 lignes `submitting` et E02-020 `needs_verification`; elles ne valent pas confirmation. Les quatre variantes Instagram E02-004, E02-005, E02-020 et E02-030 ont été créées et validées séparément, sous 90 secondes, en 720 x 1280 à 30 images/s, avec le son original. Elles permettent de reprendre les envois compatibles par le compositeur Reel. Les formulaires Meta d’origine pour E02-020 restent préservés.

TikTok affiche 24 réservations confirmées et six lignes non terminées. La liste native a confirmé E02-002, ID `7698005648381971734`, le 26 octobre à 20 h 30. La routine TikTok est active jusqu’au 24 octobre pour déplacer les réservations vers les créneaux approuvés, puis reprendre les éléments restants après les contrôles natifs. La routine Meta est active jusqu’au 24 octobre, avec au plus six lignes par exécution. Le secours local de publication Instagram reste en pause pendant la programmation Meta. Aucune réservation n’est déclarée terminée sans preuve native et identifiant.

### État opérationnel au 18 octobre, 16 h 30

La proposition approuvée répartit les Shorts E02 du 19 au 24 octobre, cinq par jour et par réseau. Les dates natives doivent être vérifiées dans chaque plateforme : le fichier de proposition ne réserve pas les publications à lui seul.

Meta a confirmé les déplacements d’E02-008 au 19 octobre à 17 h et d’E02-023 au 20 octobre à 15 h ; E02-015 est au 20 octobre à 13 h. Les trois identifiants Meta sont conservés et les captures sont dans le dossier local de preuves. Le compte Instagram affiche huit réservations E02 confirmées ; les lignes `submitting` et `needs_verification` ne sont pas comptées comme réservées.

TikTok a supprimé la réservation E02-002 après vérification du titre et de son identifiant, conformément à l’autorisation de Lou de supprimer puis recréer les 24 réservations confirmées. E02-002 est à recréer au 23 octobre à 18 h. Le fichier source validé est conservé. E02-014 a été réimporté dans son formulaire existant ; son aperçu est chargé, mais la vérification native de contenu est en cours. Il n’est pas programmé et ne doit pas être soumis avant la fin du contrôle. Le relevé après mise à jour compte 23 réservations TikTok encore confirmées, six éléments en reprise et E02-014 en cours de contrôle.

La file partagée, le journal d’événements, le calendrier et la validation locale ont été actualisés. Les états YouTube et X sont conservés tels quels.

### Mise à jour TikTok — 18 octobre, 16 h 39

E02-014 est désormais confirmé dans le profil TikTok au 23 octobre à 20 h 30, ID `7698016642806107414`. E02-002 a été annulé puis réimporté avec son fichier validé ; son nouveau contrôle natif est en cours. Aucun nouvel identifiant n’est confirmé pour lui. Le total actuel est de 24 réservations TikTok confirmées sur 30 ; E02-002 est en cours de contrôle et cinq autres éléments restent à reprendre. Voir la file et la note datée pour les preuves et l’état complet.
