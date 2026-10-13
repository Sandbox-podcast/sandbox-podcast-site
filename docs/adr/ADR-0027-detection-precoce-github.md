# ADR-0027 : détection précoce des poussées GitHub

- Date : 2026-10-13
- Statut : accepté pour implémentation, activation à configurer
- Décision : décidée par l'agent sur délégation (PD-0003), selon la demande de Lou de suivre les étoiles et GitHub Trending

## Décision

Ajouter des observations intrajournalières de compteurs GitHub, distinctes des snapshots quotidiens. Un job borné surveille au plus 200 dépôts par défaut, par lots GraphQL de vingt. Les dépôts sans relevé récent passent en premier pour faire tourner le pool. Il respecte les identités GitHub, les statuts de suivi, les exclusions et les licences reconnues. Les accès privés, forks, dépôts archivés et changements d'identité sont refusés. Une chute importante du compteur attend un contrôle.

Les fenêtres initiales sont une heure, six heures et vingt-quatre heures. Le gain minimal est respectivement 25, 100 et 300 étoiles. Il faut aussi une croissance relative de 5 %, 10 % ou 15 %, avec un dénominateur d'au moins 200 étoiles. Un gain exceptionnel de 250, 1000 ou 3000 étoiles suffit pour un grand dépôt. La baseline doit être proche de la fenêtre à 25 % au plus. Le débit utilise le temps réellement observé. L'accélération exige une période antérieure de vitesse positive. Sans baseline admissible, aucun signal n'est créé.

Ces seuils sont des paramètres initiaux à calibrer, pas une preuve de manipulation ni de qualité. Le signal conserve les compteurs, les heures, la fenêtre et la politique complète. Les relevés et événements sont immuables dans trois nouvelles tables de la migration 0009. Le signal peut promouvoir un candidat en suivi, sans contourner un blocage manuel. Il apparaît dans une section distincte de Rising, triée par gain horaire observé. Il ne modifie pas seul le rang officiel v3.

GitHub Trending devient une source de découverte optionnelle. Le connecteur lit uniquement les identifiants des dépôts dans les titres de la page publique, valide ensuite chaque dépôt avec l'API GitHub et conserve la liste observée avec sa date et son empreinte. Il n'exécute aucun HTML et échoue explicitement si le format change. Trending ne reçoit aucun poids supplémentaire : son signal provient déjà de GitHub. Sa collecte reste désactivée avant revue de ses conditions.

## Activation

Les deux jobs sont désactivés par défaut. Les routes cron vérifient le secret existant. Le fichier `vercel.bursts.example.json` donne une cadence horaire, à intégrer seulement après vérification du forfait, du quota et du budget. La configuration Vercel active conserve ses quatre crons actuels. Aucun compte, abonnement ou service n'est créé.

## Limites

La détection couvre le pool surveillé, pas tous les dépôts GitHub. Si ce pool dépasse le budget horaire, sa rotation allonge le délai et peut laisser une fenêtre sans baseline. On ne peut pas garantir de précéder Trending. Le délai entre un signal et la première présence observée dans Trending doit tenir compte de la fréquence d'échantillonnage ; une absence entre deux collectes ne prouve pas une absence continue. La version livrée stocke les observations nécessaires, sans annoncer de gain de délai mesuré.

Voir [configuration et reprise](../site/reference-ranking-operations.md).
