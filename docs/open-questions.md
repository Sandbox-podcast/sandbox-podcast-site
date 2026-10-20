# Questions ouvertes du site média

Actualisation du 20 octobre : la file News fonctionne en production et les derniers passages planifiés ont généré de nouvelles fiches. L'[audit de stabilisation du 19 octobre](site/audit-stabilisation-2026-10-19.md) consigne la sauvegarde et l'application des migrations 0017/0018. L'[audit du 20 octobre](site/audit-automatisation-2026-10-20.md) confirme des déclenchements irréguliers, un arriéré News et des éditions GitHub, Skills et Models restées au créneau du 19 octobre à midi. Rising attend toujours son historique admissible. Les dates visibles, protections News et la reprise horaire des classements sont corrigées localement ; leur livraison et la preuve de passages planifiés consécutifs restent à faire. Voir [fonctionnement et horaires](site/automatisation-news-charts-2026-10-20.md).

État du 16 octobre 2026 après mise en service. Le suivi unique est l'[issue #68](https://github.com/Sandbox-podcast/sandbox-podcast-site/issues/68), avec les preuves dans le [rapport de corrections](site/issue-68-2026-10-16.md) et le [compte rendu de mise en service](site/issue-68-mise-en-service-2026-10-16.md). Les anciennes issues ont été regroupées puis supprimées à la demande de Lou.

Ce document concerne `apps/site`. Les questions de la plateforme vidéo sont archivées dans [old/](../old/README.md) et ne conditionnent pas le site média.

## Classements et Awards

- Le secret cron est configuré et l'authentification GitHub Actions vers Vercel fonctionne, comme le montre le [rafraîchissement du 16 octobre à 14:40 UTC](https://github.com/Sandbox-podcast/sandbox-podcast-site/actions/runs/38917678851). Les collectes restent partielles ou échouent ; les éditions publiques sont anciennes. Confirmer les accès, quotas et conditions des sources et l'isolation effective Preview/Production.
- Le rapport du 19 octobre consigne les migrations jusqu'à `0018` en production après sauvegarde et accord. Confirmer les schémas des autres environnements avant leur prochain déploiement, résoudre les collectes encore partielles et constituer l'historique GitHub requis. Le [compte rendu initial](site/issue-68-mise-en-service-2026-10-16.md) décrit l'état antérieur au complément News.
- Résoudre les identités Models contradictoires et constituer les baselines réelles. Calibrer et relire les versions exactes des profils avant leur autorisation de publication. Aucun relevé absent ne doit être inventé.
- Mesurer la détection précoce avant de revendiquer une avance sur Trending. Fixer budget, rétention et quotas avant d'élargir le pool.
- Vérifier les premières attributions réelles, leur preuve et leur rendu GitHub Camo. Une période ou une preuve insuffisante ne donne aucun Award.

Procédures : [reprise des classements](site/incident-classements-2026-10-15.md), [exploitation v3](site/reference-ranking-operations.md) et [Badges & Awards](site/badges-awards.md).

## Mesure et contenu

- Suite SEO locale du 18 octobre : chargement responsive du vidéoclub, images allégées et traductions des fiches projet corrigés ; [preuves et tests](site/seo-2026-10-18/correctifs-locaux.md). Une reprise de connexion IONOS a refusé le code transmis. La validation DNS attend une session ouverte par le gestionnaire du domaine ou un nouveau code valide ; aucun DNS n'a été modifié.

- Au 18 octobre, les demandes de validation Search Console sont préparées sur le compte Sandbox. La validation DNS attend le code de connexion IONOS demandé à Lou. Le sitemap public et ses 301 URL passent le contrôle HTTP, robots et canoniques ; réception du sitemap par Google, indexation effective et requêtes restent à vérifier après validation. Speed Insights Mobile et CrUX ne fournissent pas de données réelles ; le test Lighthouse mobile mesure un LCP de 3,8 s. Voir [l'audit et les preuves](site/seo-2026-10-18/audit.md).

- GA4 est activé en production après accord et recette : mesure améliorée désactivée, conservation des événements réglée à 14 mois, cinq événements du plan initial reçus dans Temps réel. La recherche reçue ne contient pas son terme et le tag reste absent après refus ou retrait puis rechargement.
- Rapprocher les clics YouTube des vues dans Studio et recueillir les mesures mobiles réelles dans Speed Insights. La recette n'est pas un résultat de performance ni une mesure d'audience représentative.
- Les compléments ES/DE et leur indexation sont déployés ; robots, canoniques et sitemap publics sont vérifiés le 17 octobre. Les trois événements de découverte sont reçus dans GA4. Les mesures mobiles et l'attribution YouTube restent à vérifier : [suivi du 17 octobre](site/suivi-issue-68-2026-10-17.md).

Lou retient l'email du footer pour les signalements. La publication de la procédure proposée est abandonnée.

Voir [plan de mesure](site/google-analytics.md), [intégration locale](site/audit-integration-2026-10-15.md) et [traductions](site/traductions-locales.md).

## YouTube

Lou a demandé le 18 octobre de lancer le suivi manuellement à l'ajout de l'épisode hebdomadaire. Le cron de 30 minutes est retiré en local ; son arrêt distant attend la publication autorisée du workflow. Voir [ADR-0033](adr/ADR-0033-optimisation-des-taches-planifiees.md).

Les quatre versions initiales de Shorts sont privées. Les quatre révisions locales passent le décodage complet et attendent leur validation d'écoute et un accord de publication. E1 est annulé ; seul E2 reste à suivre après diffusion autorisée. Le journal Postgres durable est implémenté et testé. Il reste à autoriser sa mise en service, réconcilier les opérations passées et connecter OAuth avant toute publication automatique. Le cache GitHub Actions n'est pas ce journal.

Voir [protocole E2](site/experiences-e1-e2-2026-10-14.md), [rapport YouTube](site/youtube-growth-2026-10-14.md) et [agent](../tools/youtube-growth/README.md).

## Limites d'exploitation

Le dernier passage News consulté, le 20 octobre à 04 h Paris, annonce 105 sources, 78 entièrement lisibles, quinze candidats traités et six fiches publiées, dont trois résumés nouvellement générés. Il conserve un arriéré. À 09 h 53 Paris, le fil reste lisible mais sa collecte de 04 h 03 dépasse le seuil de trois heures. Les deux derniers événements planifiés sont espacés d'environ trois heures malgré un cron horaire. Les preuves et limites des sources figurent dans l'[audit du 20 octobre](site/audit-automatisation-2026-10-20.md). Suivre les rejets, l'arriéré et les prochains événements réellement planifiés après livraison des correctifs. Une cadence garantie demanderait un planificateur et des accès autorisés par Lou ; aucune offre supplémentaire n'a été souscrite.

Le limiteur Postgres partagé et le nonce CSP par requête sont déployés, après application de la migration 0015. Les contrôles HTTP sur le domaine public passent et les tentatives invalides sont persistées dans la base principale. La CSP publique conserve les scripts inline du rendu statique/ISR ; cette limite et les protections compensatoires sont documentées dans [ADR-0032](adr/ADR-0032-protections-et-persistance-issue-68.md).

Les décisions de conception sont déléguées selon PD-0003. Les dépenses, comptes, engagements juridiques, suppressions de données réelles, réglages système, commits, pushes et publications nécessitent l'accord du propriétaire, selon [AGENTS.md](../AGENTS.md).
