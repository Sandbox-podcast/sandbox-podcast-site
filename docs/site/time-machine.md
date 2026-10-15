# Sandbox Time Machine

Route locale : [Time Machine](http://127.0.0.1:3000/time-machine). Décision : [DD-0027](../design-decisions/DD-0027-time-machine-histoire-mondiale-ia.md).

## Lancement

    pnpm --filter @podcast/site dev:time-machine

Le serveur écoute sur 127.0.0.1:3000. Un autre port se choisit avec -- --port=3300. La rubrique fonctionne sans base de données et sans dépendre des classements Sandbox.

## Corpus

apps/site/content/ai-history.json contient 98 événements, 28 jalons et 102 références primaires distinctes, vérifiés le 15 octobre 2026. Dernier événement : 7 octobre 2026. La sélection mondiale couvre 1996-2026 et reste non exhaustive.

Chaque événement conserve un identifiant, l'organisation, la catégorie, un résumé, un contexte et ses sources HTTPS. Sa date garde la précision disponible : jour, mois ou année. Son type distingue annonce, ouverture, publication scientifique, événement et entrée en vigueur. Une annonce ne garantit pas un accès public ; les fiches précisent les restrictions connues.

Pour compléter le corpus, ajouter l'événement avec sa source et son type de date. Ne pas déduire un jour d'une conférence ni transformer une annonce en sortie publique. Zod refuse les dates invalides, identifiants dupliqués, sources non HTTPS et dates postérieures à la vérification.

## Navigation

La courbe cumule les événements retenus sur un axe temporel proportionnel. Elle ne mesure pas les performances de l'IA.

Les sélecteurs De / à acceptent toute plage de 1996 à 2026, année unique comprise. Une borne qui croise l'autre la déplace. Toutes les années rétablit l'étendue sans retirer les autres filtres ; Tout l'historique réinitialise tout. Les périodes prédéfinies, catégories, recherche et jalons majeurs se combinent. Une année isolée affiche les mois ; une année vide affiche un état vide.

Le clic, le clavier, le curseur et les boutons parcourent les événements. La liste complète est regroupée par année dans des sections repliables. Tous les événements et leurs sources figurent dans le HTML initial, sans pagination ni chargement supplémentaire.

La lecture volontaire propose pause, retour au début et vitesses 0,5x, 1x et 2x. Le réglage système de réduction du mouvement et le bouton Motion arrêtent les animations. Sur mobile, la courbe défile dans son cadre et la fiche passe dessous.

Sandbox Wrapped récapitule une année et signale l'année en cours. Ses exports SVG et JSON conservent les sources. Le SVG est autonome, sans script ni ressource distante.

## SEO et textes

Le titre et le H1 nomment l'histoire de l'intelligence artificielle. La page possède une description, une URL canonique, une image Open Graph / Twitter de 1200 x 630, une entrée sitemap datée de la vérification et des liens internes. Un corpus vide reste en noindex.

Le JSON-LD décrit CollectionPage, ItemList et BreadcrumbList. Les 98 éléments pointent vers leurs ancres HTML et citent les sources. temporalCoverage conserve la précision historique ; aucune datePublished fictive ni balise Event ou FAQ n'est ajoutée.

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

Validation du 15 octobre 2026 : pnpm check passe, avec 76 fichiers et 472 tests. Le build Webpack passe, avec 215 pages statiques. Le HTML généré contient les 98 articles, leurs 98 liens de source et le JSON-LD.

Le navigateur confirme les plages d'années, l'année unique, le croisement des bornes, les filtres combinés, l'état vide, les archives, le clavier et la lecture. Aucun débordement à 390 et 320 pixels. Après redémarrage, la page répond en 200, le filtre 2023-2024 affiche 29 événements et la console ne signale aucune erreur. L'image de partage répond en PNG 1200 x 630 et a été inspectée. Le sitemap inclut la route avec la date du 15 octobre. Le vérificateur Human Quality ne signale aucun caractère interdit dans les textes de la rubrique.

L'indexation publique reste à vérifier après publication. Aucune publication, automatisation, dépense, migration, commit ou push n'est inclus.
