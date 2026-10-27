# Mise en service et reprise des classements v3

## Contrôle de stabilisation du 19 octobre

Le pilote vérifie maintenant GitHub, Rising, Skills et Models. Après le gel GitHub, il contrôle aussi Rising sans refaire la collecte. La commande publique, sans secret, est `node apps/site/scripts/charts-refresh.ts --check` depuis la racine. Elle sort avec le code 1 lorsqu'une des quatre éditions est absente ou ancienne. Les réponses `current` sont `no-store` ; les archives gardent leur cache.

Rising demande vingt projets admissibles, deux fenêtres réelles de sept jours et une accélération positive. Un compteur de nouveautés n'est pas une édition. L'interface explicite cette attente. Les seuils ne doivent pas être réduits pour masquer un historique insuffisant. Son repli vers une édition observée est décidé indépendamment du profil GitHub. Voir [l'audit](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/audit-stabilisation-2026-10-19.md) et [DD-0063](../design-decisions/dd-0063-stabilisation-des-classements-news-et-time-machine.md).

**Incident du 15 octobre :** lire le [constat et la procédure de reprise](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/incident-classements-2026-10-15.md) et l'[ADR-0030](../adr/ADR-0030-reprise-et-controle-des-classements.md). Le nouveau pilote sépare les trois collecteurs, reprend les lots incomplets et contrôle les éditions publiques. L'origine de production a une valeur par défaut ; le secret reste obligatoire. Le contrôle horaire de fraîcheur est actif indépendamment des poussées, qui demandent `SANDBOX_CHARTS_BURSTS_ENABLED=true` dans GitHub Actions.

Lire [le README](../../README.md), [la conception](reference-ranking-design.md) et [le prompt de reprise](prompt-classements-reference.md). Les développements sont livrés pour revue. Aucun accès réel, migration de production ou profil public n'est activé par ce travail.

## Paramètres à fournir

| Paramètre                           | Usage                                                       | Valeur livrée                                      |
| ----------------------------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| `DATABASE_URL` ou `POSTGRES_URL`    | Postgres / Neon et migrations existantes                    | À fournir côté serveur                             |
| `GITHUB_TOKEN`                      | Découverte, compteurs quotidiens et GraphQL intrajournalier | À fournir côté serveur, lecture des dépôts publics |
| `CRON_SECRET`                       | Authentification des routes cron                            | Secret existant, 16 caractères au minimum          |
| OIDC Vercel et `VERCEL_OIDC_TOKEN`  | Accès Skills.sh                                             | Configuration existante à vérifier                 |
| `OPENROUTER_API_KEY`                | Artificial Analysis, portée, prix et débit                  | À fournir côté serveur                             |
| `HUGGINGFACE_TOKEN` ou `HF_TOKEN`   | Quotas Hugging Face                                         | Facultatif selon les quotas                        |
| `CHARTS_REVIEWED_PROFILE_VERSIONS`  | Versions autorisées à publier après revue                   | Vide, donc gels v3 en brouillon                    |
| `CHARTS_BURST_COLLECTION_ENABLED`   | Collecte et exposition des poussées                         | `false`                                            |
| `GITHUB_BURST_POOL_SIZE`            | Nombre maximal de dépôts par exécution                      | 200, plage admise 20 à 1000                        |
| `GITHUB_BURST_POLICY_JSON`          | Seuils et fenêtres du détecteur                             | Vide, donc politique initiale `github-bursts-v1`   |
| `GITHUB_TRENDING_DISCOVERY_ENABLED` | Découverte depuis la page publique Trending                 | `false`                                            |

Les versions initiales sont `github-reference-v3`, `rising-reference-v3`, `skills-reference-v3` et `models-reference-v3`. Une liste séparée par des virgules active uniquement les profils cités, sans joker. Ne la renseigner qu'après contrôle des données, des droits et des poids. Le statut expérimental du profil reste visible tant que la méthode n'a pas fait l'objet d'une nouvelle version relue dans le dépôt.

## Ordre de mise en service

1. Préparer une base de test et une sauvegarde selon l'exploitation existante. Tester les migrations avec la version de code de la PR. La migration 0009 crée les observations Trending et de poussée. La migration 0010 ajoute le créneau UTC aux relevés GitHub et externes, conserve les anciennes lignes sous une clé `legacy` et autorise deux éditions datées par jour. L'application sur la base de production revient au responsable.
2. Vérifier les comptes et droits d'usage des sources, les quotas API et l'absence de secrets côté navigateur. Les collecteurs réutilisent les validations Zod. OpenSSF n'exige pas de nouvelle clé. Trending lit un format HTML public, qui peut changer ; une erreur ne doit pas être traitée comme une liste vide réussie.
3. Lancer découverte et collectes sur la base de test, puis vérifier identités, licences et dates. Le nouveau filtre open source peut laisser des dépôts existants sans licence reconnue en attente de qualification. Les relevés GitHub rafraîchissent cette licence. Examiner les variantes de modèles non raccordées au lieu d'élargir automatiquement les alias.
4. Laisser se constituer les baselines. GitHub et Skills demandent environ sept jours, Rising environ quatorze. Le détecteur intrajournalier peut créer un signal dès qu'une fenêtre réelle est observée. Avec une exécution horaire et un pool couvrable en une exécution, la première fenêtre d'une heure est disponible au passage suivant. La rotation d'un pool plus large peut allonger ce délai.
5. Exécuter les simulations de gel. Lire les candidats incomplets susceptibles d'entrer, la couverture par source, les exclusions et les rangs de sensibilité. Un résultat `insufficient_history` ou une preuve bloquée interdit le gel du profil v3. Ne pas réduire les seuils pour forcer ce Top corroboré. Si la mesure principale couvre au moins vingt candidats, une édition observée distincte peut être publiée : voir [ADR-0035](../adr/ADR-0035-edition-observee-quand-la-corroboration-manque.md).
6. Calibrer les profils sur un historique réel et faire relire les pondérations. La grille initiale ne mesure pas encore une fiabilité empirique. Pour ajouter une source, valider son identité et son protocole, implémenter l'adaptateur, analyser les données communes avec les autres évaluateurs, changer la version et reprendre les tests.
7. Configurer le planificateur GitHub Actions après la revue. Le plan Hobby de Vercel limite Cron à une exécution par jour, donc ne peut pas porter les rafraîchissements toutes les 12 heures et la collecte horaire. GitHub Actions est choisi pour éviter d'ajouter cette dépendance à un plan Vercel payant. Voir les [limites Vercel](https://vercel.com/docs/cron-jobs/usage-and-pricing) et les [limites des horaires GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule). Le workflow `charts-refresh.yml` collecte Trending et découvre des candidats chaque jour à 01:17 UTC, collecte les sources et fige les classements à 03:17 et 15:17 UTC, puis interroge les poussées chaque heure à la minute 23. Ajouter la variable `SANDBOX_CHARTS_ORIGIN` avec l'origine HTTPS du site et le secret `SANDBOX_CHARTS_CRON_SECRET`, de même valeur que `CRON_SECRET` sur Vercel. Vérifier aussi l'OIDC Vercel utilisé par Skills.sh. Les workflows planifiés ne s'exécutent que sur la branche par défaut. GitHub peut retarder ou omettre un déclenchement ; si cette variabilité ne convient pas au service, remplacer ce planificateur par un service avec le niveau de disponibilité requis. Aucun coût n'est engagé par cette décision.
8. Après validation, renseigner les versions autorisées et activer les collecteurs choisis. Une édition déjà figée en brouillon peut être publiée via l'administration, sous réserve de permissions, de version autorisée et de preuve intacte. Le gel suivant conserve une nouvelle édition. Le déploiement et l'activation de production demandent les autorisations habituelles.

## Commandes

Depuis la racine du dépôt :

```bash
pnpm --filter @podcast/site charts:discover
pnpm --filter @podcast/site charts:collect
pnpm --filter @podcast/site charts:external-collect
pnpm --filter @podcast/site charts:weekly --dry-run --date=2026-10-13
pnpm --filter @podcast/site charts:external-weekly --dry-run --date=2026-10-13
pnpm --filter @podcast/site charts:bursts
pnpm --filter @podcast/site charts:trending
pnpm --filter @podcast/site charts:reference audit --file=entrees.json --output=preuve.json
pnpm --filter @podcast/site charts:reference replay --file=preuve.json
```

Les dates sont des exemples à remplacer par les dates réellement collectées. La CLI `charts:reference` fonctionne hors base. `audit` attend le contrat `ReferenceInput` : profil complet, date, liste des candidats et observations normalisées. `replay` attend la preuve téléchargée. Le code de sortie vaut 0 pour un rapport calculable et publiable, 2 pour un rapport bloqué, 1 pour une entrée invalide ou une preuve altérée. Le fichier de sortie ne peut pas écraser un fichier existant.

L'API des preuves est `/api/charts/<github|rising|skills|models>/<édition|current>/proof`. Une édition peut porter un identifiant quotidien historique, une semaine ISO historique ou un créneau UTC, par exemple `2026-10-13T12:00Z`. Seules les éditions publiées sont accessibles ; un brouillon ou une archive sans preuve v3 renvoie 404. L'API `/api/charts/bursts` renvoie `disabled`, `pending` ou `ready`. Elle ne renvoie que des projets publics suivis encore admissibles, sur les vingt-quatre dernières heures.

## Exploitation et limites

Les relevés et les signaux sont append-only. Deux collectes et éditions quotidiennes doublent le volume de mesures par rapport au rythme précédent. Fixer un budget de stockage et un plan d'archivage avant d'augmenter la taille du pool. Aucune suppression automatique n'est livrée. Un jeton rate-limited, une identité changée, une page Trending différente ou une base non migrée doit produire une erreur visible dans les journaux de jobs. Les relances n'ajoutent pas deux fois une mesure au même créneau.

Un rejeu du créneau GitHub du matin exclut aussi les rapports OpenSSF collectés après 12 h UTC, y compris les relevés historiques marqués `legacy`. L'API publique restitue les références GitHub et OpenSSF avec leur date conservée lorsqu'une observation existe ; elle n'ajoute aucune preuve OpenSSF à une édition observée qui en est dépourvue.

La liste conservatrice des licences est dans `reference-adapters.ts`. Elle ne couvre pas toutes les licences reconnues par l'OSI. Une revue peut l'étendre en versionnant la méthode ; une licence inconnue n'est pas déclarée propriétaire ou dangereuse pour autant.

Les observations Trending conservent les présences collectées. La version livrée ne calcule pas de statistique affirmant précéder GitHub : cette mesure demande un protocole d'échantillonnage, un historique et une comparaison des premières détections. GitHub Actions vise les heures indiquées, sans garantie de démarrage exact ni de rejeu après un déclenchement omis. Les quotas réels, délais de détection, coûts et biais de couverture n'ont pas encore été mesurés en production.

Un même identifiant Arena ou Artificial Analysis rattaché à plusieurs modèles actifs met ces entités en attente et peut bloquer Models. Le responsable doit relire les raccordements et retirer du pool actif les alias obsolètes. Les éditions publiées et leurs identités figées restent intactes.

La collecte met désormais les seuls candidats contradictoires en attente et conserve les mesures des autres modèles. Le journal détaille les références et les fiches concernées. L'exclusion manuelle d'une fiche ne résout pas une référence partagée : la résolution consulte aussi les fiches exclues. Voir [ADR-0036](../adr/ADR-0036-isolement-des-identites-models-en-conflit.md).

Pour préparer la revue canonique en lecture seule, utiliser `pnpm --filter @podcast/site charts:identities --output=diagnostic-models.json` avec une connexion Postgres autorisée. La commande retourne les sources exactes, les statuts actifs/exclus, les dates et volumes de relevés, ainsi que le nombre de positions déjà publiées de chaque fiche. Le code de sortie vaut 2 si des conflits restent présents, 1 en cas d'erreur et 0 si aucun doublon n'est détecté. Un fichier existant n'est jamais écrasé. Le rapport propose une fiche seulement lorsque toutes les sources concordent et qu'une seule possède un historique public ; une proposition reste à valider.

Un export brut de la requête `modelIdentityAuditQuery` peut aussi être relu hors base avec `pnpm --filter @podcast/site charts:identities --file=export-models.json --output=diagnostic-models.json`. Aucune connexion n'est nécessaire dans ce mode. Après revue, préparer une correspondance explicite par fournisseur et identifiant externe, préserver les anciennes éditions et les mesures, puis valider la réparation sur une copie de base. Le diagnostic n'applique aucune fusion ni désactivation.

Un dépôt que GitHub ne résout plus sous son nom enregistré sort du suivi automatique au passage suivant, sauf statut manuel. L'échec d'Arena ou de Hugging Face n'efface pas le catalogue encore reçu des autres sources Models. Voir [ADR-0034](../adr/ADR-0034-collectes-partielles-github-et-models.md).

Quand OpenSSF couvre moins de vingt dépôts, le gel publie la progression GitHub réellement mesurée sous `github-momentum-observed` ou `rising-momentum-observed`. Skills publie `skills-installs-observed` : le score suit les installations gagnées sur sept jours, et les étoiles du dépôt restent un contexte. Ces éditions n'utilisent pas les poids v3 et ne demandent pas `CHARTS_REVIEWED_PROFILE_VERSIONS`. Les absences restent des absences. Voir [ADR-0035](../adr/ADR-0035-edition-observee-quand-la-corroboration-manque.md).
