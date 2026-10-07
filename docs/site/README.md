# Site média : conception

Application : [`apps/site`](../../apps/site). Décision de fond : [ADR-0015](../adr/ADR-0015-site-media-et-classements.md). Direction artistique et nommage : [DD-0001](../design-decisions/DD-0001-direction-artistique-du-site.md).

Le parcours média podcast-first, les ressources en barre latérale, la recherche et le thème rouge optionnel sont définis par [DD-0003](../design-decisions/DD-0003-parcours-podcast-et-theme-rouge.md). Les articles historiques du dépôt ne sont plus publiés comme pages autonomes.

Ce site est un produit distinct de la plateforme de production de podcasts décrite dans le prompt maître : il n'en reprend ni les critères d'acceptation ni le Golden Path. Il vit dans le même dépôt parce que le monorepo (ADR-0001) prévoyait déjà une application Next.js.

**Les classements et épisodes initiaux restent des contenus simulés.** Aucune valeur de classement ne vient encore d'une API ni d'un benchmark réel. Les libellés de démonstration ont été retirés de l'interface publique à la demande du propriétaire, mais les pages restent en `noindex`, le sitemap est vide et le flux n'est pas destiné à une diffusion réelle. Le passage en `SITE_DATA_MODE=live` attend des contenus et mesures vérifiés. Voir [data-strategy.md](data-strategy.md). La charte Sandbox est décrite dans [DD-0002](../design-decisions/DD-0002-charte-sandbox-bleu-nuit-cyan.md), le backoffice dans [ADR-0016](../adr/ADR-0016-administration-editoriale-vercel.md).

## 1. Architecture du produit

Trois couches, qui ne se mélangent jamais, y compris dans l'interface :

| Couche        | Contenu                                                              | Où elle vit                         | Provenance       |
| ------------- | -------------------------------------------------------------------- | ----------------------------------- | ---------------- |
| **DATA**      | métriques relevées, scores, rangs                                    | `data/snapshots/` (JSON figé)       | `auto` ou `mock` |
| **ÉDITORIAL** | avis (OUR TAKE), épisodes, fiches, méthodologie                      | `content/` (JSON, validé par Zod)   | `editorial`      |
| **DÉRIVÉ**    | mouvements (UP, DOWN, NEW, RE, OUT), séries, statistiques, relations | calculé à la lecture, jamais stocké | calculé          |

Le contenu initial est du code : fichiers JSON dans Git, validés par des schémas Zod et par des contrôles de références (`pnpm content:check`). Le backoffice enregistre les brouillons et publications dans Postgres/Neon en production, puis déclenche la revalidation ISR. En développement, un fichier local ignoré par Git suffit. Next.js 16 pré-génère les pages publiques ; les routes d’administration et d’écriture sont dynamiques. Le projet Vercel actuel est `sandbox-podcast`, relié à `www.sandboxpodcast.fr`. L'intégration de la [PR #2](https://github.com/Sandbox-podcast/sandbox-podcast-site/pull/2) et les étapes restantes figurent dans [ADR-0017](../adr/ADR-0017-persistance-editoriale-postgres.md) et [la transmission Vercel](transmission-vercel-2026-10-07.md).

Un graphe de contenus relie les entités (projets et modèles), les classements et les épisodes sans qu'aucun lien ne soit saisi deux fois. Les liens se déduisent des mentions d'épisode et des voisins de classement (`src/lib/graph.ts`).

## 2. Arborescence

| Route                                          | Page                                                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `/`                                            | accueil streaming : épisode à la une, rangées d'épisodes par date et thème, aperçu des classements |
| `/episodes`                                    | bibliothèque complète, rangées filtrées par thème                                                  |
| `/search?q=…`                                  | recherche dans épisodes, ressources, sources, entités, thèmes et classements                       |
| `/charts`                                      | accueil des classements : sélecteur, top 3 à la une, aperçu des tops et historique                 |
| `/charts/[slug]`                               | classement courant (rangs, mouvements, DATA, OUR TAKE, tri par critère, Hall of #1)                |
| `/charts/[slug]/[semaine]`                     | archive d'une semaine (`2026-W40`)                                                                 |
| `/charts/[slug]/methodology`                   | « Comment ce classement est calculé » : sources, critères, formule, limites                        |
| `/charts/history`, `/charts/history/[semaine]` | sélecteur de semaine, tableau des #1, mouvements par semaine                                       |
| `/moves/[classement]/[semaine]/[entité]`       | carte de partage d'un mouvement (+ image OpenGraph), 3 dernières semaines                          |
| `/episodes/[numéro]`                           | lecteur vidéo, description, chapitres et barre latérale des mentions, sources et annexes           |
| `/stories/[slug]`                              | ancienne route redirigée vers la bibliothèque d'épisodes                                           |
| `/projects/[slug]`, `/models/[slug]`           | fiche d'entité : rang actuel et précédent, pic, semaines au Top, courbes, avis, épisodes           |
| `/topics`, `/topics/[slug]`                    | thèmes et sélections d'épisodes                                                                    |
| `/about`                                       | cartes de Lou, Nicolas et Loïc, avec les profils sociaux disponibles                               |
| `/admin`                                       | édition des épisodes, ressources, classements et réglages du site ; brouillons et publication      |
| `/feed.xml`, `/sitemap.xml`, `/robots.txt`     | RSS, sitemap vide tant que le contenu est simulé, robots lisibles pour appliquer `noindex`         |
| `/rankings/…`                                  | redirections permanentes vers `/charts/…`                                                          |

Code : `src/domain` (logique pure, sans I/O), `src/pipeline` (connecteurs et mise à jour hebdomadaire), `src/lib` (lecture du contenu, validation, graphe, SEO, images OpenGraph), `src/components`, `src/app` (routes), `content/` et `data/`, `scripts/` (CLI), `test/`.

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

Le bleu nuit et le cyan restent le thème par défaut ; le thème rouge et crème est disponible comme préférence locale. Détails dans [DD-0002](../design-decisions/DD-0002-charte-sandbox-bleu-nuit-cyan.md) et [DD-0003](../design-decisions/DD-0003-parcours-podcast-et-theme-rouge.md). Archivo pour les titres, Newsreader pour le texte éditorial, JetBrains Mono pour la donnée. Le rang reste l'élément graphique des classements.

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

Fait : 4 classements de 10 avec 16 semaines d'historique (démonstration), 3 épisodes, 55 fiches, 29 avis, bibliothèque média et pages de classement, recherche, import de métadonnées YouTube, formulaires d'édition des épisodes et réglages du site, brouillons et publication authentifiés, thème rouge optionnel, SEO (métadonnées, JSON-LD, sitemap, RSS), scripts de création de contenu.

Pas fait, volontairement : connecteurs réels, i18n, newsletter, commentaires, analytics, politique de cookies. Le code Postgres est intégré, mais la base de production et ses migrations ne sont pas encore configurées. Le site reste non indexé tant que ses données et épisodes sont simulés ; les épisodes fournis n'ont pas encore d'identifiants vidéo YouTube réels. Les liens LinkedIn, GitHub et X de Nicolas et Loïc restent à renseigner. La branche de travail est publiée sur GitHub ; la production Vercel n'est pas mise à jour.

Limites connues : pas de politique de contenu (CSP) stricte avec nonce, pas de test de navigateur automatisé (Playwright), accessibilité vérifiée à la main sur peu de pages, aucune mesure de performance (Lighthouse, Core Web Vitals) faite. Voir [rapport](../adr/ADR-0015-site-media-et-classements.md#risques).
