# Documentation

Accueil cinématique, chapitres visuels et mouvements : [DD-0049](design-decisions/dd-0049-accueil-cinematique-et-mouvements.md), [recette locale](site/landing-cinematique-2026-10-16.md) et [vérification avant PR](site/verification-landing-pr-2026-10-16.md).

Parité de l'accueil et ouverture du vidéoclub en mode production : [DD-0047](design-decisions/dd-0047-parite-accueil-production.md) et [diagnostic et contrôles](site/ecarts-production-2026-10-16.md).

PR globale du 16 octobre : [périmètre complet, validations et captures](site/livraison-globale-pr69-2026-10-16.md), avec les retouches de l'accueil, la Time Machine illustrée et Épisode 002 BIS.

Livraison groupée du 16 octobre : [périmètre, contrôles et captures](site/livraison-groupee-2026-10-16.md). Les objets du plateau ouvrent les classements et la Time Machine selon [DD-0041](design-decisions/dd-0041-objets-du-plateau-vers-classements-et-time-machine.md).

Corrections de l'issue 68 au 16 octobre : [rapport et actions restantes](site/issue-68-2026-10-16.md), [sécurité et persistance](adr/ADR-0032-protections-et-persistance-issue-68.md) et [procédure de correction éditoriale](site/corrections-et-droit-de-reponse.md).

Accueil mobile éditorial, sans montage du trio, et plateau conservé sur ordinateur : [DD-0039](design-decisions/dd-0039-accueil-mobile-editorial-et-plateau-desktop.md) et [validation V11](site/refonte-2026-10-15/refonte-editoriale-mobile-v11.md).

Rapport local des classements v3 : [validation et limites](site/reference-ranking-delivery.md).

Classements v3, deux publications quotidiennes et détection précoce GitHub : [conception et audit](site/reference-ranking-design.md), [configuration et reprise](site/reference-ranking-operations.md), [prompt réutilisable](site/prompt-classements-reference.md), [ADR-0026](adr/ADR-0026-classements-de-reference-ponderes.md), [ADR-0027](adr/ADR-0027-detection-precoce-github.md) et [ADR-0028](adr/ADR-0028-cadence-des-classements.md). Le [README du dépôt](../README.md) décrit le fonctionnement global. Les profils v3 attendent leur calibration avant publication.

Le dépôt sert le site média `apps/site`. La documentation du travail précédent (plateforme de production de podcasts vidéo) est archivée dans [`../old/`](../old/README.md).

## Site média

Accueil organisé autour de l'équipe : [DD-0034](design-decisions/DD-0034-accueil-equipe-projets-puis-rubriques.md) et [validation V4](site/refonte-2026-10-15/accueil-parcours-v4.md). Les biographies et projets précèdent la Time Machine et les classements ; les onglets sont retirés du premier écran.

Accueil cinématique avec Lou, Loïc et Nico sur un plateau télé : [DD-0033](design-decisions/DD-0033-accueil-cinematique-et-trio-sur-plateau-tv.md), [visuel et provenance](site/refonte-2026-10-15/plateau-provisoire.md). Cette itération complète DD-0032 après la revue locale de Lou.

Refonte du site : [audit business et site](SANDBOX_AUDIT.md), [stratégie UX](SANDBOX_UX_STRATEGY.md) et [roadmap](SANDBOX_ROADMAP.md). [DD-0032](design-decisions/DD-0032-accueil-marque-et-plateau.md) place le pitch du podcast et son plateau sur l'accueil. Elle remplace les choix d'accueil de [DD-0031](design-decisions/DD-0031-refonte-decouverte.md), dont les améliorations des pages annexes restent applicables.

Replays hebdomadaires sur une page unique `/podcast`, sans thèmes : [DD-0030](design-decisions/DD-0030-podcast-replays-hebdomadaires.md).

Accueil centré sur les classements et navigation mobile : [DD-0028](design-decisions/DD-0028-accueil-classements-et-navigation-mobile.md).

Sandbox Time Machine, histoire mondiale de l'IA et Wrapped annuel (localhost) : [guide](site/time-machine.md) et [DD-0027](design-decisions/DD-0027-time-machine-histoire-mondiale-ia.md).

