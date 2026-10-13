# ADR-0020 — Architecture SEO internationale et modèle sémantique des classements

- Date : 2026-10-08
- Statut : accepté pour l'implémentation locale
- Décision : décidée par l'agent sur délégation (PD-0003)

Mise à jour du 2026-10-09 : le périmètre de 115 locales et le routage ouvert décrits ci-dessous sont remplacés par les quatre langues de [DD-0010](../design-decisions/DD-0010-quatre-langues-du-site.md).

## Contexte

Le site poursuit deux objectifs éditoriaux complémentaires : une bibliothèque de podcasts vidéo qui donne envie d'enchaîner les épisodes, et une destination de référence pour suivre les classements tech et IA. Les classements existants sont surtout modélisés comme des familles techniques (`github`, `skills`, `models`, `rising`). Cette forme ne suffit pas à représenter les intentions de recherche comme « meilleurs skills pour Claude Code », un cas d'usage précis ou une langue donnée.

Le modèle actuel sépare correctement les relevés, les avis et les données dérivées. Il faut prolonger cette séparation au niveau de l'intention de classement, de la preuve et des traductions. Les données GitHub réelles sont en cours de mise en place ; les collecteurs Skills et Models ne sont pas encore connectés.

## Décision

### 1. Deux piliers éditoriaux

- **Podcasts** : séries, épisodes, thèmes, personnes, chapitres, sources et ressources. Chaque épisode a une page autonome utile à l'écoute, avec ses médias, une description originale et ses liens contextuels.
- **Classements** : collections permanentes, éditions hebdomadaires immuables, profils d'entités, méthodologies, comparaisons et analyses éditoriales. Les pages de classement relient les épisodes pertinents sans transformer la bibliothèque en blog.

Les pages indexables doivent exposer en HTML leur titre, leur explication, les éléments classés, la date et les sources. Le lecteur vidéo reste une partie de la page de l'épisode ; la transcription et les chapitres deviennent des champs éditoriaux réutilisables quand l'équipe dispose des données et droits nécessaires.

### 2. Un classement doit annoncer ce qu'il mesure

`ranking_collections` représente une série de classement concrète, avec une clé stable, son type d'entité, son intention, sa méthode, ses dimensions cibles (plateforme, tâche, capacité, catégorie, public), sa fréquence, sa couverture minimale et sa politique d'indexation.

Les éditions hebdomadaires référencent cette clé de collection. Leurs rangs, métriques brutes, sous-scores, couverture, critères manquants, provenance et version de méthode sont figés ensemble. Les pages d'archives gardent ainsi le contexte et la formule de l'époque.

Types de classement à distinguer explicitement :

- **popularité/adoption** : stars, utilisateurs ou téléchargements observés, avec la source et la période ;
- **croissance/tendance** : évolution entre fenêtres de mesure, comme SANDBOX CHARTS Rising ;
- **benchmark/performance** : résultats d'évaluations identifiées par version, protocole, évaluateur et date ;
- **sélection éditoriale / “meilleurs”** : protocole de test publié, critères, résultats, limites, auteur ou réviseur. Un score de popularité seul ne justifie jamais le libellé « meilleur ».

Une page « meilleurs skills pour Claude Code/Codex/ChatGPT » n'est donc publiable que si les profils identifient la compatibilité réelle et si une méthode éditoriale teste ou évalue les candidats. Les classements GitHub restent présentés comme des classements d'activité/adoption.

### 3. Entités canoniques, faits sourcés, avis séparés

`chart_entities` reste le catalogue d'identités communes (projet, skill, MCP, modèle, agent). Chaque candidat peut recevoir des faits typés — compatibilité plateforme, tâches, licence, capacités, résultats de test — avec URL source, date d'observation, date de vérification et évaluateur. Une affirmation vérifiée n'est pas remplacée par une traduction. Les rangs et scores sont calculés à partir des faits et métriques autorisés par la méthode ; les commentaires éditoriaux restent distincts.

Une page entité traduit le nom d'affichage, le résumé, l'explication et les limites, mais référence la même entité et ses sources canoniques dans toutes les langues.

### 4. Localisation contrôlée

