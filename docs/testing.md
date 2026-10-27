# Tests et contrôles du site média

Ce dépôt contrôle l’application `apps/site`, ses contenus, snapshots, migrations et workflows d’exploitation. Les projets vidéo, outils sociaux, exports et rapports datés sont contrôlés dans [sandbox-podcast-resources](https://github.com/Sandbox-podcast/sandbox-podcast-resources).

## Commandes locales

Prérequis : Node 24 et pnpm 12.9.1.

```powershell
pnpm check
pnpm build
pnpm --filter @podcast/site test:og:tracing
pnpm --filter @podcast/site test:public-routes
pnpm --filter @podcast/site test:analytics:e2e
pnpm --filter @podcast/site test:admin:http
pnpm --filter @podcast/site test:badges:http
pnpm --filter @podcast/site test:badges:e2e
pnpm audit --audit-level=high
```

`pnpm check` enchaîne formatage, lint, TypeScript et tests. Un échec arrête la chaîne ; il ne vaut pas exécution des étapes suivantes. Les contrôles navigateur nécessitent Playwright. Chromium est préparé en CI ; `SANDBOX_BROWSER_CHANNEL=msedge` ou `chrome` utilise un navigateur installé en local.

## Périmètre

- Domaine : schémas, scores, mouvements, éditions, sources, périodes, preuves, rejouabilité, contenu et traductions.
- Persistance : PGlite exécute les migrations versionnées et vérifie permissions, conflits, unicité, retraits et preuves immuables. Aucun test ne migre Neon.
- Routes publiques : une base éphémère sert les classements, archives, méthodes et démonstrations. Toutes les URL de son sitemap doivent répondre 200, rester indexables et annoncer le bon canonical ; les routes absentes restent en 404.
- Partage : les images annoncées par les cinq pages principales de classements sont chargées et contrôlées. Après le build, `test:og:tracing` vérifie que chaque route OpenGraph inclut ses cinq fichiers de police dans la trace de déploiement.
- Consentement : Playwright teste GA4 bloqué par défaut et activé dans un processus de test, refus, retrait dans un autre onglet, expiration, événements filtrés et exclusion de l'administration. Les services Google/Vercel sont simulés localement ; ces parcours ne prouvent pas la réception distante.
- Sécurité : compteur Postgres concurrent et expiration, refus des connexions si le compteur est indisponible, nonces CSP distincts dans le HTML du build de production, permissions et origine des mutations, secrets cron, tailles des corps JSON bornées pendant leur lecture, paramètres invalides et états d'erreur sans fuite de secret.
- Badges : huit familles, périodes complètes, dernier créneau du dimanche, concurrence, absence de doublon, retrait, SVG/PNG, copies, liens, filtres, pagination et accessibilité des générateurs.

Les serveurs de test écoutent sur loopback et neutralisent les secrets de collecte. Les fichiers éditoriaux de prévisualisation sont isolés sous `.local`, avec noms bornés, et ne sont jamais lus en production.

## CI et sécurité

`.github/workflows/ci.yml` lance contrôles de formatage, lint, types, tests, build du site, parcours HTTP et navigateur, audit des dépendances et Gitleaks. Aucun test ni contrôle n'est désactivé pour obtenir un résultat vert.

## Validations historiques

La livraison #67 du 15 octobre est validée avec 566 tests du site, 11 tests média, un build de 215 pages, 43 contrôles navigateur Badges & Awards et 21 parcours interactifs. Ces résultats précèdent l'intégration locale de l'audit et ne certifient pas les changements suivants. Les rapports ultérieurs sont conservés dans [l’historique des ressources](https://github.com/Sandbox-podcast/sandbox-podcast-resources/tree/main/docs/site/history/2026/10).

Bloquants : build ou type en échec, test critique en échec, faille critique, accès interdit, perte de données, régression critique de performance ou migration dangereuse. Les migrations SQL déjà publiées restent intactes.
