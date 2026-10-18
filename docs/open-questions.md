# Questions ouvertes du site média

État du 16 octobre 2026 après mise en service. Le suivi unique est l'[issue #68](https://github.com/Sandbox-podcast/sandbox-podcast-site/issues/68), avec les preuves dans le [rapport de corrections](site/issue-68-2026-10-16.md) et le [compte rendu de mise en service](site/issue-68-mise-en-service-2026-10-16.md). Les anciennes issues ont été regroupées puis supprimées à la demande de Lou.

Ce document concerne `apps/site`. Les questions de la plateforme vidéo sont archivées dans [old/](../old/README.md) et ne conditionnent pas le site média.

## Classements et Awards

- Le secret cron est configuré et l'authentification GitHub Actions vers Vercel fonctionne, comme le montre le [rafraîchissement du 16 octobre à 14:40 UTC](https://github.com/Sandbox-podcast/sandbox-podcast-site/actions/runs/38917678851). Les collectes restent partielles ou échouent ; les éditions publiques sont anciennes. Confirmer les accès, quotas et conditions des sources et l'isolation effective Preview/Production.
- Sauvegardes réalisées et migrations appliquées après accord : les branches principale et Preview contiennent maintenant `0000` à `0015`. Résoudre les erreurs de collecte Skills/Models et constituer l'historique GitHub requis. Le [compte rendu de mise en service](site/issue-68-mise-en-service-2026-10-16.md) distingue le secret opérationnel des blocages de publication.
- Résoudre les identités Models contradictoires et constituer les baselines réelles. Calibrer et relire les versions exactes des profils avant leur autorisation de publication. Aucun relevé absent ne doit être inventé.
- Mesurer la détection précoce avant de revendiquer une avance sur Trending. Fixer budget, rétention et quotas avant d'élargir le pool.
- Vérifier les premières attributions réelles, leur preuve et leur rendu GitHub Camo. Une période ou une preuve insuffisante ne donne aucun Award.

Procédures : [reprise des classements](site/incident-classements-2026-10-15.md), [exploitation v3](site/reference-ranking-operations.md) et [Badges & Awards](site/badges-awards.md).

## Mesure et contenu

- GA4 est activé en production après accord et recette : mesure améliorée désactivée, conservation des événements réglée à 14 mois, cinq événements du plan initial reçus dans Temps réel. La recherche reçue ne contient pas son terme et le tag reste absent après refus ou retrait puis rechargement.
- Rapprocher les clics YouTube des vues dans Studio et recueillir les mesures mobiles réelles dans Speed Insights. La recette n'est pas un résultat de performance ni une mesure d'audience représentative.
- Les compléments ES/DE et leur indexation sont déployés ; robots, canoniques et sitemap publics sont vérifiés le 17 octobre. Les trois événements de découverte sont reçus dans GA4. Les mesures mobiles et l'attribution YouTube restent à vérifier : [suivi du 17 octobre](site/suivi-issue-68-2026-10-17.md).

Lou retient l'email du footer pour les signalements. La publication de la procédure proposée est abandonnée.

Voir [plan de mesure](site/google-analytics.md), [intégration locale](site/audit-integration-2026-10-15.md) et [traductions](site/traductions-locales.md).

## YouTube

Les quatre versions initiales de Shorts sont privées. Les quatre révisions locales passent le décodage complet et attendent leur validation d'écoute et un accord de publication. E1 est annulé ; seul E2 reste à suivre après diffusion autorisée. Le journal Postgres durable est implémenté et testé. Il reste à autoriser sa mise en service, réconcilier les opérations passées et connecter OAuth avant toute publication automatique. Le cache GitHub Actions n'est pas ce journal.

Voir [protocole E2](site/experiences-e1-e2-2026-10-14.md), [rapport YouTube](site/youtube-growth-2026-10-14.md) et [agent](../tools/youtube-growth/README.md).

## Limites d'exploitation

Le limiteur Postgres partagé et le nonce CSP par requête sont déployés, après application de la migration 0015. Les contrôles HTTP sur le domaine public passent et les tentatives invalides sont persistées dans la base principale. La CSP publique conserve les scripts inline du rendu statique/ISR ; cette limite et les protections compensatoires sont documentées dans [ADR-0032](adr/ADR-0032-protections-et-persistance-issue-68.md).

Les décisions de conception sont déléguées selon PD-0003. Les dépenses, comptes, engagements juridiques, suppressions de données réelles, réglages système, commits, pushes et publications nécessitent l'accord du propriétaire, selon [AGENTS.md](../AGENTS.md).
