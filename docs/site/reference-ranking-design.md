# Conception et audit du classement de référence

État au 13 octobre 2026. Décisions : [ADR-0026](../adr/ADR-0026-classements-de-reference-ponderes.md) et [ADR-0027](../adr/ADR-0027-detection-precoce-github.md). Le responsable reprend la calibration, les accès et l'activation avec [le guide d'exploitation](reference-ranking-operations.md).

## Ce qui doit faire référence

La crédibilité du classement repose sur un objet précis, une couverture publiée, des données vérifiables et une méthode stable. Ajouter des classements sans examiner ce qu'ils mesurent crée des doublons et des biais. L'ambition mondiale demande aussi des contributeurs externes, un droit de correction, des éditions citables et une couverture des langues et écosystèmes qui reste à démontrer.

Quatre produits partagent le même moteur :

| Classement | Question mesurée                                                                                       | Familles et poids initiaux                          |
| ---------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| GitHub     | Quels projets open source suivis progressent sur sept jours avec des pratiques d'ingénierie mesurées ? | Dynamique GitHub 70 %, OpenSSF 30 %                 |
| Rising     | Quels projets suivis accélèrent, parmi ceux de 25 000 stars au plus ?                                  | Accélération GitHub 85 %, OpenSSF 15 %              |
| Skills     | Quels skills gagnent des installations, avec un dépôt actif ?                                          | Installations Skills.sh 70 %, signaux du dépôt 30 % |
| Models     | Quelles variantes de modèles ont les meilleurs résultats généraux selon deux formes d'évaluation ?     | Artificial Analysis 60 %, Arena texte 40 %          |

Skills ne dispose pas encore d'une évaluation indépendante de réussite par tâche. Les stars du dépôt peuvent être communes à plusieurs skills. Models reste surtout textuel et anglophone. Un système agent plus modèle ne peut pas être comparé directement à un modèle nu. Les poids livrés expriment ces choix de mesure ; ils ne sont pas appris sur des données réelles.

## Audit du système précédent

| Constat dans le code                                                | Conséquence                                                        | Traitement livré                                                                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Découverte GitHub limitée à seize topics IA                         | Les projets open source hors IA ne pouvaient presque pas entrer    | Partitions sans filtre de sujet, bandes de stars, langues et projets récents ; ordre de parcours quotidien tournant |
| Recherche limitée à deux pages, sans exploiter `incomplete_results` | La portée du pool pouvait sembler plus complète qu'elle ne l'était | Partitions incomplètes et plafonds signalés dans le journal ; aucune promesse d'exhaustivité                        |
| Skills et Models à poids égaux                                      | La pertinence propre des sources ne changeait pas leur puissance   | Budgets de famille inégaux et grille explicite de puissance au sein des familles                                    |
| Normalisation Models après intersection                             | Les modèles sans seconde source disparaissaient avant le calcul    | Percentiles par source avant intersection, candidats incomplets et bornes hautes conservés                          |
| Compteurs absents de baseline Skills convertis en zéro              | Un manque pouvait ressembler à une croissance réelle               | Baselines sans valeur écartées ; aucune baseline inventée                                                           |
| Repli Skills sur des compteurs cumulés                              | Une même version pouvait mesurer la portée au lieu de la dynamique | Le nouveau gel v3 exige les deltas ; les fonctions historiques restent dédiées aux vues secondaires                 |
| Absence de preuve commune et de sensibilité                         | Difficile de reproduire et d'évaluer la dépendance aux poids       | Preuve JSON, empreinte, rejeu CLI, couverture, contributions et scénarios                                           |
| Dépôt public assimilable à open source                              | Des licences absentes ou restrictives pouvaient entrer             | Licence GitHub stockée dans `chart_entities`, liste conservatrice de licences admises, exclusion des inconnues      |
| Rapprochement de modèles supprimant toute ponctuation               | Versions numériques ou paramètres pouvaient se confondre           | Signature de variante conservatrice ; les organisations inconnues et signatures divergentes ne fusionnent pas       |
| Relevés GitHub seulement quotidiens                                 | Les poussées de quelques heures étaient visibles tard              | Observations horaires optionnelles, détecteur 1 h / 6 h / 24 h et signaux séparés de Rising                         |

