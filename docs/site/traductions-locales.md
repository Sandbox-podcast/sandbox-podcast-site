# Traductions locales de SANDBOX

Les pages publiques partagent leurs composants et leurs données dans les quatre langues du site : Français, Anglais, Espagnol et Allemand. Le français utilise les chemins existants ; les autres langues utilisent `/en`, `/es-es` et `/de-de`. Le sélecteur montre seulement ces quatre choix, selon [DD-0010](../design-decisions/DD-0010-quatre-langues-du-site.md).

## Fichiers

- `apps/site/src/i18n/dictionaries/*.json` : un objet de traductions par langue. Chaque clé est le texte source ; chaque valeur est sa traduction. La source est généralement française, avec certains libellés anglais issus du design des charts.
- `apps/site/src/i18n/dictionaries/source-catalog.json` : textes à traduire avec leurs fichiers sources.
- `apps/site/scripts/localization-catalog.mjs` : extraction et mise à jour du catalogue, sans appel réseau.
- `apps/site/scripts/localization-report.mjs` : nombre d'entrées remplies et liste des textes manquants par langue.
- `apps/site/scripts/localization-work.ts` : préparation, validation et import des lots traduits dans le harnais.
- `apps/site/src/i18n/page-routes.ts` : correspondance entre les 24 modèles de routes publiques.
- `apps/site/src/components/shared-pages.tsx` : utilisation des pages communes dans les routes localisées.

Exemple de dictionnaire anglais :

```json
{
  "Choisir une langue": "Choose a language",
  "{count} épisodes trouvés": "{count} episodes found",
  "Lire la vidéo : {title}": "Play video: {title}"
}
```

Les paramètres entre accolades doivent être conservés. Ils peuvent changer de position dans la traduction. Les valeurs, noms de projet, scores, dates de mesure, slugs et URLs ne doivent pas être inventés ni remplacés. Les textes sont rendus comme texte React, sans interprétation HTML.

## Mise à jour

Depuis `apps/site` :

```powershell
node scripts/localization-catalog.mjs
node scripts/localization-report.mjs
node scripts/localization-report.mjs --locale=de-DE --missing
```

La génération est lancée manuellement dans le harnais avec [le prompt prêt à copier](prompt-traductions-harnais.md). La publication depuis le backoffice ne déclenche aucun appel de traduction. L’admin permet d’exporter les textes publiés, puis d’importer les JSON produits dans le harnais. Le serveur refuse les sources périmées et vérifie les liens, les nombres et les paramètres avant l’import.

Le script conserve les traductions présentes et prépare seulement les entrées manquantes. Une nouvelle publication apparaît dans toutes les langues avec les mêmes assets ; son nouveau texte garde sa source en attendant le lot traduit. Le titre, le résumé, la description, les chapitres et les ressources d’un épisode sont tous extraits. Les textes des éditions de classements publiées sont inclus, tandis que leurs mesures restent communes.

En local, les imports manuels sont enregistrés dans `.local/translations/published.json`. En production, ils résident dans Neon après la migration additive 0006 ; les traductions locales des fichiers Git restent la base et les imports s’y ajoutent. Aucun service de traduction, clé IA ou cron supplémentaire n’est requis. Voir [ADR-0022](../adr/ADR-0022-traductions-manuelles-depuis-le-harnais.md).

Le rapport compte les entrées présentes ; ce nombre ne valide ni leur qualité ni leur relecture. Les noms propres, noms de produits et références techniques peuvent garder la même valeur dans le dictionnaire. Les paramètres numériques `count`, `number`, `size`, `score` et `delta` acceptent des nombres ; `rank` et `poolRank` acceptent aussi les ordinaux français utilisés par les calculs. Les phrases spécifiques sont traitées avant les modèles génériques de ponctuation.

Les dates visibles sont formatées avec `Intl` et le fuseau UTC.

## Couverture actuelle

Le français est la source. Le dictionnaire anglais contient les traductions des textes éditoriaux existants et de l'interface publique. Les dictionnaires espagnol et allemand contiennent les commandes principales et les libellés des classements.

Ces deux dictionnaires restent partiels. Les phrases absentes restent françaises ; une revue native reste nécessaire pour les longs textes éditoriaux.

Les pages partagées localisées restent `noindex`. L'ouverture de l'indexation nécessite une couverture complète de la page, une revue éditoriale et la publication autorisée décrites dans ADR-0020.

## Vérification

```powershell
pnpm check
pnpm --filter @podcast/site build
```

Le test `localization.test.ts` vérifie les chemins dans les quatre langues, la conservation des paramètres et ancres, les routes précises, les dictionnaires disponibles, les assets de l'accueil, les chapitres et ressources d'un épisode, ainsi que la recherche dans les titres anglais.

Dans le navigateur, vérifier aussi le menu, Échap, une fiche podcast, une archive de classement et le menu sur un écran de téléphone. Vérifier les textes longs en espagnol et en allemand.
