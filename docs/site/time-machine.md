# Sandbox Time Machine

Parcours simplifié le 19 octobre : choix d'année près de la chronologie, sélection explicite par clic, tactile ou clavier, archives récentes en premier. Le survol ne change plus l'événement ouvert. Les filtres avancés et le Wrapped sont conservés. Voir [DD-0063](../design-decisions/dd-0063-stabilisation-des-classements-news-et-time-machine.md) et le [rapport d'audit](audit-stabilisation-2026-10-19.md) pour les sources et les recettes.

Route locale : [Time Machine](http://127.0.0.1:3000/time-machine). Décision : [DD-0027](../design-decisions/DD-0027-time-machine-histoire-mondiale-ia.md).

## Lancement

    pnpm --filter @podcast/site dev:time-machine

Le serveur écoute sur 127.0.0.1:3000. Un autre port se choisit avec -- --port=3300. La rubrique fonctionne sans base de données et sans dépendre des classements Sandbox.

## Corpus

Mise à jour du 18 octobre 2026 : 162 événements, dont 52 en 2026. La page ouvre le dernier événement documenté, le 17 octobre. Voir [les ajouts et leur validation](time-machine-2026-10-18.md). Les relevés du 15 et du 16 octobre ci-dessous décrivent les versions précédentes.

apps/site/content/ai-history.json contient 151 événements, 56 jalons et 156 références primaires distinctes. La revue du 15 octobre 2026 ajoute 53 événements. Derniers événements documentés : 14 octobre 2026. La sélection mondiale couvre 1996-2026.

La reprise couvre les agents persistants (Grok Bot, Team Bots, Dots et Muse), les modèles récents (GPT-6.1 Sol, Claude 5.5, Gemini 4 Argon, Muse Wonder, Mistral Large 4, Qwen3.8-Max et GLM-5.3) et les annonces du 8 au 14 octobre. Elle porte le nombre d'événements de 2026 de 8 à 41.

Le volet scientifique comprend Navier-Stokes, la conjecture jacobienne, les distances unité d'Erdős, les publications OpenAI Math, AlphaProof, Aletheia, AlphaTensor, AlphaDev et FunSearch. Il couvre aussi les protéines, la génomique, les antibiotiques, un essai clinique de phase 2a, les matériaux, le contrôle du plasma, la météo et la robotique.

Les annonces et publications primaires ont été consultées auprès d'OpenAI, xAI, Anthropic, Google, Meta, Mistral, Qwen, Z.ai, Ai2, du MIT, de Nature, du Clay Mathematics Institute, de Terence Tao et d'Artificial Analysis. Leurs liens sont conservés dans les fiches. Les index d'actualité servent à repérer les événements ; une revue au 15 octobre ne crée pas d'annonce fictive datée du 15. Aucune annonce du 15 octobre suffisamment documentée n'a été retenue dans cette passe.

La couverture vise les grandes annonces et les avancées scientifiques, sans garantir l'inventaire de toutes les publications mondiales. Les annonces de recrutement, les témoignages clients, les rumeurs et les variantes sans apport distinct ne sont pas ajoutés systématiquement. Une future mise à jour doit reprendre chaque famille et chaque éditeur, puis vérifier les corrections scientifiques ; ajouter seulement les modèles cités dans la demande laisse des lacunes.

Chaque événement conserve un identifiant, l'organisation, la catégorie, un résumé, un contexte et ses sources HTTPS. Sa date garde la précision disponible : jour, mois ou année. Son type distingue annonce, ouverture, publication scientifique, événement et entrée en vigueur. Une annonce ne garantit pas un accès public ; les fiches précisent les restrictions connues.

Pour compléter le corpus, ajouter l'événement avec sa source et son type de date. Ne pas déduire un jour d'une conférence ni transformer une annonce en sortie publique. Zod refuse les dates invalides, identifiants dupliqués, sources non HTTPS et dates postérieures à la vérification.

En sciences, conserver les conditions du résultat : Navier-Stokes avec force extérieure lisse et preuve proposée, cas de dimension deux encore ouvert pour la conjecture jacobienne dans la source retenue, fonction des enzymes ART encore à établir, essais précliniques ou cliniques distincts d'une autorisation de traitement. La mise en ligne d'un manuscrit ou d'une formalisation Lean ne vaut pas attribution d'un prix ni validation indépendante de toutes les affirmations.

## Navigation

La courbe cumule les événements retenus sur un axe temporel proportionnel. Elle ne mesure pas les performances de l'IA.

Les sélecteurs De / à acceptent toute plage de 1996 à 2026, année unique comprise. Une borne qui croise l'autre la déplace. Toutes les années rétablit l'étendue sans retirer les autres filtres ; Tout l'historique réinitialise tout. Les périodes prédéfinies, catégories, recherche et jalons majeurs se combinent. Une année isolée affiche les mois ; une année vide affiche un état vide.

Le clic, le clavier, le curseur et les boutons parcourent les événements. La liste complète est regroupée par année dans des sections repliables. Tous les événements et leurs sources figurent dans le HTML initial, sans pagination ni chargement supplémentaire.

La lecture volontaire propose pause, retour au début et vitesses 0,5x, 1x et 2x. Le réglage système de réduction du mouvement et le bouton Motion arrêtent les animations. Sur mobile, la courbe défile dans son cadre et la fiche passe dessous.

Sandbox Wrapped récapitule une année et signale l'année en cours. Ses exports SVG et JSON conservent les sources. Le SVG est autonome, sans script ni ressource distante.

## SEO et textes

Le titre et le H1 nomment l'histoire de l'intelligence artificielle. La page possède une description, une URL canonique, une image Open Graph / Twitter de 1200 x 630, une entrée sitemap datée de la vérification et des liens internes. Un corpus vide reste en noindex.

Le JSON-LD décrit CollectionPage, ItemList et BreadcrumbList. Tous les événements pointent vers leurs ancres HTML et citent les sources. temporalCoverage conserve la précision historique ; aucune datePublished fictive ni balise Event ou FAQ n'est ajoutée.

Le rendu serveur suit les recommandations de [Google sur les contenus chargés progressivement](https://developers.google.com/search/docs/crawling-indexing/javascript/lazy-loading). Le balisage respecte les [règles de données structurées](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) et [CollectionPage](https://schema.org/CollectionPage).

Human Quality et Humanizer ont réduit les slogans, répétitions et contextes trop longs. Aucun bloc de texte supplémentaire n'est ajouté pour répéter les mots-clés.

En local, les URL utilisent l'origine configurée du site. La configuration de production utilise le domaine public Sandbox. L'indexation demande une publication ultérieure ; aucun résultat de positionnement n'est garanti.

## Fichiers et validation

- content/ai-history.json : corpus.
- src/domain/time-machine.ts, time-machine-seo.ts et time-machine-export.ts : dates, filtres, courbe, SEO et exports.
- src/lib/time-machine.ts : lecture et validation.
- src/components/time-machine.tsx, time-machine-chart.tsx et time-machine.module.css : interface.
- src/app/(fr)/time-machine/ et src/app/sitemap.ts : route, métadonnées, partage et sitemap.
- test/time-machine*.test.ts et published-episode-route.test.ts : corpus, filtres, rendu serveur, JSON-LD, sitemap et export.

Commandes : pnpm check puis pnpm --filter @podcast/site exec next build --webpack. Les preuves navigateur sont dans apps/site/.local/time-machine/, hors Git.

Validation initiale du 15 octobre 2026, avant cet enrichissement : pnpm check passe, avec 76 fichiers et 472 tests. Le build Webpack passe, avec 215 pages statiques. Le HTML généré contient alors les 98 articles, leurs 98 liens de source et le JSON-LD.

Le navigateur confirme les plages d'années, l'année unique, le croisement des bornes, les filtres combinés, l'état vide, les archives, le clavier et la lecture. Aucun débordement à 390 et 320 pixels. Après redémarrage, la page répond en 200, le filtre 2023-2024 affiche 29 événements et la console ne signale aucune erreur. L'image de partage répond en PNG 1200 x 630 et a été inspectée. Le sitemap inclut la route avec la date du 15 octobre. Le vérificateur Human Quality ne signale aucun caractère interdit dans les textes de la rubrique.

L'indexation publique reste à vérifier après publication. Aucune publication, automatisation, dépense, migration, commit ou push n'est inclus.

### Vérification de l'enrichissement du 15 octobre

Le corpus passe à 151 événements, 56 jalons majeurs et 156 URL de sources primaires. Les tests vérifient les nouvelles annonces, leur recherche, leur présence dans Wrapped et les limites des résultats scientifiques. `pnpm test` passe : 92 fichiers et 592 tests du site, 7 tests de l'introduction et 4 tests des jingles. Le lint global et le formatage des fichiers de ce lot passent. Le vérificateur Human Quality passe sur le corpus et la documentation.

Le script `apps/site/scripts/test-time-machine-update.mjs` vérifie dans Edge les 151 articles, la revue au 15 octobre, les 41 événements de 2026 et six recherches (Grok Bots, Dots, 6.1 Sol, millénaire, CRISPR, HiRO), à 320, 390 et 1440 pixels. Aucun débordement ni erreur JavaScript sur le parcours final. Les captures et le rapport sont dans `apps/site/.local/time-machine-update/`, hors Git. Pour le lancer, renseigner `SANDBOX_PLAYWRIGHT_PATH` si Playwright est fourni par le runtime Codex, puis exécuter `node apps/site/scripts/test-time-machine-update.mjs` avec le serveur local sur le port 3000.

Le contrôle complet `pnpm check` a été lancé mais reste bloqué par le formatage de fichiers extérieurs à ce lot, dont des fins de ligne CRLF du checkout Windows. La compilation Webpack réussit sa phase de compilation puis échoue au typage de `searchParams` dans les pages `charts/rising/methodology` et `charts/skills/methodology`. Ces limites empêchent de déclarer le build global validé.

### Interface illustrée du 16 octobre 2026

La fiche illustrée passe avant la courbe. Le titre court, la date et le résumé restent visibles ; le contexte et les sources se déplient. La courbe cumulative reste accessible au clavier dans un volet secondaire. Les archives annuelles et les jalons du récapitulatif utilisent les mêmes illustrations de concept.

Les 151 événements conservent leur texte complet et toutes leurs sources dans le HTML initial. Un fond étoilé accompagne les changements de date et s'arrête lorsque les animations sont réduites. Voir [DD-0043](../design-decisions/dd-0043-time-machine-inventions-illustrees.md) et [le rapport d'interface](refonte-2026-10-15/time-machine-illustree-v13.md).
