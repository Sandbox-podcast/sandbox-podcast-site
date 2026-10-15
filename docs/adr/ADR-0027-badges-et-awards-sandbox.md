# ADR-0027 : badges publics et récompenses Sandbox

Date : 2026-10-14. Statut : implémenté localement. Décision : décidée par l'agent sur délégation (PD-0003), selon la mission Badges & Awards de Lou.

## Contexte et audit

`apps/site` utilise Next.js 16, React 19, Zod, Drizzle et Postgres/Neon. Les éditions quotidiennes GitHub et Rising, leurs positions et leurs preuves sont déjà conservées dans `weekly_chart_editions` et `weekly_rankings`. Les relevés quotidiens sont immuables. Les API publiques, les pages et le cron quotidien lisent cette même base.

Rookies correspond au classement `rising`. Le moteur retient les dépôts suivis et éligibles, une accélération positive et un plafond de stars configurable (25 000 par défaut). Le score combine GitHub à J-7/J-14 et OpenSSF, selon ADR-0024. Le départage existant suit le score, les stars gagnées, puis le slug. Les données locales de démonstration ne sont jamais utilisées par les endpoints de badges.

L'identifiant numérique GitHub est unique en base. Le slug Sandbox est conservé lors d'un renommage ou d'un transfert. Les pages de fiches existent sous `/charts/project/:slug`. Le site utilise le bleu nuit et le cyan, Archivo et JetBrains Mono, ainsi qu'un triangle SVG dans `app/icon.svg`. Le consentement Analytics existe déjà.

## Décision

- Servir les SVG dans les Route Handlers du site, avec des URL numériques permanentes. Deux gabarits fixes reprennent le triangle et les couleurs existantes. Les textes XML sont échappés, sans script, police distante ou requête GitHub lors du rendu.
- Lire le dernier payload GitHub publié pour le badge Top 100. Une mesure de 48 heures ou plus donne un badge neutre. Les états indisponible, hors classement et en attente ne portent aucune distinction active. Le moteur publie aujourd'hui 20 positions : la fonctionnalité ne crée aucun rang 21 à 100.
- Attribuer au maximum un Rising Star par semaine ISO en Europe/Paris, après sa clôture. La source doit être l'édition quotidienne Rising du dimanche, publiée, complète et issue du moteur corroboré. Le premier rang officiel gagne. Un dimanche absent ne peut être remplacé par une édition antérieure.
- Conserver l'attribution, le rang, le score, l'identifiant GitHub, la règle, la référence de l'édition et la preuve avec empreinte SHA-256. La contrainte unique et les triggers SQL protègent l'unicité et l'immuabilité. Un retrait ajoute une trace distincte avec motif et opérateur ; la semaine n'est pas réattribuée.
- Réutiliser le cron quotidien de gel pour reprendre les semaines closes. Les relances et les exécutions concurrentes ne modifient pas les attributions existantes. Un CLI fournit une simulation et un retrait explicite.
- Ajouter le générateur aux fiches et un lien discret dans les détails du classement, sans requête par ligne. La page `/charts/awards` explique la méthode, l'installation et l'historique réel. Les événements mesurent une action ou une visite attribuée, après consentement ; aucune installation n'est déduite d'une copie.

## Rendu et cache

