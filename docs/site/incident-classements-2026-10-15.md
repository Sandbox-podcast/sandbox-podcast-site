# Classements : incident du 15 octobre 2026

## État vérifié

L'investigation part de `origin/main` au commit `e29f09cd21656fb7fbf2f929c30f1a26b32e8bf4`, dans un worktree séparé pour préserver les travaux locaux.

| Contrôle       | Résultat                                                                               |
| -------------- | -------------------------------------------------------------------------------------- |
| GitHub public  | Édition du 10 octobre, ancien score `github-momentum-v1+stars`                         |
| Skills public  | Édition du 10 octobre, ancien score `skills-installs-v1`                               |
| Models public  | Édition du 12 octobre, ancien score `models-cross-source-v1`                           |
| Rising         | Pas d'édition publique                                                                 |
| GitHub Actions | Origine et secret absents ; échecs avant appel des collecteurs                         |
| Vercel         | `vercel.json` sans cron ; CLI et connecteur sur un compte différent de celui du projet |

Depuis l'administration connectée par Lou, une collecte GitHub du 15 octobre a enregistré 616 relevés sur 620 traitements ; quatre dépôts ont échoué. Le tableau affiche 1 210 dépôts suivis et 10 963 candidats. La collecte externe a enregistré 1 134 skills et 1 017 entités Models ; le catalogue OpenRouter a échoué.

La simulation externe suivant ces collectes annonce 34 identités Models contradictoires, 1 225 skills hors pool éligible, zéro skill et six modèles disposant des preuves requises. Elle n'écrit aucune édition. Ces résultats ne justifient pas de publier un Top 20.

La réparation OpenRouter a été vérifiée sur son API publique avec le client corrigé : 576 modèles validés, dont 84 sans contexte textuel applicable. Les résultats dépendent du catalogue au moment de l'appel.

## Corrections préparées

Voir [ADR-0030](../adr/ADR-0030-reprise-et-controle-des-classements.md). Les changements couvrent le workflow, le pilote de reprise, les routes cron isolées, la priorité aux dépôts suivis, la lecture des collectes historiques, OpenRouter, l'invalidation des pages et l'affichage d'un retard. Aucun changement de migration ou suppression de données.

Tests de régression : collecte suivie prioritaire malgré un grand nombre de candidats, reprise bornée après panne, indépendance des sources, refus d'un faux succès avec édition ancienne, authentification de chaque nouvelle route, gel isolé, invalidation des pages, collecte historique non masquée et catalogue comprenant des modèles non textuels.

## Mise en service à terminer

1. Déployer ces corrections avec l'accord du propriétaire pour le commit, le push et la publication. Ne pas modifier les travaux de l'autre checkout.
2. Dans `Sandbox-podcast/sandbox-podcast-site`, configurer le secret Actions `SANDBOX_CHARTS_CRON_SECRET` avec la valeur existante de `CRON_SECRET` du projet Vercel `sandboxpodcastpro-5518/sandbox-podcast`. Ne pas l'écrire dans Git ou dans le chat. `SANDBOX_CHARTS_ORIGIN` est désormais facultatif ; sa valeur éventuelle est `https://www.sandboxpodcast.fr`.
3. Déclencher manuellement `SANDBOX CHARTS refresh`. Examiner les trois lignes du résumé et les journaux administrateur. Une collecte enregistrée ne suffit pas : les trois éditions publiques doivent correspondre au créneau attendu.
4. Corriger les rapprochements Models à partir des identités exactes des fournisseurs ; conserver séparés les modèles ambigus. Vérifier les baselines GitHub et Skills et les preuves OpenSSF. Ne pas utiliser les compteurs actuels comme observations des jours passés.
5. Faire la revue des profils conformément à [la procédure v3](reference-ranking-operations.md), puis autoriser uniquement les versions effectivement relues. Aucun profil n'a été activé pendant cette intervention.
6. Vérifier les deux prochaines exécutions programmées et le contrôle horaire. Confirmer les notifications d'échec dans les réglages GitHub du responsable.

Contrôle public sans secret, depuis la racine :

```bash
node apps/site/scripts/charts-refresh.ts --check
```

Le 15 octobre, ce contrôle échoue correctement et identifie les trois éditions en retard. Tant que ce contrôle échoue, la remise en service n'est pas validée.

## Historique manquant

L'administration ne permet pas d'inventer des observations pour les jours omis. Un rejeu est admissible uniquement pour les créneaux disposant de relevés conservés et des preuves exigées. Le correctif de recherche historique rend ce rejeu possible sans qu'un job plus récent masque l'ancien ; il ne garantit pas que tous les jours du 10 au 15 soient calculables. Les éditions déjà publiées restent intactes.
