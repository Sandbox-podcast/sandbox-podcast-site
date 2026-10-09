# Site média : conception

Application : [`apps/site`](../../apps/site). Décision de fond : [ADR-0015](../adr/ADR-0015-site-media-et-classements.md). Direction artistique et nommage : [DD-0001](../design-decisions/DD-0001-direction-artistique-du-site.md).

La stratégie de découverte multilingue et le contrat de données pour les classements sont définis dans [ADR-0020](../adr/ADR-0020-architecture-seo-international-des-classements.md) et [la feuille de route SEO](seo-roadmap.md). Le registre i18n contient 115 cibles européennes prioritaires et le routage accepte les locales BCP 47 canoniques à code de langue ISO de deux ou trois lettres. Les chemins français restent sans préfixe ; les autres locales utilisent leur tag complet. Seules les traductions relues et reliées à des données réelles peuvent sortir du `noindex`.

Le parcours média centré sur les podcasts, les ressources en barre latérale et la recherche sont définis par [DD-0003](../design-decisions/DD-0003-parcours-podcast-et-theme-rouge.md). [DD-0008](../design-decisions/DD-0008-logo-et-navigation-publique.md) fixe le logo complet, les sous-menus Podcasts et le retrait du choix de thème. Les articles historiques du dépôt ne sont plus publiés comme pages autonomes.

[DD-0009](../design-decisions/DD-0009-langue-des-classements.md) fixe les libellés français des classements publics et un état d'attente explicite tant qu'aucune édition réelle n'est publiée.

Ce site est un produit distinct de la plateforme de production de podcasts décrite dans le prompt maître : il n'en reprend ni les critères d'acceptation ni le Golden Path. Il vit dans le même dépôt parce que le monorepo (ADR-0001) prévoyait déjà une application Next.js.

Les contenus initiaux du dépôt restent simulés et l’indexation demeure bloquée. SANDBOX CHARTS collecte GitHub, Skills.sh, Hugging Face, Arena et OpenRouter dans Postgres, conserve leurs relevés datés et publie des éditions hebdomadaires immuables sans secours par des fixtures. Les collecteurs Skills/Models sont implémentés, mais l'activation réelle attend la configuration des accès, la validation des conditions de source et l'application contrôlée de la migration 0005. Voir [le guide SANDBOX CHARTS](sandbox-charts.md), [les sources externes Skills/Models](external-rankings.md), [la fiche de mise en service](mise-en-service-neon-vercel.md), [le rapport local](sandbox-charts-livraison.md), [ADR-0019](../adr/ADR-0019-sandbox-charts-github-postgres.md), [ADR-0021](../adr/ADR-0021-classements-externes-skills-models.md) et [DD-0004](../design-decisions/DD-0004-sandbox-charts.md). Le passage global en `SITE_DATA_MODE=live` attend toujours des contenus vérifiés sur le reste du site.

## 1. Architecture du produit

Trois couches, qui ne se mélangent jamais, y compris dans l'interface :

Depuis le rework SANDBOX CHARTS, les données GitHub nouvelles vivent dans Postgres. Le tableau ci-dessous décrit les contenus historiques et les autres collections du site. Les fichiers de snapshots existants ne sont pas réécrits.

| Couche        | Contenu                                                              | Où elle vit                         | Provenance       |
| ------------- | -------------------------------------------------------------------- | ----------------------------------- | ---------------- |
| **DATA**      | métriques relevées, scores, rangs                                    | `data/snapshots/` (JSON figé)       | `auto` ou `mock` |
| **ÉDITORIAL** | avis (OUR TAKE), épisodes, fiches, méthodologie                      | `content/` (JSON, validé par Zod)   | `editorial`      |
| **DÉRIVÉ**    | mouvements (UP, DOWN, NEW, RE, OUT), séries, statistiques, relations | calculé à la lecture, jamais stocké | calculé          |

Le contenu initial est du code : fichiers JSON dans Git, validés par des schémas Zod et par des contrôles de références (`pnpm content:check`). Le backoffice enregistre les brouillons et publications dans Postgres/Neon en production, puis déclenche la revalidation ISR. En développement, un fichier local ignoré par Git suffit. Next.js 16 pré-génère les pages publiques ; les routes d’administration et d’écriture sont dynamiques. Le projet Vercel actuel est `sandbox-podcast`, relié à `www.sandboxpodcast.fr`. L'intégration de la [PR #2](https://github.com/Sandbox-podcast/sandbox-podcast-site/pull/2) et les étapes restantes figurent dans [ADR-0017](../adr/ADR-0017-persistance-editoriale-postgres.md) et [la transmission Vercel](transmission-vercel-2026-10-07.md).

