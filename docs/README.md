# Documentation

Le dépôt sert le site média `apps/site`. La documentation du travail précédent (plateforme de production de podcasts vidéo) est archivée dans [`../old/`](../old/README.md).

## Site média

UI/UX du site : [rapport du 8 octobre 2026](site/ui-ux-2026-10-08.md) et [DD-0005](design-decisions/DD-0005-ux-globale-du-site.md).
Présentations d’épisode en HTML sur `slides.sandboxpodcast.fr` : [guide des slides](site/slides.md) et [DD-0007](design-decisions/DD-0007-sous-domaine-des-presentations.md).
Logo complet et navigation publique : [DD-0008](design-decisions/DD-0008-logo-et-navigation-publique.md).
Langue des classements publics : [DD-0009](design-decisions/DD-0009-langue-des-classements.md).

SANDBOX CHARTS : [guide d’exploitation](site/sandbox-charts.md), [sources externes Skills/Models](site/external-rankings.md), [fiche de mise en service Neon et Vercel](site/mise-en-service-neon-vercel.md), [rapport de livraison](site/sandbox-charts-livraison.md), [méthodologie](sandbox-charts-methodology.md), [ADR-0019](adr/ADR-0019-sandbox-charts-github-postgres.md), [ADR-0021](adr/ADR-0021-classements-externes-skills-models.md), [ADR-0023](adr/ADR-0023-editions-quotidiennes-des-classements.md) et [DD-0004](design-decisions/DD-0004-sandbox-charts.md).
Langues du site (français, anglais, espagnol, allemand) : [DD-0010](design-decisions/DD-0010-quatre-langues-du-site.md). Architecture SEO : [ADR-0020](adr/ADR-0020-architecture-seo-international-des-classements.md) et [feuille de route SEO](site/seo-roadmap.md).
Pages et assets partagés entre langues, dictionnaires locaux : [DD-0006](design-decisions/DD-0006-pages-partagees-et-traductions-locales.md) et [guide de traduction](site/traductions-locales.md).
Traductions déclenchées dans le harnais : [ADR-0022](adr/ADR-0022-traductions-manuelles-depuis-le-harnais.md) et [prompt, export/import et mise en service Neon](site/prompt-traductions-harnais.md).
Passation pour finaliser la livraison, les données réelles et le SEO : [liste de travail de la PR](site/passation-pr-2026-10-08.md).

| Document                                                                                | Contenu                                      |
| --------------------------------------------------------------------------------------- | -------------------------------------------- |
| [site/README.md](site/README.md)                                                        | Conception du site `apps/site`               |
| [site/data-strategy.md](site/data-strategy.md)                                          | Stratégie de données                         |
| [site/editorial-workflow.md](site/editorial-workflow.md)                                | Travail éditorial                            |
| [site/seo-roadmap.md](site/seo-roadmap.md)                                              | Architecture SEO, requêtes cibles, langues   |
| [site/transmission-vercel-2026-10-07.md](site/transmission-vercel-2026-10-07.md)        | Reprise des changements locaux sur Vercel    |
| [adr/ADR-0015](adr/ADR-0015-site-media-et-classements.md)                               | Décision de fond : site média et classements |
| [adr/ADR-0016](adr/ADR-0016-administration-editoriale-vercel.md)                        | Administration éditoriale                    |
| [adr/ADR-0017](adr/ADR-0017-persistance-editoriale-postgres.md)                         | Persistance éditoriale Postgres              |
| [adr/ADR-0018](adr/ADR-0018-comptes-admin-postgres.md)                                  | Comptes admin et rôles Postgres              |
| [adr/ADR-0020](adr/ADR-0020-architecture-seo-international-des-classements.md)          | SEO international et modèle des classements  |
| [adr/ADR-0021](adr/ADR-0021-classements-externes-skills-models.md)                      | Sources externes et scoring Skills/Models    |
| [adr/ADR-0023](adr/ADR-0023-editions-quotidiennes-des-classements.md)                   | Éditions quotidiennes des classements        |
| [design-decisions/DD-0001](design-decisions/DD-0001-direction-artistique-du-site.md)    | Direction artistique, nom et langue du site  |
| [design-decisions/DD-0002](design-decisions/DD-0002-charte-sandbox-bleu-nuit-cyan.md)   | Charte bleu nuit et cyan                     |
| [design-decisions/DD-0003](design-decisions/DD-0003-parcours-podcast-et-theme-rouge.md) | Parcours podcast et thème rouge              |
| [design-decisions/DD-0008](design-decisions/DD-0008-logo-et-navigation-publique.md)     | Logo complet et navigation publique          |
| [design-decisions/DD-0009](design-decisions/DD-0009-langue-des-classements.md)          | Langue des classements publics               |
| [design-decisions/DD-0010](design-decisions/DD-0010-quatre-langues-du-site.md)          | Quatre langues du site                       |
| [testing.md](testing.md)                                                                | Tests et Quality Gates                       |
| [open-questions.md](open-questions.md)                                                  | Questions ouvertes                           |

## Archive

Plateforme de production de podcasts vidéo (studio virtuel, régie, enregistrement serveur, MCP, post-production) : code, 10 POC, ADR-0001 à 0014, modèle de menaces, modèle de coût, rapport final. Point d'entrée : [old/README.md](../old/README.md) ; index de ses documents : [old/docs/README.md](../old/docs/README.md).
