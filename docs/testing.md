# Tests et contrôles du site média

Le dépôt actif contient le site `apps/site`, les tests du générique et ceux des assets vidéo. La plateforme vidéo et ses POC sont archivés dans [old/](../old/README.md).

## Commandes

Node 24 et pnpm 12.9.1, selon `package.json`.

```powershell
pnpm check
pnpm build
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
- Consentement : Playwright teste GA4 bloqué par défaut et activé dans un processus de test, refus, retrait dans un autre onglet, expiration, événements filtrés et exclusion de l'administration. Les services Google/Vercel sont simulés localement ; ces parcours ne prouvent pas la réception distante.
- Sécurité : compteur Postgres concurrent et expiration, refus des connexions si le compteur est indisponible, nonces CSP distincts dans le HTML du build de production, permissions et origine des mutations, secrets cron, tailles des corps JSON bornées pendant leur lecture, paramètres invalides et états d'erreur sans fuite de secret.
- Badges : huit familles, périodes complètes, dernier créneau du dimanche, concurrence, absence de doublon, retrait, SVG/PNG, copies, liens, filtres, pagination et accessibilité des générateurs.

Les serveurs de test écoutent sur loopback et neutralisent les secrets de collecte. Les fichiers éditoriaux de prévisualisation sont isolés sous `.local`, avec noms bornés, et ne sont jamais lus en production. Les dossiers générés sont exclus du lint, sans exclure les sources ni les tests.

## CI

`.github/workflows/ci.yml` lance formatage, lint, types, tests, build, parcours HTTP, parcours de consentement et audit des dépendances. Le job séparé Gitleaks contrôle les secrets ; sur une PR, le scan porte sur les commits du lot. Aucun test ni contrôle n'est désactivé pour obtenir un résultat vert.

## Validations

La livraison #67 du 15 octobre est validée avec 566 tests du site, 11 tests média, un build de 215 pages, 43 contrôles navigateur Badges & Awards et 21 parcours interactifs. Ces résultats précèdent l'intégration locale de l'audit et ne certifient pas les changements suivants.

Les résultats du lot courant sont consignés dans [le rapport du 16 octobre](site/issue-68-2026-10-16.md). Le [rapport d'intégration](site/audit-integration-2026-10-15.md) conserve les résultats antérieurs. Les tests YouTube utilisent un Postgres local isolé pour vérifier la concurrence, la persistance et les opérations interrompues. Les tests Vitest utilisent quatre workers pour borner la mémoire des instances PGlite, sans modifier leurs assertions ni leurs délais. Les mesures mobiles et validations distantes y restent distinguées des essais locaux.

Bloquants : build ou type en échec, test critique en échec, faille critique, accès interdit, perte de données, régression critique de performance ou migration dangereuse. Les migrations SQL déjà publiées restent intactes.
