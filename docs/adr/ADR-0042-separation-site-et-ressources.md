# ADR-0042 : séparation du site et des ressources éditoriales

- Date : 2026-10-27.
- Statut : acceptée à la demande de Lou ; intégration du retrait dans le dépôt du site en attente.
- Répartition des fichiers : décidée par l’agent sur délégation (PD-0003).

## Contexte

Le dépôt du site réunissait l’application web, ses décisions et contrôles, ainsi que l’archive d’une ancienne plateforme, les médias sources, les projets vidéo, les kits de diffusion, des outils sociaux et de nombreux rapports datés. Ces éléments avaient des cycles de travail et des contrôles différents. Les changements de site étaient difficiles à distinguer des productions et archives.

## Décision

Deux dépôts publics sont utilisés, en conservant l’accès dont bénéficiaient déjà les fichiers suivis dans le dépôt public d’origine :

- [`sandbox-podcast-site`](https://github.com/Sandbox-podcast/sandbox-podcast-site) conserve `apps/site`, les contenus et données publiés, les guides du site, les ADR et décisions de conception, les questions ouvertes, les contrôles, les workflows du site et `tools/automation-watchdog`.
- [`sandbox-podcast-resources`](https://github.com/Sandbox-podcast/sandbox-podcast-resources) reçoit les projets vidéo et expériences, médias sources, exports, kits de diffusion, identité visuelle, outils de production, archive `old/` et rapports datés. Les rapports sont classés sous `docs/site/history/AAAA/MM/` en conservant leur chemin d’origine sous `docs/site/`.

Les références entre dépôts pointent vers les fichiers de l’autre dépôt. Les expériences qui publient un deck dans le site utilisent `SANDBOX_SITE_ROOT` pour indiquer `apps/site` lorsque les dépôts ne sont pas clonés côte à côte ; les tests conservent un instantané local des fichiers publics concernés. Chaque dépôt garde ses propres contrôles et workflows.

Le dépôt ressources commence par un instantané des fichiers suivis à la révision `63385fe20fe04ce2429e027c23d94ba3b089bf4c`. L’historique antérieur reste consultable dans le dépôt d’origine ; il n’est pas réécrit ni importé dans le dépôt ressources.

## Conséquences

Les modifications du site n’incluent plus les projets audiovisuels ni les outils de diffusion. Une personne qui travaille sur l’expérience 002 bis et veut publier le deck doit avoir les deux dépôts ou définir `SANDBOX_SITE_ROOT`. Les rapports datés restent consultables dans le dépôt ressources et les documents de référence du site restent avec le code. Les workflows du dépôt ressources ne publient pas automatiquement sur les plateformes sociales ; toute action de publication reste explicitement contrôlée.

La séparation matérielle est préparée dans la branche `codex/split-site-resources` du dépôt du site ; sa fusion attend une demande explicite de PR.
