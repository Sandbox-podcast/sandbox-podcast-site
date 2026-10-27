# SANDBOX — site média

Ce dépôt contient le site SANDBOX (podcast et classements tech et IA), son contenu publié, ses données de démonstration et ses contrôles. L’application se trouve dans `apps/site`.

## Démarrer

Prérequis : Node 24 et pnpm 12 (`corepack enable`).

```bash
pnpm install
pnpm check
pnpm --filter @podcast/site build
pnpm --filter @podcast/site start
```

## Documentation

- [`docs/README.md`](docs/README.md) : index et périmètre de la documentation.
- [`docs/site/README.md`](docs/site/README.md) : conception, exploitation et guides du site.
- [`docs/adr/`](docs/adr/) et [`docs/design-decisions/`](docs/design-decisions/) : décisions en vigueur.
- [`docs/testing.md`](docs/testing.md) : contrôles locaux et CI.
- [`AGENTS.md`](AGENTS.md) : règles de travail du dépôt.

Les rapports datés, projets vidéo, kits, médias et outils de production sont dans le dépôt [sandbox-podcast-resources](https://github.com/Sandbox-podcast/sandbox-podcast-resources). Les fichiers nécessaires au rendu du site restent dans `apps/site`.