Confiance et parcours : [corrections initiales](site/confiance-parcours-2026-10-14.md), [intégration locale des méthodes et de la mesure](site/audit-integration-2026-10-15.md), [DD-0029](design-decisions/DD-0029-integration-audit-methodes-et-mesure.md) et [suivi #68](https://github.com/Sandbox-podcast/sandbox-podcast-site/issues/68).

Badges et Awards (huit familles, validations réelles à terminer) : [guide](site/badges-awards.md) et [ADR-0031](adr/ADR-0031-badges-et-awards-sandbox.md).

Catalogue Nos projets : [guide et inventaire](site/nos-projets.md) et [DD-0019](design-decisions/DD-0019-catalogue-nos-projets.md).

Vue alternative locale dans un vidéoclub : [essayer le prototype](site/video-club.md) et [DD-0035](design-decisions/dd-0035-videoclub-local-des-projets.md).

Porte discrète intégrée au plateau local et petits boutons de chaînes : [visuel et validation](site/refonte-2026-10-15/porte-video-club.md) et [DD-0036](design-decisions/dd-0036-porte-du-videoclub-et-liens-des-chaines.md).

Nouveau décor fourni par Lou et ouverture animée de la porte : [provenance et validation](site/refonte-2026-10-15/decor-chaleureux-et-porte-animee.md) et [DD-0037](design-decisions/dd-0037-decor-chaleureux-et-ouverture-de-la-porte.md).

Accueil plein écran avec les vrais portraits et boîtes VHS photographiques : [sources, prompts et validation](site/refonte-2026-10-15/accueil-plein-ecran-et-vhs.md) et [DD-0038](design-decisions/dd-0038-accueil-plein-ecran-portraits-reels-et-vhs.md).

Retouches du 16 octobre : [épaules complétées et retrait des micros du plateau](site/refonte-2026-10-15/retouches-bustes-2026-10-16.md).

UI/UX du site : [rapport du 8 octobre 2026](site/ui-ux-2026-10-08.md) et [DD-0005](design-decisions/DD-0005-ux-globale-du-site.md).
Fiche d'épisode sans description longue : [DD-0022](design-decisions/DD-0022-fiche-episode-sans-description-longue.md).
Profils d'animateurs et page À propos : [DD-0015](design-decisions/DD-0015-animateurs-source-page-a-propos.md).
Présentations d’épisode en HTML sur `slides.sandboxpodcast.fr` : [guide des slides](site/slides.md) et [DD-0007](design-decisions/DD-0007-sous-domaine-des-presentations.md).
Logo complet et navigation publique : [DD-0008](design-decisions/DD-0008-logo-et-navigation-publique.md).
Miniatures haute définition des épisodes : [DD-0012](design-decisions/DD-0012-miniatures-episodes.md) et [guide éditorial](site/editorial-workflow.md).
Chaîne YouTube et kit graphique : [DD-0011](design-decisions/DD-0011-identite-youtube-sandbox.md) et [brand/youtube](../brand/youtube/README.md).
Direction artistique des jingles de séquence : [DD-0023](design-decisions/DD-0023-direction-artistique-des-jingles.md) et [masters vidéo](../videos/README.md).
Automatisation YouTube : [guide d'exploitation](../tools/youtube-growth/README.md) et [ADR-0025](adr/ADR-0025-automatisation-chaine-youtube.md).
Première livraison du Growth Agent : [audit et extraits du 14 octobre](site/youtube-growth-2026-10-14.md) et [ADR-0029](adr/ADR-0029-growth-agent-et-extraits-youtube.md).
Langue des classements publics : [DD-0009](design-decisions/DD-0009-langue-des-classements.md).

SANDBOX CHARTS : [guide d'exploitation](site/sandbox-charts.md), [sources externes Skills/Models](site/external-rankings.md), [fiche de mise en service Neon et Vercel](site/mise-en-service-neon-vercel.md), [rapport de livraison](site/sandbox-charts-livraison.md), [méthodologie](sandbox-charts-methodology.md), [ADR-0019](adr/ADR-0019-sandbox-charts-github-postgres.md), [ADR-0021](adr/ADR-0021-classements-externes-skills-models.md), [ADR-0023](adr/ADR-0023-editions-quotidiennes-des-classements.md) et [DD-0004](design-decisions/DD-0004-sandbox-charts.md).
Évolution multi-source des classements : [ADR-0024](adr/ADR-0024-classements-corrobores.md) et [onze sources examinées](site/multi-source-ranking-sources.md).
Langues du site (français, anglais, espagnol, allemand) : [DD-0010](design-decisions/DD-0010-quatre-langues-du-site.md). Architecture SEO : [ADR-0020](adr/ADR-0020-architecture-seo-international-des-classements.md) et [feuille de route SEO](site/seo-roadmap.md).
Aperçus des liens partagés : [DD-0013](design-decisions/DD-0013-apercus-des-liens-partages.md).
Pages et assets partagés entre langues, dictionnaires locaux : [DD-0006](design-decisions/DD-0006-pages-partagees-et-traductions-locales.md) et [guide de traduction](site/traductions-locales.md).
Traductions déclenchées dans le harnais : [ADR-0022](adr/ADR-0022-traductions-manuelles-depuis-le-harnais.md) et [prompt, export/import et mise en service Neon](site/prompt-traductions-harnais.md).
Passation pour finaliser la livraison, les données réelles et le SEO : [liste de travail de la PR](site/passation-pr-2026-10-08.md).

| Document                                                                                 | Contenu                                      |
| ---------------------------------------------------------------------------------------- | -------------------------------------------- |
| [site/README.md](site/README.md)                                                         | Conception du site `apps/site`               |
| [site/data-strategy.md](site/data-strategy.md)                                           | Stratégie de données                         |
| [site/editorial-workflow.md](site/editorial-workflow.md)                                 | Travail éditorial                            |
| [site/seo-roadmap.md](site/seo-roadmap.md)                                               | Architecture SEO, requêtes cibles, langues   |
| [site/transmission-vercel-2026-10-07.md](site/transmission-vercel-2026-10-07.md)         | Reprise des changements locaux sur Vercel    |
| [adr/ADR-0015](adr/ADR-0015-site-media-et-classements.md)                                | Décision de fond : site média et classements |
| [adr/ADR-0016](adr/ADR-0016-administration-editoriale-vercel.md)                         | Administration éditoriale                    |
| [adr/ADR-0017](adr/ADR-0017-persistance-editoriale-postgres.md)                          | Persistance éditoriale Postgres              |
| [adr/ADR-0018](adr/ADR-0018-comptes-admin-postgres.md)                                   | Comptes admin et rôles Postgres              |
| [adr/ADR-0020](adr/ADR-0020-architecture-seo-international-des-classements.md)           | SEO international et modèle des classements  |
| [adr/ADR-0021](adr/ADR-0021-classements-externes-skills-models.md)                       | Sources externes et scoring Skills/Models    |
| [adr/ADR-0023](adr/ADR-0023-editions-quotidiennes-des-classements.md)                    | Éditions quotidiennes des classements        |
| [design-decisions/DD-0001](design-decisions/DD-0001-direction-artistique-du-site.md)     | Direction artistique, nom et langue du site  |
| [design-decisions/DD-0002](design-decisions/DD-0002-charte-sandbox-bleu-nuit-cyan.md)    | Charte bleu nuit et cyan                     |
| [design-decisions/DD-0003](design-decisions/DD-0003-parcours-podcast-et-theme-rouge.md)  | Parcours podcast et thème rouge              |
| [design-decisions/DD-0008](design-decisions/DD-0008-logo-et-navigation-publique.md)      | Logo complet et navigation publique          |
| [design-decisions/DD-0009](design-decisions/DD-0009-langue-des-classements.md)           | Langue des classements publics               |
| [design-decisions/DD-0010](design-decisions/DD-0010-quatre-langues-du-site.md)           | Quatre langues du site                       |
| [design-decisions/DD-0021](design-decisions/DD-0023-direction-artistique-des-jingles.md) | Direction artistique des jingles de séquence |
| [testing.md](testing.md)                                                                 | Tests et Quality Gates                       |
| [open-questions.md](open-questions.md)                                                   | Questions ouvertes                           |

## Archive

Reprise des classements du 15 octobre : [constat, correctifs et mise en service](site/incident-classements-2026-10-15.md), [ADR-0030](adr/ADR-0030-reprise-et-controle-des-classements.md).

Plateforme de production de podcasts vidéo (studio virtuel, régie, enregistrement serveur, MCP, post-production) : code, 10 POC, ADR-0001 à 0014, modèle de menaces, modèle de coût, rapport final. Point d'entrée : [old/README.md](../old/README.md) ; index de ses documents : [old/docs/README.md](../old/docs/README.md).