## Calcul reproductible

Chaque source a un identifiant, un producteur amont, un jeu de mesures, une famille, une fraîcheur maximale, un seuil d'échantillon et une justification. Un même couple producteur et jeu de mesures ne peut pas être déclaré deux fois dans le profil.

Dans une famille, la puissance d'une source vaut :

```text
puissance = pertinence * rigueur * reproductibilité * résistance à la manipulation
poids_source = budget_famille * puissance / somme_des_puissances_de_la_famille
moyenne = somme(poids_source * score_source)
désaccord = somme(budget_famille * abs(score_famille - moyenne))
score_final = max(0, moyenne - 0,2 * désaccord)
```

Les coefficients de la grille sont des a priori éditoriaux publics compris entre zéro et un, avec un minimum strictement positif. Le nombre de sources n'augmente pas le budget d'une famille. Avec une seule source dans une famille, sa grille ne change pas le poids de la famille : c'est le budget qui fixe son influence. Ajouter un proxy d'un même benchmark à une autre famille reste une erreur de gouvernance que la revue doit prévenir.

Les données de différentes unités sont normalisées séparément en percentiles de rang moyen. Les égalités partagent ce percentile ; un pool d'un seul élément reçoit 50. Le Top conserve des positions ordinales pour les liens et le stockage ; un score égal est départagé par identifiant stable. Les scores sont triés avant l'arrondi. Le sous-score GitHub garde ses règles et poids internes, figés avec l'édition. Skills combine 60 % de percentile des étoiles gagnées et 40 % de récence dans sa famille dépôt. Son delta est ramené à sept jours selon l'intervalle réellement observé.

Toutes les sources classantes sont requises pour chaque candidat classé. Une donnée future, ancienne ou insuffisamment échantillonnée est absente du calcul. Le moteur n'attribue pas de score officiel à un candidat incomplet. Il calcule sa borne haute en remplaçant seulement ses inconnues par 100. Si elle atteint le dernier score du Top, le gel est bloqué. La formule est monotone pour une pénalité de désaccord au plus égale à 0,5, ce qui rend cette borne conservatrice.

Le pool Models comprend les candidats avec une référence d'évaluation Arena ou Artificial Analysis dans l'historique chargé. Le catalogue Hugging Face seul sert à l'identité et à la découverte, sans prétendre couvrir tous les modèles évaluables. Le pool Skills suit le catalogue collecté ; les dépôts explicitement archivés, forks ou désactivés restent exclus. Pour GitHub, les dépôts suivis et licenciés sans relevé du jour ou sans historique suffisant restent inconnus et peuvent bloquer le gel. Les licences non reconnues et projets hors seuils ne deviennent pas des candidats arbitrairement nuls.

La preuve contient les observations normalisées, leurs dates et liens, le profil, les rangs, contributions, couvertures, exclusions et scénarios de sensibilité. Les compteurs bruts complets restent dans les relevés immuables et les métadonnées des positions. L'empreinte permet de vérifier que le rapport correspond aux entrées archivées. Elle ne certifie pas la vérité d'un fournisseur.

## Sources et indépendance

