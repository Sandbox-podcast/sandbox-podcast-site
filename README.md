# Site média : podcast et classements hebdomadaires

Le dépôt sert le site `apps/site` (podcast et classements hebdomadaires tech et IA). Il est en mode démonstration : voir `docs/site/README.md`.

## Démarrer

Prérequis : Node 24 et pnpm 12 (`corepack enable`).

```bash
pnpm install
pnpm check
corepack pnpm --filter @podcast/site build
corepack pnpm --filter @podcast/site start
```

## Documentation

- `docs/README.md` : index de la documentation du site.
- `AGENTS.md` : règles pour les agents IA.

## Archive

`old/` contient le travail sur l'ancien projet de plateforme de production de podcasts vidéo (code, 10 POC, ADR, rapport final). Elle n'est plus dans l'espace de travail pnpm : voir `old/README.md`.
