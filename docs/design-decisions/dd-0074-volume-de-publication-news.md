# DD-0074 Volume de publication News

Date : 21 octobre 2026. Demande explicite de Lou : publier un gros volume d'articles, tous les sujets intéressants, et ne pas limiter le fil à quelques fiches par passage. Mise en oeuvre décidée par l'agent sur délégation (PD-0003).

## Règle éditoriale

Publier tous les articles pertinents pour le périmètre IA et développement qui disposent d'une source exploitable et passent les contrôles de rédaction. Aucun quota éditorial ne fixe le nombre d'articles par heure ou par jour. La priorité aux articles récents de DD-0073 organise leur traitement ; elle ne justifie pas de laisser le reste de la couverture en attente durable.

Le dernier passage série a traité vingt candidats et publié cinq fiches, alors que la file contenait environ cinq cents candidats. Un seul worker Qwen/Argos, avec vingt-deux minutes de traitement et une marge pour finir son dernier lot, ne fournit pas le débit demandé. Ce fonctionnement remplace une limite de calcul par une sélection de fait.

## Traitement du volume

Le workflow effectue une seule collecte, puis compte les candidats prêts : les réservations actives, les reprises différées, les articles déjà publiés, les tentatives épuisées et les sources de plus de quatorze jours ne demandent pas de worker supplémentaire. Un worker est prévu par tranche de vingt candidats prêts, jusqu'à huit en parallèle. Chaque worker enchaîne ses lots de cinq pendant son budget et publie toutes les fiches acceptées. Le plafond de huit borne les ressources simultanées ; il ne définit aucun quota de publication.

Les réservations Postgres et leurs verrous excluent les doublons entre workers. Le verrou global du workflow conserve une seule collecte à la fois. Un worker en échec ne coupe pas les autres ; le workflow reste en échec et conserve le signal de reprise. Le contrôle de fraîcheur intervient après tous les workers. La collecte horaire et le contrôleur existants sont conservés.

L'exigence d'au moins une publication est vérifiée sur le cycle complet, par une insertion postérieure au lancement du pool. Un worker qui ne rencontre que des fiches refusées n'est pas, à lui seul, une panne du pool. Ses erreurs de processus continuent à échouer. Un cycle qui lance des workers sans confirmer aucune publication échoue au contrôle final, même si le fil contenait déjà un article récent. Le mode série conserve son contrôle initial.

Le dépôt est public. Les workers utilisent les runners Ubuntu standards, dont [GitHub documente la gratuité pour les dépôts publics](https://docs.github.com/en/actions/reference/runners/github-hosted-runners). Les caches existants sont réutilisés. Aucun service payant, compte, secret ou réglage de facturation n'est modifié. Le nombre de jobs simultanés reste soumis à la disponibilité GitHub et au reste de l'activité du compte.

## Rejets et couverture

Les journaux donnent un motif par URL écartée : extrait absent, moins de trois passages sources utilisables, refus du modèle, résumé invalide ou traduction rejetée. Les trois phrases et leurs trois preuves restent requises. Les citations sources peuvent atteindre les 320 caractères déjà admis par le validateur, au lieu d'être limitées à 240 par le seul prétraitement Python. Aucune preuve ni date n'est inventée pour augmenter le volume.

Le nombre de fiches effectivement publiées doit être mesuré sur un passage complet. Huit workers ne garantissent pas huit fois plus de publications : cela dépend des extraits disponibles, des refus et du temps de génération. Les sources bloquées et les candidats rejetés restent des limites à traiter à partir de ces motifs.
