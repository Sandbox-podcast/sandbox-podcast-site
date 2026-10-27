# Remise en service des classements : intervention du tech lead

Demande de Lou du 15 octobre 2026 : les opérations GitHub et Vercel doivent être prises en charge par le tech lead. Lou n'a accès ni au dépôt ni au projet Vercel. La PR de suivi reste ouverte pour revue ; sa fusion ne configure aucun secret et ne valide pas la remise en service.

## État de départ

Le correctif [PR #65](https://github.com/Sandbox-podcast/sandbox-podcast-site/pull/65) est déjà fusionné et déployé, au commit `1599f99d947a26d6c0acbe7c6e457867af5fdd32`. Sa CI, son build et ses tests ont passé. Le [rapport d'incident](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/incident-classements-2026-10-15.md) contient les causes et les résultats des collectes réelles.

Le test manuel [38715345103](https://github.com/Sandbox-podcast/sandbox-podcast-site/actions/runs/38715345103) échoue car `SANDBOX_CHARTS_CRON_SECRET` est absent. Les API publiques vérifiées le 15 octobre servent toujours GitHub et Skills du 10 octobre, Models du 12. Les collectes réparées ont repris ; les nouvelles éditions ne sont pas encore publiables.

## Actions à réaliser avec les accès d'exploitation

1. Ouvrir les [variables du projet Vercel](https://vercel.com/sandboxpodcastpro-5518/sandbox-podcast/settings/environment-variables) et vérifier la valeur existante de `CRON_SECRET` dans l'environnement Production. Copier cette valeur dans le secret de dépôt `SANDBOX_CHARTS_CRON_SECRET`, depuis les [secrets GitHub Actions](https://github.com/Sandbox-podcast/sandbox-podcast-site/settings/secrets/actions). Le workflow lit un secret de dépôt, sans environnement GitHub nommé. Ne pas mettre sa valeur dans un commentaire, une capture ou un fichier versionné. Si le secret serveur est absent, sa création et son déploiement relèvent du tech lead.
2. Vérifier la disponibilité du workflow [SANDBOX CHARTS refresh](https://github.com/Sandbox-podcast/sandbox-podcast-site/actions/workflows/charts-refresh.yml) sur `main`. L'origine par défaut est `https://www.sandboxpodcast.fr` ; `SANDBOX_CHARTS_ORIGIN` est facultatif. Les deux collectes sont programmées à 03:17 et 15:17 UTC. Le contrôle public horaire fonctionne sans secret. Les poussées horaires facultatives n'ont pas besoin d'être activées pour rétablir les classements.
3. Lancer le workflow manuellement, puis lire les trois résultats GitHub, Skills et Models et les journaux de l'administration. Un HTTP 401 indique un problème d'authentification. Un résultat partiel, un historique insuffisant ou un brouillon peut faire échouer le contrôle même si les relevés ont été enregistrés. Traiter la cause indiquée ; ne pas masquer l'échec.
4. Contrôler les relevés conservés, les licences, les références à J-7 pour GitHub et Skills, à J-14 pour Rising, et les preuves OpenSSF. La dernière simulation GitHub du 15 octobre donne zéro candidat éligible. Continuer les collectes réelles et déterminer les premières dates calculables à partir de la base. Ne pas promettre une date de reprise à partir du seul nombre de jours écoulés.
5. Examiner les 36 identités Models contradictoires signalées par la dernière simulation externe. Vérifier les identifiants exacts des fournisseurs et les versions des modèles avant de corriger un raccordement. Garder les identités ambiguës séparées et préserver les éditions publiées. La simulation donne zéro skill et six modèles admissibles pour un Top 20. L'activation du secret ne corrige pas ces données.
6. Revoir les profils et leurs preuves selon [la procédure v3](reference-ranking-operations.md). Renseigner `CHARTS_REVIEWED_PROFILE_VERSIONS` seulement pour les versions effectivement validées, puis déployer la configuration Vercel. Ne pas autoriser tous les profils par défaut ni abaisser les seuils pour produire un classement.
7. Rejouer uniquement les créneaux historiques disposant de mesures et de preuves suffisantes. Documenter les jours irrécupérables entre le 10 et le 15 octobre. Les compteurs actuels ne remplacent pas les observations manquantes.

Depuis un checkout installé du dépôt :

```bash
# Déclenchement par un mainteneur autorisé
gh workflow run charts-refresh.yml --repo Sandbox-podcast/sandbox-podcast-site --ref main

# Contrôle public sans secret
node apps/site/scripts/charts-refresh.ts --check
```

## Critères de clôture à renseigner dans la PR

- [ ] Secret configuré dans le bon dépôt et appels cron authentifiés, sans divulguer sa valeur.
- [ ] Rapports des simulations examinés ; profils autorisés seulement après revue ; blocages de données résolus ou explicitement documentés.
- [ ] Une édition publique réelle du créneau attendu existe pour GitHub, Skills et Models ; le contrôle public termine avec un code de sortie 0.
- [ ] Deux exécutions programmées successives publient les éditions attendues, sans intervention manuelle. Joindre leurs liens et les identifiants d'édition.
- [ ] Contrôle horaire et notifications d'échec vérifiés par le responsable d'exploitation. Le contrôle utilise GitHub Actions, comme les collectes ; il ne couvre pas une panne générale de ce fournisseur.
- [ ] Historique récupérable rejoué et lacunes restantes documentées. Aucun relevé ni mouvement de classement inventé.

Tant que la publication reste bloquée, conserver la prise en charge de l'incident et son état visible. Une CI verte sur la PR ou une collecte réussie ne suffit pas à clôturer la panne.