| Source                             | Rôle                                                   | Admission au rang principal                               |
| ---------------------------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| GitHub API                         | Découverte, compteurs et activité                      | Oui, dynamique des dépôts et contexte des skills          |
| OpenSSF Scorecard                  | Pratiques d'ingénierie                                 | Oui, sous les seuils de couverture existants              |
| Skills.sh                          | Installations par skill                                | Oui, adoption mesurée par le CLI                          |
| Arena                              | Préférences humaines, votes et dates de publication    | Oui, texte avec 1000 votes au minimum                     |
| Artificial Analysis via OpenRouter | Évaluations standardisées                              | Oui, avec date de mesure et rapprochement conservateur    |
| GitHub Trending                    | Découverte de candidats et présence observée           | Aucune voix supplémentaire                                |
| Hugging Face Hub                   | Identité, licence, poids accessibles et portée         | Contexte et dimensions secondaires                        |
| OpenRouter                         | Prix, portée, débit et transport d'Artificial Analysis | Aucun second vote pour transporter un benchmark           |
| OSS Insight                        | Autre lecture des événements GitHub                    | Découverte possible, même producteur amont                |
| SkillsMP                           | Autre catalogue de skills                              | Découverte possible, stars déjà issues de GitHub          |
| LiveBench                          | Évaluation indépendante à examiner                     | Attente d'un contrat de version et de mappings explicites |
| SWE-bench                          | Résolution de tâches logicielles                       | Attente de comparaisons à agent et protocole fixes        |

Les connecteurs existants et Trending sont intégrés. LiveBench, SWE-bench, OSS Insight et SkillsMP ne sont pas présentés comme connectés. Le moteur accepte des profils comportant davantage de sources, testables via la CLI d'audit. Leur branchement en production demande des mesures comparables, un adaptateur validé et une nouvelle version. Les droits d'accès et de redistribution restent à vérifier par le responsable.

## Calibration et gouvernance à reprendre

Les nouveaux candidats GitHub et Skills constituent d'abord sept jours d'historique ; Rising demande deux périodes. Ils restent visibles dans la découverte et, si une poussée est mesurée, dans les signaux intrajournaliers. Au-delà du délai d'admission, une baseline manquante garde sa borne haute et peut bloquer le Top. Cette règle permet de continuer à découvrir des projets sans empoisonner chaque gel avec des candidats entrés le jour même. Le périmètre du classement doit donc être présenté comme celui des candidats admis et suivis.

Sur un historique réel couvrant plusieurs cycles, comparer les poids initiaux à des alternatives et mesurer : renouvellement du Top, variation des rangs, couverture par source, langue et domaine, dépendance à un évaluateur, sensibilité aux changements de pool et aux signaux suspects. Les scénarios livrés varient chaque poids de 20 % et retirent tour à tour une source ou une famille. Ils ne sont pas des intervalles de confiance. Il faut aussi tester les variantes de normalisation et le chevauchement des tâches entre évaluateurs avant une revendication plus large.

Versionner le profil avant tout changement de poids, fenêtre, source ou seuil. Conserver un journal de corrections et des fenêtres de publication stables. Une source commerciale et les avis de l'équipe ne peuvent pas acheter de puissance. Une contestation doit pointer une observation, une identité ou une règle et produire une correction datée, sans réécrire une édition publiée. Une revue externe de la méthode, un dispositif de contestation public et des mappings relus complèteront le travail technique livré.

## Références consultées

- [OCDE et JRC, Handbook on Constructing Composite Indicators](https://www.oecd.org/en/publications/handbook-on-constructing-composite-indicators-methodology-and-user-guide_9789264043466-en.html) : cadre pour examiner normalisation, poids et sensibilité. Les coefficients Sandbox ne proviennent pas de ce guide.
- [Arena, FAQ méthodologique](https://arena.ai/faq) : comparaisons par paires et limites de l'échantillonnage.
- [Artificial Analysis, méthode d'évaluation](https://artificialanalysis.ai/methodology/intelligence-benchmarking) : portée des tâches et limites de l'index.
- [GitHub Search API](https://docs.github.com/en/rest/search/search) : plafond de résultats et indicateur de recherche incomplète.
- [Skills.sh API](https://www.skills.sh/docs/api) et [contrôles OpenSSF](https://github.com/ossf/scorecard/blob/main/docs/checks.md).
- [Licences reconnues par l'OSI](https://opensource.org/licenses) : base de la liste conservatrice livrée, à élargir par revue.

Les observations sur les défauts viennent du code du dépôt. Les formules et seuils nouveaux sont des décisions de conception initiales, pas des conclusions expérimentales.