- Les textes français existants gardent leurs URLs actuelles afin de préserver les liens ; le français reste la langue par défaut sans préfixe. Le groupe de routes `(fr)` porte ces pages sans modifier leurs chemins publics.
- Les autres locales utilisent leur tag dans le préfixe : `/en/`, `/de-de/`, `/es-es/`, `/sr-latn-rs/`, `/sr-cyrl-rs/`. Les données de classement restent communes.
- Le routage accepte les locales BCP 47 canoniques dont le code de langue principal est en deux ou trois lettres (ISO 639-1/2/3), avec les sous-tags de script, région et variante. Le registre contient 115 cibles prioritaires issues des langues officielles et nationales européennes et d'un large ensemble de langues régionales ou minoritaires ; il reste extensible.
- Le lancement éditorial apporte le français et une première interface anglaise. Les autres langues peuvent être enregistrées et prévisualisées, mais restent `noindex` tant que les textes de l'interface et le contenu de la page n'ont pas été relus et publiés.
- Les traductions de collection et d'entité restent dans leurs tables typées. `site_content_localizations` porte les variantes de pages, d'épisodes, de thèmes et de fiches, avec le chemin, les métadonnées, les sections, les chapitres, la locale source, le hash source et l'état de relecture.
- Chaque variante publiée possède une URL, un titre, une description et un texte éditorial propres. Les variantes équivalentes sont réciproques dans `hreflang`; les canoniques restent propres à chaque langue ; `x-default` pointe vers l'accueil français.
- L'état de traduction suit `draft → needs_review → reviewed → published`, avec locale source et hash du texte source. Une traduction modifiée repasse en revue. La traduction automatique peut aider à préparer un brouillon mais ne publie ni n'indexe une page seule.

### 5. Barrières d'indexation

Une page de classement ne rejoint le sitemap que si la collection est active, qu'une édition réelle non vide est publiée, que son texte localisé a été relu et publié, que l'interface est relue dans cette langue et que les minima de candidats/éditions définis pour la collection sont atteints. Les pages de contenu suivent le même état éditorial et doivent correspondre à une source publiée dont le hash est courant. Les paramètres de tri et combinaisons de filtres sans texte et méthode propres restent `noindex` et hors sitemap.

Une page « meilleure option » doit indiquer les critères, l'usage testé, les exclusions, les sources, la date de vérification et les limites. Les pages d'entité n'entrent dans le sitemap qu'après une apparition dans une édition réelle ou une publication éditoriale indépendante, avec un texte utile propre.

Les URLs françaises déjà définies dans ADR-0015 sont conservées. Toute évolution de chemin doit définir une redirection 301 et une vérification des anciennes URLs avant mise en production.

## Conséquences

- Le schéma de validation et les migrations additives 0003 et 0004 préparent les collections, textes localisés, contenus de site et preuves sourcées. Les clés `github`, `rising`, `skills` et `models` sont initialisées inactives ; le lien entre édition hebdomadaire et collection est contrôlé par clé étrangère. Les migrations ne sont pas appliquées sur Neon par cette décision.
- Le registre de locales documente 115 cibles européennes prioritaires et accepte les tags BCP 47 canoniques à code de langue ISO 639-1/2/3 sans migration supplémentaire. L'extension technique ne signifie pas que ces traductions sont déjà rédigées.
- Les pages traduites de classements sont servies par une route locale dynamique ; les chemins français historiques restent inchangés. Le sitemap et `hreflang` n'exposent que les versions réellement relues et publiables.
- Les intentions de recherche, routes proposées et priorités sont consignées dans [la feuille de route SEO](../site/seo-roadmap.md). Elles n'incluent pas de volumes inventés ; les volumes, clics, impressions et positions seront validés dans Search Console et un outil de recherche de mots-clés choisi par le propriétaire.
- Les chaînes d'interface sont actuellement relues en français et en anglais ; les traductions UI des autres locales, les fiches de traduction dans le backoffice, les collecteurs Skills/Models, l'application des migrations et l'ouverture de l'indexation restent à réaliser avant un lancement européen complet.
- Suivi au 2026-10-08 : les libellés spécifiques aux classements disposent d'un brouillon dans les 115 cibles du registre, servi par 109 traductions de langue ou d'écriture ; les variantes régionales proches réutilisent leur traduction principale. Les brouillons, particulièrement ceux de langues régionales ou minoritaires, demandent une revue native et ne sont pas approuvés pour l'indexation. Seules les interfaces française et anglaise restent approuvées.
- Aucun classement de qualité n'est affiché tant que les mesures et le protocole correspondant ne sont pas connectés.

## Sources de la décision

- [Google Search Central — gérer les sites multilingues](https://developers.google.com/search/docs/advanced/crawling/managing-multi-regional-sites)
- [Google Search Central — variantes localisées et `hreflang`](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google Search Central — contenu utile, fiable et people-first](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Search Central — fonctionnalités IA et fondamentaux SEO](https://developers.google.com/search/docs/appearance/ai-features)
- [Next.js — internationalisation App Router](https://nextjs.org/docs/app/guides/internationalization)
- [Commission européenne — les 24 langues officielles de l'UE](https://european-union.europa.eu/principles-countries-history/languages_en)
- [Commission européenne — diversité linguistique et plus de 60 langues régionales ou minoritaires](https://translation.ec.europa.eu/languages-eu-why-multilingualism-matters/linguistic-diversity-eu_en)
- [Conseil de l'Europe — langues couvertes par la Charte, état au 9 décembre 2025](https://rm.coe.int/november-2022-revised-table-languages-covered-english-/1680a8fef4)
- [ISO — codes de langue ISO 639](https://www.iso.org/iso-639-language-code)