[badge-maker](https://github.com/badges/shields/tree/master/badge-maker) offre des SVG standards sur l'infrastructure du site. [Endpoint Badge](https://shields.io/badges/endpoint-badge) exige un endpoint JSON que Shields vient lire et formater, avec son propre cache. Le choix local garde le contrôle du rendu et des URL, sans dépendance supplémentaire pour deux gabarits fixes. Une intégration Shields pourra être ajoutée si davantage de styles deviennent nécessaires.

Les réponses portent un ETag et acceptent HEAD et les requêtes conditionnelles. Le cache est de cinq minutes pour le rang, borné par son échéance de fraîcheur, et de 24 heures pour un Award actif. Aucun `stale-while-revalidate` ni cache HTTP immuable n'est appliqué. Un retrait peut donc devenir visible sans changer l'URL. Une panne répond 503 sans cache et avec un SVG neutre. Les proxys externes, dont GitHub Camo, peuvent conserver leur propre copie.

## Livraison

La migration additive `0009_badges_awards` est requise pour les Awards. Elle ne modifie ni les scores ni les migrations appliquées. Les détails d'exploitation et de vérification figurent dans [le guide](../site/badges-awards.md). Aucune migration distante, attribution réelle, publication, dépense, création de compte, commit ou push n'est effectuée pendant cette implémentation.

La finalisation du 14 octobre lève les blocages locaux de formatage et de lint. Les commandes d'exploitation refusent les options ambiguës avant toute lecture ou écriture de base. Les semaines malformées sont rejetées avant le contrôle du calendrier ISO. Le déploiement reste bloqué par l'accès Vercel refusé et l'absence de connexion Neon. Le classement public GitHub est ancien et Rising attend ses données ; aucun résultat réel n'est inventé pour contourner cette attente.

## Extension du périmètre, 14 octobre 2026

Lou demande de développer les six extensions et de conserver le code en local pendant sa vérification. L'issue [#63](https://github.com/Sandbox-podcast/sandbox-podcast-site/issues/63), créée à sa demande, explique les huit familles de badges avec des aperçus conceptuels identifiés comme exemples.

Décision : décidée par l'agent sur délégation (PD-0003). Les nouvelles règles restent des lectures des rangs officiels, sans score supplémentaire :

| Distinction         | Période et règle                                                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub #1 Category  | Premier projet de chaque catégorie présente dans l'édition GitHub du dimanche.                                                                       |
| Biggest Mover       | Plus forte progression positive entre deux dimanches consécutifs ; nouveaux entrants exclus. Égalité : meilleur rang final, puis identifiant stable. |
| Rookie of the Month | Plus de premières places Rising parmi tous les dimanches du mois civil.                                                                              |
| Skill of the Week   | Première skill du dimanche, méthode corroborée skills.sh et GitHub.                                                                                  |
| Best AI Model       | Premier modèle du dimanche, méthode corroborée Arena et Artificial Analysis.                                                                         |
| Awards annuels      | Un prix par classement, fondé sur le nombre de premières places parmi tous les dimanches de l'année ISO.                                             |

Pour les prix mensuels et annuels, l'historique doit être complet. Une égalité se départage au rang du dernier dimanche, puis à l'identifiant stable. Un candidat absent du dernier dimanche passe après les candidats présents ; sa dernière apparition fournit son rang source conservé. Une source impliquée dans un retrait est exclue des nouvelles attributions. Les anciennes attributions conservent leur preuve et ne sont pas recalculées.

La migration additive `0010_extended_awards` ne modifie pas `0009`. Elle conserve la colonne et l'unicité historiques Rising, ajoute les périodes mensuelles et annuelles et l'unicité `(award_type, period, scope)`. Les identifiants GitHub restent obligatoires pour GitHub et Rising, et facultatifs pour Skills et Models. Les nouveaux SVG et cartes de partage sont adressés par l'UUID de l'attribution. Les anciennes URL Rising continuent de fonctionner.

Le cron existant lance `badge_awards` après les gels. La reprise automatique lit au plus 54 semaines ; une reprise plus ancienne utilise une période explicite. Les fiches `/charts/entity/:slug` donnent aux Skills et modèles publiés leur propre générateur. L'historique commun propose des filtres et une pagination par curseur. Aucun nouveau service, compte, secret ou cron n'est créé.

La démonstration locale utilise une base PGlite éphémère sur loopback et des entités marquées `FIXTURE`. Ses exemples mensuels et annuels viennent de sources simulées réservées aux tests. Le code de production n'accepte aucun paramètre pour activer ces fixtures. La livraison et les migrations distantes attendent la vérification de Lou.
