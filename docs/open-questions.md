# Questions ouvertes du site média

État du 16 octobre 2026. Le suivi unique est l'[issue #68](https://github.com/Sandbox-podcast/sandbox-podcast-site/issues/68), avec les preuves dans [le rapport local](site/issue-68-2026-10-16.md). Les anciennes issues ont été regroupées puis supprimées à la demande de Lou.

Ce document concerne `apps/site`. Les questions de la plateforme vidéo sont archivées dans [old/](../old/README.md) et ne conditionnent pas le site média.

## Classements et Awards

- Configurer le secret GitHub Actions depuis le `CRON_SECRET` sensible existant dans Vercel, puis confirmer les accès, quotas et conditions des sources et l'isolation effective Preview/Production. Le contrôle du 16 octobre constate encore des éditions anciennes pour GitHub, Skills et Models.
- Autoriser la sauvegarde et l'application des migrations manquantes : `0012` à `0014` pour les Awards et `0015` pour la protection partagée des connexions. Le journal Neon principal vérifié contient déjà `0000` à `0011`, empreintes comprises.
- Résoudre les identités Models contradictoires et constituer les baselines réelles. Calibrer et relire les versions exactes des profils avant leur autorisation de publication. Aucun relevé absent ne doit être inventé.
- Mesurer la détection précoce avant de revendiquer une avance sur Trending. Fixer budget, rétention et quotas avant d'élargir le pool.
- Vérifier les premières attributions réelles, leur preuve et leur rendu GitHub Camo. Une période ou une preuve insuffisante ne donne aucun Award.

Procédures : [reprise des classements](site/incident-classements-2026-10-15.md), [exploitation v3](site/reference-ranking-operations.md) et [Badges & Awards](site/badges-awards.md).

## Mesure et contenu

- Le flux GA4 `G-45XWR4KJ1M` et le domaine public sont confirmés. Corriger après accord la mesure améliorée encore active et la conservation des événements de deux mois, puis vérifier les quatorze mois attendus. Le correctif local bloque GA4 par défaut jusqu'à sa mise en service autorisée.
- Vérifier la réception des événements GA4 et Vercel dans les comptes après accord, puis l'absence de nouveaux envois après refus, retrait ou expiration. Un test local ne prouve pas cette réception.
- Terminer la revue native des textes espagnols et allemands avant leur indexation. Les pages et assets restent communs aux quatre langues.
- Valider la [procédure de correction et de réponse](site/corrections-et-droit-de-reponse.md) avant sa publication. Elle est rédigée ; les éditions et preuves existantes restent immuables.

Voir [plan de mesure](site/google-analytics.md), [intégration locale](site/audit-integration-2026-10-15.md) et [traductions](site/traductions-locales.md).

## YouTube

Les quatre versions initiales de Shorts sont privées. Les quatre révisions locales passent le décodage complet et attendent leur validation d'écoute et un accord de publication. E1 est annulé ; seul E2 reste à suivre après diffusion autorisée. Le journal Postgres durable est implémenté et testé. Il reste à autoriser sa mise en service, réconcilier les opérations passées et connecter OAuth avant toute publication automatique. Le cache GitHub Actions n'est pas ce journal.

Voir [protocole E2](site/experiences-e1-e2-2026-10-14.md), [rapport YouTube](site/youtube-growth-2026-10-14.md) et [agent](../tools/youtube-growth/README.md).

## Limites d'exploitation

Le lot local remplace le limiteur en mémoire par un compteur Postgres partagé et ajoute un nonce CSP par requête sur l'administration. Ces protections passent les tests locaux et exigent la migration 0015 avant déploiement. La CSP publique conserve les scripts inline du rendu statique/ISR ; cette limite et les protections compensatoires sont documentées dans [ADR-0032](adr/ADR-0032-protections-et-persistance-issue-68.md).

Les décisions de conception sont déléguées selon PD-0003. Les dépenses, comptes, engagements juridiques, suppressions de données réelles, réglages système, commits, pushes et publications nécessitent l'accord du propriétaire, selon [AGENTS.md](../AGENTS.md).
