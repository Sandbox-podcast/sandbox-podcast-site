# ADR-0028 : cadence des classements

Date : 2026-10-13
Statut : décidée par l'agent sur délégation (PD-0003)

## Contexte

Les mesures GitHub et externes étaient limitées à un relevé par jour. Les fenêtres de score J-7 et J-14 décrivent l'historique nécessaire au calcul, pas une fréquence de publication. L'unicité par date en base empêchait de conserver deux relevés et deux classements distincts le même jour.

Les signaux de poussée reposent sur des fenêtres d'une à vingt-quatre heures. Ils ont besoin d'une collecte horaire et ne doivent pas être confondus avec les éditions classées.

Vercel Hobby limite ses crons à une exécution quotidienne. Le projet ne doit pas imposer une mise à niveau payante pour tenir le rythme demandé. GitHub Actions permet de porter le planificateur dans le dépôt. Ses événements planifiés s'exécutent depuis la branche par défaut et peuvent être retardés ou omis ; un rythme planifié ne constitue donc pas un SLA.

## Décision

Le système vise deux collectes et éditions par période de 24 heures. Les jobs démarrent à 03:17 et 15:17 UTC. Ils utilisent des créneaux de données indexés à 00:00 et 12:00 UTC. Les éditions restent immuables et sont écrites au plus une fois par classement et par créneau.

À chaque cycle, GitHub Actions lance la collecte GitHub, la collecte Skills et Models, puis le calcul des classements. Un gel n'est créé que si les données et contrôles requis sont disponibles. Une relance dans le même créneau n'ajoute pas une deuxième mesure ni une deuxième édition.

Les baselines J-7 et J-14 restent inchangées. Elles conservent le recul utile au score tandis que les collectes deux fois par jour intègrent les nouveaux compteurs. Trending sert à découvrir des candidats une fois par jour avant la recherche GitHub. Le collecteur des poussées interroge GitHub chaque heure et alimente un signal séparé de Rising.

Le workflow de référence est `.github/workflows/charts-refresh.yml`. Les requêtes aux routes Vercel restent protégées par `CRON_SECRET`. La collecte Skills.sh continue d'utiliser le jeton OIDC produit par Vercel. Les crons sont retirés de `apps/site/vercel.json` pour éviter les exécutions en double.

## Conséquences

La migration additive 0010 remplace l'unicité par date par une unicité par créneau. Elle marque les relevés existants `legacy:<date>` afin que le premier nouveau créneau ne se heurte pas aux données déjà présentes. Les identifiants de nouvelles éditions prennent la forme `AAAA-MM-JJT00:00Z` ou `AAAA-MM-JJT12:00Z`.

Le volume des relevés double par rapport à une collecte quotidienne. La rétention reste à configurer. Les fournisseurs peuvent republier les mêmes valeurs pendant plusieurs cycles ; l'édition documente alors une observation plus récente, pas une hausse artificielle. Les compteurs d'historique affichent des éditions, pas des semaines.

GitHub Actions ne garantit pas l'heure de démarrage et peut omettre un événement. La minute 17 évite le pic du début d'heure sans supprimer ce risque. Le responsable surveille les journaux et l'âge de la dernière édition. Si le niveau de service exige une exécution plus prévisible, un ordonnanceur avec les garanties adaptées peut appeler les mêmes routes authentifiées.

La mise en service requiert la variable GitHub Actions `SANDBOX_CHARTS_ORIGIN`, le secret `SANDBOX_CHARTS_CRON_SECRET` et la même valeur serveur dans `CRON_SECRET`. Le workflow planifié ne fonctionne qu'après sa présence sur la branche par défaut.

## Références

- [Limites et précision des crons Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Événements planifiés GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
