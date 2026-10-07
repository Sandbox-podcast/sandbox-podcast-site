# AGENTS.md

Instructions pour les agents IA qui travaillent sur ce dépôt. À lire en entier avant toute modification.

## Source de vérité

- Le dépôt sert le site média `apps/site` : conception dans `docs/site/`, décisions dans `docs/adr/` et `docs/design-decisions/`.
- Questions encore ouvertes : `docs/open-questions.md`.
- `old/` : archive du travail sur la plateforme de production de podcasts vidéo (prompt maître `old/PODCAST_PLATFORM_MASTER_PROMPT.md`, code, POC, ADR-0001 à 0014, questions ouvertes). Le propriétaire ne la réutilise pas ; voir `old/README.md`. Ne pas la modifier sans demande.

## Produit

Site média (podcast et classements hebdomadaires tech et IA) : `apps/site`, voir `docs/site/README.md`. L'ancien projet de plateforme de production de podcasts vidéo (PREP, STUDIO, POST) est archivé dans `old/`.

## Décisions déjà prises

- ADR-0015 et DD-0001 : site média `apps/site` (Next.js 16, contenu et snapshots de classements dans Git, données de démonstration identifiées). Produit distinct de la plateforme, voir `docs/site/`.
- Plateforme vidéo (archivée) : ADR-0001 à 0014 et PD-0001 à 0003 dans `old/docs/` (liste et résumé dans `old/README.md`).

## Règle de clarification

Par défaut (règle du prompt maître archivé, §0) : ne jamais trancher seul une décision structurante, coûteuse, ambiguë ou difficile à inverser. La poser avec la fonction de question du harnais (`AskUserQuestion` dans Claude Code) sous forme de QCM : sujet, raison, 2 à 4 options avec avantages, inconvénients et impacts, recommandation. Ensuite, enregistrer la réponse dans un ADR, une PD ou une DD.

Délégation active (PD-0003, 2026-10-05, texte dans `old/docs/product-decisions/PD-0003-delegation-de-decision-a-l-agent.md`) : les décisions de conception se tranchent sans QCM, en les consignant dans un ADR, une PD ou une DD avec la mention « décidée par l'agent sur délégation (PD-0003) ». Restent soumis au propriétaire : dépenses et comptes, publication ou message externe, suppression de données réelles, engagements juridiques, commits et pushes, réglages système.

Autonomie complète pour les décisions locales, réversibles et sans impact produit.

## Structure du dépôt

```
apps/        applications : `apps/site` (site média et classements hebdomadaires, voir docs/site/)
docs/        documentation du site, ADR, décisions de conception, tests
old/         archive de la plateforme de production de podcasts vidéo (code, POC, documentation) : hors de l'espace de travail pnpm
```

## Commandes

Prérequis : Node 24, pnpm 12 (`corepack enable`).

```bash
pnpm install
pnpm check          # format:check + lint + typecheck + test
pnpm test           # tests de tous les packages
pnpm format         # Prettier en écriture
```

## Conventions

- TypeScript strict. Pas de `any` pour contourner les types, pas de `try/catch` vide.
- Données externes validées par un schéma (Zod) avant usage.
- Logique métier en fonctions pures testables, isolées du navigateur et des I/O.
- Les packages ne s'importent que par leur `index.ts`.
- Documentation en français, identifiants de code en anglais.

## Sécurité

- Les permissions sont vérifiées côté serveur, jamais seulement dans l'interface.
- Aucun secret dans Git ni dans le frontend.
- Tout HTML utilisateur s'exécute dans un contexte isolé (iframe sandbox, origine séparée, CSP).
- Les médias sources ne sont jamais écrasés.
- Ne jamais afficher `SAFE` si le système ne peut pas le démontrer.

## Tests et Quality Gates

- À chaque modification : écrire ou adapter les tests, puis lancer `pnpm check` et lire le résultat.
- À chaque push (CI) : format, lint, typecheck, tests, audit des dépendances, secret scan.
- Bloquants : build ou type en échec, test critique en échec, faille critique, accès cross-podcast, perte de données d'enregistrement, régression de performance critique, migration dangereuse.
- Ne jamais désactiver un test ou un gate pour faire passer la CI sans exception documentée.
- Détail : `docs/testing.md`.

## Definition of Done

Critères d'acceptation vérifiés, permissions testées, erreurs et états loading/empty/error traités, tests écrits et lancés, documentation et décisions à jour, résultat vérifié réellement. Pour le média et le temps réel : réseau dégradé, reconnexion et perte de données testés, mesures CPU/mémoire/FPS/bande passante. Liste complète : §40 du prompt maître archivé.

## Interdits

- Coder une décision structurante non validée.
- Affirmer qu'un test passe sans l'avoir exécuté, ou inventer un résultat de benchmark.
- Modifier une migration déjà appliquée.
- Autoriser du HTML non isolé.
- Laisser une IA publier ou supprimer sans permission explicite.

## À lire avant de modifier

1. Cette page.
2. `docs/README.md` (index) et le document du domaine concerné.
3. Les ADR et décisions liées.
4. `docs/open-questions.md`.

## Rapport de fin de tâche

Résumé des changements, décisions prises, questions restantes, fichiers modifiés, tests exécutés et résultats, critères d'acceptation validés, risques et limites, étape suivante.
