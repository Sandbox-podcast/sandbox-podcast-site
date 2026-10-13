# Mise en service et reprise des classements v3

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

1. Préparer une base de test et une sauvegarde selon l'exploitation existante. Tester les migrations avec la version de code de la PR. La migration 0009 crée `github_star_observations`, `github_burst_events` et `github_trending_observations` avec leurs index et protections d'immuabilité. Elle ne modifie aucune mesure historique. L'application contrôlée en production revient au responsable.
2. Vérifier les comptes et droits d'usage des sources, les quotas API et l'absence de secrets côté navigateur. Les collecteurs réutilisent les validations Zod. OpenSSF n'exige pas de nouvelle clé. Trending lit un format HTML public, qui peut changer ; une erreur ne doit pas être traitée comme une liste vide réussie.
3. Lancer découverte et collectes sur la base de test, puis vérifier identités, licences et dates. Le nouveau filtre open source peut laisser des dépôts existants sans licence reconnue en attente de qualification. Les relevés GitHub rafraîchissent cette licence. Examiner les variantes de modèles non raccordées au lieu d'élargir automatiquement les alias.
4. Laisser se constituer les baselines. GitHub et Skills demandent environ sept jours, Rising environ quatorze. Le détecteur intrajournalier peut créer un signal dès qu'une fenêtre réelle est observée. Avec une exécution horaire et un pool couvrable en une exécution, la première fenêtre d'une heure est disponible au passage suivant. La rotation d'un pool plus large peut allonger ce délai.
5. Exécuter les simulations de gel. Lire les candidats incomplets susceptibles d'entrer, la couverture par source, les exclusions et les rangs de sensibilité. Un résultat `insufficient_history` ou une preuve bloquée interdit le gel. Ne pas réduire les seuils pour forcer un premier Top.
6. Calibrer les profils sur un historique réel et faire relire les pondérations. La grille initiale ne mesure pas encore une fiabilité empirique. Pour ajouter une source, valider son identité et son protocole, implémenter l'adaptateur, analyser les données communes avec les autres évaluateurs, changer la version et reprendre les tests.
7. Choisir la cadence et le budget. La configuration Vercel active conserve ses quatre jobs quotidiens. `vercel.bursts.example.json` propose les deux jobs supplémentaires, dont un horaire. Vérifier que le forfait autorise cette cadence ; ne pas installer ce fichier à l'aveugle. Un ordonnanceur externe peut appeler les mêmes routes authentifiées. Le collecteur est désactivé tant que son drapeau vaut `false`.
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

L'API des preuves est `/api/charts/<github|rising|skills|models>/<date|semaine|current>/proof`. Seules les éditions publiées sont accessibles ; un brouillon ou une archive sans preuve v3 renvoie 404. L'API `/api/charts/bursts` renvoie `disabled`, `pending` ou `ready`. Elle ne renvoie que des projets publics suivis encore admissibles, sur les vingt-quatre dernières heures.

## Exploitation et limites

Les relevés d'étoiles et les signaux sont append-only. Fixer un budget de stockage et un plan d'archivage avant d'augmenter fréquence et pool. Aucune suppression automatique n'est livrée. Un jeton rate-limited, une identité changée, une page Trending différente ou une base non migrée doit produire une erreur visible dans les journaux de jobs. Les relances n'ajoutent pas deux fois une même observation au même instant.

La liste conservatrice des licences est dans `reference-adapters.ts`. Elle ne couvre pas toutes les licences reconnues par l'OSI. Une revue peut l'étendre en versionnant la méthode ; une licence inconnue n'est pas déclarée propriétaire ou dangereuse pour autant.

Les observations Trending conservent les présences collectées. La version livrée ne calcule pas de statistique affirmant précéder GitHub : cette mesure demande un protocole d'échantillonnage, un historique et une comparaison des premières détections. Les quotas réels, délais de détection, coûts et biais de couverture n'ont pas encore été mesurés en production.

Un même identifiant Arena ou Artificial Analysis rattaché à plusieurs modèles actifs met ces entités en attente et peut bloquer Models. Le responsable doit relire les raccordements et retirer du pool actif les alias obsolètes. Les éditions publiées et leurs identités figées restent intactes.