Un graphe de contenus relie les entités (projets et modèles), les classements et les épisodes sans qu'aucun lien ne soit saisi deux fois. Les liens se déduisent des mentions d'épisode et des voisins de classement (`src/lib/graph.ts`).

## 2. Arborescence

| Route                                                   | Page                                                                                               |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `/`                                                     | accueil streaming : épisode à la une, rangées d'épisodes par date et thème, aperçu des classements |
| `/episodes`                                             | bibliothèque complète, rangées filtrées par thème                                                  |
| `/search?q=…`                                           | recherche dans épisodes, ressources, sources, entités, thèmes et classements                       |
| `/charts`                                               | accueil des classements : sélecteur, top 3 à la une, aperçu des tops et historique                 |
| `/charts/[slug]`                                        | classement courant (rangs, mouvements, DATA, OUR TAKE, tri par critère, Hall of #1)                |
| `/charts/[slug]/[semaine]`                              | archive d'une semaine (`2026-W40`)                                                                 |
| `/charts/[slug]/methodology`                            | « Comment ce classement est calculé » : sources, critères, formule, limites                        |
| `/charts/history`, `/charts/history/[semaine]`          | sélecteur de semaine, tableau des #1, mouvements par semaine                                       |
| `/moves/[classement]/[semaine]/[entité]`                | carte de partage d'un mouvement (+ image OpenGraph), 3 dernières semaines                          |
| `/episodes/[numéro]`                                    | lecteur vidéo, description, chapitres et barre latérale des mentions, sources et annexes           |
| `/stories/[slug]`                                       | ancienne route redirigée vers la bibliothèque d'épisodes                                           |
| `/projects/[slug]`, `/models/[slug]`                    | fiche d'entité : rang actuel et précédent, pic, semaines au Top, courbes, avis, épisodes           |
| `/topics`, `/topics/[slug]`                             | thèmes et sélections d'épisodes                                                                    |
| `/about`                                                | cartes de Lou, Nicolas et Loïc, avec les profils sociaux disponibles                               |
| `/en`, `/en/charts`                                     | mêmes pages et assets que le français, textes anglais dans les dictionnaires locaux                |
| `/{locale}/…`                                           | pages publiques partagées, dictionnaire local par locale BCP 47, dont écritures distinctes         |
| `/charts/skills/[plateforme]`, `/charts/models/[tâche]` | pages d'intention SEO à données réelles, méthode, sources et texte localisé relu                   |
| `/admin`                                                | édition des épisodes, ressources, classements et réglages du site ; brouillons et publication      |
| `/feed.xml`, `/sitemap.xml`, `/robots.txt`              | RSS, sitemap vide tant que le contenu est simulé, robots lisibles pour appliquer `noindex`         |
| `/rankings/…`                                           | redirections permanentes vers `/charts/…`                                                          |

Code : `src/domain` (logique pure, sans I/O), `src/i18n` (cibles, routage et chaînes UI ; voir leur état de revue dans la feuille de route SEO), `src/pipeline` (connecteurs et mise à jour hebdomadaire), `src/lib` (lecture du contenu, validation, graphe, SEO, traductions, images OpenGraph), `src/components`, `src/app` (groupes de routes français et locales dynamiques), `content/` et `data/`, `scripts/` (CLI), `test/`.

## 3. Composants principaux

- **ChartRow** : une ligne de classement. Gros numéro (plein pour le podium, détouré ensuite), badge de mouvement, identité visuelle, score, courbe de rang, puis deux blocs séparés : DATA (pourquoi ça bouge, généré à partir des chiffres) et OUR TAKE (avis signé). Détails dépliables avec toutes les mesures et leurs sources.
- **ChartLens** : tri d'un classement par critère (les 10 dimensions des modèles) avec animation de réordonnancement. Le classement officiel reste rendu côté serveur.
- **RankSpark / RankHistory / SeriesChart** : graphiques SVG serveur, sans JavaScript, avec texte alternatif.
- **TakeCard** et **data-block** : les deux seuls conteneurs d'information. Aucun composant ne mélange les deux.
- **MiniChart** : aperçu d'un classement avec une hauteur de titre réservée pour aligner les aperçus.
- **EpisodeCover** : couverture 16:9 typographique, remplacée par la miniature YouTube importée quand elle existe.
- **EpisodeComposer** : création et modification d'un épisode depuis son URL YouTube. La Data API v3 renseigne les métadonnées complètes ; les horodatages et liens de la description alimentent les chapitres et une seule liste de ressources. Sans clé API, oEmbed ne donne que le titre, la chaîne et la miniature.
- **Saisie rapide admin** : épisode prêt dès l'ouverture du backoffice, import au collage du lien, formulaires de thèmes et de sources sans JSON, avis et fiches ajoutés au Markdown par des actions guidées. Les détails secondaires se déplient au besoin et les brouillons sont enregistrés avant publication.
- **ChartWeekSelect** : choix d'une semaine directement dans l'en-tête de chaque classement.
- **Chart Markdown** : document éditorial unique par classement dans l'admin, avec présentation, méthode, fiches et avis. Les snapshots et scores restent structurés et immuables.
- **SiteSettingsEditor** : réglages de marque, métadescription, plateformes et cartes de l'équipe sur `/about`.
- **ShareCard + opengraph-image** : cartes de partage et images 1200×630 pour X, LinkedIn, Discord et Slack. La carte d'accueil utilise un visuel original de studio ; le favicon SVG et l'icône Apple reprennent le signe triangulaire Sandbox.

## 4. Modèle de données

Schémas Zod dans `src/domain/schema.ts` (source de vérité du format).

```
Source ─< MetricDef >─ ScoringProfile ─< Dimension ─< Component
                                  │
Chart ── (scoring) ───────────────┘            Snapshot (chart, semaine, provenance)
  │                                                 └─< SnapshotEntry (entité, rang, score, dimensions, métriques)
  │
Entity (project | model | tool) ── alternatives ──> Entity
  │      ├── Take (avis : entité, classement+semaine optionnels, animateur)
  │      └── Mention (épisode : entité optionnelle, horodatage, lien)
Episode ─< Mention, Source, Chapter       Host, Topic
```

- Un **profil de scoring** décrit des métriques, des métriques dérivées (ratio, somme pondérée), des dimensions et leurs composants (échelle `identity`, `range` à plancher et plafond fixes, `pool` relative aux candidats). Le même profil sert à calculer les scores, à générer la page méthodologie et à décrire les colonnes : la documentation ne peut pas diverger du calcul.
- Une donnée absente reste absente : un modèle sans vision n'a pas 0 en multimodal, la dimension n'existe pas et le global se calcule sur le reste.
- **Stockage éditorial actuel** : `editorial_records` garde une ligne par entité et par couche (`draft` ou `published`) ; `editorial_draft_meta` garde l'ETag du brouillon. Les snapshots et scores restent des fichiers Git hors de cette base.

## 5. Direction artistique

Le bleu nuit et le cyan sont l'unique apparence publique depuis [DD-0008](../design-decisions/DD-0008-logo-et-navigation-publique.md). La charte initiale est décrite dans [DD-0002](../design-decisions/DD-0002-charte-sandbox-bleu-nuit-cyan.md). Archivo sert les titres, Newsreader le texte éditorial et JetBrains Mono la donnée. Le rang reste l'élément graphique des classements.

## 6. Patterns UX des classements

- Le #1 occupe une ligne surlignée ; les trois premiers ont un chiffre plein, les suivants un chiffre détouré.
- Chaque ligne répond à quatre questions : où il est (rang), d'où il vient (badge et semaine précédente), pourquoi (DATA), ce que nous en pensons (OUR TAKE, si présent).
- « Bubbling under » (rangs 11 et suivants) et « OUT » comme dans les charts musicaux.
- Tri par critère pour les modèles : un modèle n'est pas « le meilleur », il est meilleur sur quelque chose.
- Mobile : la ligne se réorganise en carte (rang et nom en haut, mouvement et pastilles dessous). Aucun tableau large.
- Chaque mouvement a une carte de partage ; chaque page a sa date de mise à jour (« Dernière mise à jour : 6 octobre 2026 · il y a 8 h », la durée relative étant calculée dans le navigateur).

## 7. Historisation

- Chaque semaine, le pipeline écrit un **snapshot** (`data/snapshots/<classement>/<semaine>.json`) : tous les candidats avec rang, score, sous-scores et métriques brutes. Il est **immuable** : `week-run` refuse d'écrire deux fois la même semaine, et `--rebuild-mock` ne supprime que des snapshots de provenance `mock`.
- Les mouvements ne sont pas stockés : `computeMovements` les déduit de deux snapshots consécutifs (UP, DOWN, STABLE, NEW, RE, OUT). Le premier snapshot d'un classement est une base de départ, sans mouvement.
- Les statistiques d'une entité (meilleure position, semaines au Top, série en cours, première apparition, fois #1, plus forte hausse et chute) sont recalculées à partir de la suite complète (`entityHistory`), de même que le Hall of #1 (`reigns`).
- Les séries de métriques (étoiles, SWE-bench…) viennent des mêmes snapshots : « évolution des stars » et « évolution des benchmarks » n'ont pas de stockage propre.

## 8. Alimentation des données

Voir [data-strategy.md](data-strategy.md) : connecteurs prévus, provenance, règles (jamais de valeur inventée), cycle hebdomadaire.

## Ce qui est fait, ce qui ne l'est pas

Fait : 4 classements de 10 avec 16 semaines d'historique (démonstration locale), bibliothèque podcast vide en attendant les vrais épisodes, 55 fiches, 29 avis, pages de classement avec avancement de collecte, recherche, import de métadonnées YouTube, formulaires d'édition des épisodes et réglages du site (dont À propos), brouillons et publication authentifiés, SEO (métadonnées, JSON-LD, sitemap, RSS), scripts de création de contenu.

Fait : fondations i18n (préfixes BCP 47, registre de 115 cibles européennes prioritaires, schémas de traduction, statuts de revue, routes dynamiques, canoniques, hreflang et gates du sitemap). Les 24 modèles de pages publiques utilisent les mêmes composants et assets dans toutes les langues. Le sélecteur propose les 115 langues avec recherche et drapeaux. Les traductions locales anglaises couvrent les contenus existants ; les commandes communes sont présentes dans 26 autres langues. Les traductions complètes des autres langues restent à rédiger et à relire. Les pages localisées partagées restent `noindex` pendant cette préparation. Voir [le guide de traduction](traductions-locales.md).

Fait : workflow de traduction déclenché manuellement dans le harnais, export des textes publiés depuis l’admin, détection des entrées manquantes et import authentifié des lots JSON. Les résultats importés sont conservés localement en développement et dans Neon en production après la migration 0006. Voir [le prompt et la mise en service](prompt-traductions-harnais.md).

Pas encore fait : activation en production des collecteurs Skills et Models (accès, conditions des sources, migration 0005 et crons) ; traduction complète et revue native des 113 langues hors français et anglais ; revue SEO des variantes traduites ; migration 0006 et déploiement du workflow dans Neon/Vercel ; newsletter, commentaires et politique de cookies. Le composant Vercel Analytics est présent dans le layout, mais son activation dans le projet Vercel et sa collecte en production restent à vérifier. La situation déclarée par Lou est un contenu éditorial simulé et des classements réels en production ; les fixtures du dépôt restent identifiées comme démonstration. Les épisodes fournis n'ont pas encore d'identifiants vidéo YouTube réels. Les liens LinkedIn, GitHub et X de Nicolas et Loïc restent à renseigner. Ces changements locaux ne sont pas encore publiés sur Vercel.

Limites connues : pas de politique de contenu (CSP) stricte avec nonce, pas de test de navigateur automatisé (Playwright), accessibilité vérifiée à la main sur peu de pages, aucune mesure de performance (Lighthouse, Core Web Vitals) faite. Voir [rapport](../adr/ADR-0015-site-media-et-classements.md#risques).

## Optimisation UI/UX du 8 octobre 2026

La bibliothèque propose désormais recherche, filtre par thème et tri par date ou durée. Les fiches, les méthodes et les classements ont des sommaires. L'en-tête, le pied de page, les états vides et le studio partagent les mêmes repères. Voir [DD-0005](../design-decisions/DD-0005-ux-globale-du-site.md) et le [rapport de validation](ui-ux-2026-10-08.md).
