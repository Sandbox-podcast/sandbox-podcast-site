# DD-0074 Volume de publication News

Date : 21 octobre 2026. Demande explicite de Lou : publier un gros volume d'articles, tous les sujets intéressants, et ne pas limiter le fil à quelques fiches par passage. Mise en oeuvre décidée par l'agent sur délégation (PD-0003).

## Règle éditoriale

Publier tous les articles pertinents pour le périmètre IA et développement qui disposent d'une source exploitable et passent les contrôles de rédaction. Aucun quota éditorial ne fixe le nombre d'articles par heure ou par jour. La priorité aux articles récents de DD-0073 organise leur traitement ; elle ne justifie pas de laisser le reste de la couverture en attente durable.

Le dernier passage série a traité vingt candidats et publié cinq fiches, alors que la file contenait environ cinq cents candidats. Un seul worker Qwen/Argos, avec vingt-deux minutes de traitement et une marge pour finir son dernier lot, ne fournit pas le débit demandé. Ce fonctionnement remplace une limite de calcul par une sélection de fait.

## Traitement du volume

Le workflow effectue une seule collecte, puis compte les candidats prêts : les réservations actives, les reprises différées, les articles déjà publiés, les tentatives épuisées et les sources de plus de quatorze jours ne demandent pas de worker supplémentaire. Un worker est prévu par tranche de vingt candidats prêts, jusqu'à huit en parallèle. Chaque worker enchaîne ses lots de cinq pendant son budget et publie toutes les fiches acceptées. Le plafond de huit borne les ressources simultanées ; il ne définit aucun quota de publication.

Chaque worker parallèle dispose de trente-deux minutes de traitement dans son job de quarante-cinq minutes. La collecte a son propre job et ne consomme plus ce budget. La marge de quatorze minutes pour terminer un lot reste appliquée avant d'en réserver un autre. Le mode série garde ses vingt-deux minutes. Cette répartition utilise le temps libéré par la séparation des jobs, sans allonger la réservation d'un article ni le timeout du job.

Le contrôle final relève aussi les candidats encore prêts, sans les réserver ni lancer de nouveaux modèles. Le résultat distingue ainsi les publications reçues, les candidats restant immédiatement traitables et ceux qui attendent leur prochaine tentative.

Le premier pool réel révèle un arrêt natif `SIGSEGV` du modèle. La génération isole désormais chaque article dans son propre processus au sein du lot. Un arrêt natif ne fait plus perdre les autres résumés produits. Les fiches réussies sont publiées ; l'URL en erreur conserve sa réservation jusqu'à expiration pour une reprise normale et ne rejoint pas les refus éditoriaux différés de vingt-quatre heures. Les erreurs restent comptées et font échouer le workflow. Trois lots consécutifs entièrement en erreur arrêtent le worker. Le budget global de quatorze minutes du lot et la réservation de vingt minutes restent appliqués.

Les réservations Postgres et leurs verrous excluent les doublons entre workers. Le verrou global du workflow conserve une seule collecte à la fois. Un worker en échec ne coupe pas les autres ; le workflow reste en échec et conserve le signal de reprise. Le contrôle de fraîcheur intervient après tous les workers. La collecte horaire et le contrôleur existants sont conservés.

L'exigence d'au moins une publication est vérifiée sur le cycle complet, par une insertion postérieure au lancement du pool. Un worker qui ne rencontre que des fiches refusées n'est pas, à lui seul, une panne du pool. Ses erreurs de processus continuent à échouer. Un cycle qui lance des workers sans confirmer aucune publication échoue au contrôle final, même si le fil contenait déjà un article récent. Le mode série conserve son contrôle initial.

Le dépôt est public. Les workers utilisent les runners Ubuntu standards, dont [GitHub documente la gratuité pour les dépôts publics](https://docs.github.com/en/actions/reference/runners/github-hosted-runners). Les caches existants sont réutilisés. Aucun service payant, compte, secret ou réglage de facturation n'est modifié. Le nombre de jobs simultanés reste soumis à la disponibilité GitHub et au reste de l'activité du compte.

## Rejets et couverture

Les journaux donnent un motif par URL écartée : extrait absent, aucun passage source utilisable, refus du modèle, résumé invalide ou traduction rejetée. Lou confirme le 21 octobre des résumés de une à trois phrases selon les faits disponibles, avec une citation source distincte par phrase. Une brève avec un seul fait vérifiable peut être publiée. Les citations sources peuvent atteindre les 320 caractères déjà admis par le validateur, au lieu d'être limitées à 240 par le seul prétraitement Python. Aucune preuve ni date n'est inventée pour augmenter le volume.

Le nombre de fiches effectivement publiées doit être mesuré sur un passage complet. Huit workers ne garantissent pas huit fois plus de publications : cela dépend des extraits disponibles, des refus et du temps de génération. Les sources bloquées et les candidats rejetés restent des limites à traiter à partir de ces motifs.

## Correction du compteur après le premier passage

Le premier passage parallèle annonce 504 candidats en attente mais zéro prêt. Le compteur utilisait une sous-requête corrélée dans une projection à une seule table. Drizzle retirait les qualifications des deux colonnes `canonical_url` ; la comparaison devenait interne à `news_items`. Dès qu'un article publié existait, tous les candidats disparaissaient du compte. Les tests initiaux de ce compteur avaient une table d'articles vide.

La correction qualifie explicitement les colonnes des deux tables. Une régression contient un article publié distinct des deux candidats : elle reproduit le zéro erroné, puis vérifie le compte de deux candidats prêts et l'exclusion du seul candidat effectivement publié. Le planificateur refuse désormais un compteur inférieur au nombre de candidats prêts renvoyés dans la même réponse, au lieu de terminer sans lancer les workers.

## Publication française et reprise des traductions

Lou confirme explicitement le 21 octobre : publier dès que le résumé français est validé, puis compléter les traductions en échec. Le worker de rédaction publie donc sans lancer Argos. Les fiches françaises sont stockées durablement ; l’absence de titres dans une autre langue constitue la file de reprise, sans migration ni nouveau service. Un job distinct complète les langues manquantes après chaque cycle, y compris si un worker de rédaction échoue. Ses pages parcourent les URL sans rester sur la première fiche en erreur. Le budget de reprise est borné ; le cycle suivant retrouve les langues encore absentes.

Le complément verrouille la fiche et compare le texte français et son empreinte. Il ajoute seulement les langues absentes, conserve les traductions déjà publiées, le français, la source et les dates. Les routes traduites n’affichent une fiche que lorsque leur langue est disponible ; aucun texte français ne leur est présenté comme une traduction. Les API de reprise exigent le secret cron côté serveur et bornent les corps reçus.

La lecture filtre la langue en base avant la pagination. Plus de trente publications françaises ne doivent pas masquer les articles plus anciens déjà traduits dans les autres langues. Le curseur et la langue restent associés lors du chargement suivant.

Lou précise : ne jamais afficher deux fois la même phrase. Le résumé visible retire toute phrase identique au titre, après normalisation des espaces, de la casse et de la ponctuation finale, ainsi que les doublons internes. Les autres faits restent affichés. Une brève dont le titre porte l’unique fait montre le titre et le lien source sans paragraphe répété. Cette règle s’applique aussi aux fiches déjà enregistrées et à chaque langue ; les textes sources stockés restent disponibles pour la reprise des traductions.
