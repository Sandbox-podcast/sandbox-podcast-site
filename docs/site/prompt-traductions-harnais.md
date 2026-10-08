# Traduire SANDBOX depuis le harnais

La traduction se déclenche à la demande dans le harnais, selon le choix de Lou du 8 octobre 2026. Publier depuis l’admin ne lance aucune génération. Les textes de l’interface restent dans des fichiers JSON locaux ; les textes produits dans le harnais peuvent être importés dans l’admin pour être conservés dans Neon et servis sans redéploiement.

## Prompt à copier

```text
Traduis les textes SANDBOX en LANGUE_CIBLE en appliquant docs/site/traductions-locales.md et ce workflow.

Si je joins un export JSON de l’admin, utilise-le comme source du contenu publié. Sinon, travaille sur les données locales du dépôt et signale que la production n’a pas été lue. Le contenu éditorial actuel est simulé ; les classements de production sont réels. Conserve les mentions de démonstration présentes dans les sources.

Depuis apps/site, mets à jour le catalogue puis prépare un lot :
node scripts/localization-catalog.mjs
node scripts/localization-work.ts prepare --locale LANGUE_CIBLE --source CHEMIN_EXPORT_JSON --limit 80
Omet --source si aucun export n’a été fourni.

Lis le fichier .local/translations/LANGUE_CIBLE_EN_MINUSCULES-work.json. Traduis chaque champ text en te servant du champ context pour retrouver la page. Garde les champs source, sourceHash, locale et version. Certains libellés source sont déjà anglais : traduis depuis leur langue réelle.

Préserve les noms propres, noms de produits, slugs, URLs, nombres, paramètres {count}, références [[entity:...]], [[chart:...]], [[episode:...]], [[story:...]] et code entre accents graves. Ne modifie ni les médias, ni les scores, ni les mesures, ni les dates des classements. N’ajoute pas de faits et ne transforme pas un contenu mock en contenu réel. Les fragments de balisage et leur version complète doivent être cohérents.

Valide chaque lot avec :
node scripts/localization-work.ts validate --source CHEMIN_EXPORT_JSON --file CHEMIN_LOT_TRADUIT
Puis complète le dictionnaire local avec :
node scripts/localization-work.ts import --source CHEMIN_EXPORT_JSON --file CHEMIN_LOT_TRADUIT

Conserve une copie de chaque lot terminé avant de préparer le suivant : prepare remplace le fichier de travail. Recommence jusqu’à ce que prepare annonce zéro texte manquant pour cette langue. Pour une demande portant sur toutes les langues, travaille successivement sur les 114 cibles hors français. Ne remplis pas une langue avec du français ou de l’anglais pour masquer un manque. Si tu ne sais pas traduire une langue avec assez de fiabilité, garde ses entrées manquantes et signale précisément lesquelles nécessitent une revue native.

Livre les JSON terminés pour l’import dans l’admin, ainsi que les fichiers locaux modifiés. Valide avec pnpm check et un build du site. Vérifie les pages, les métadonnées, la recherche, les ancres, les assets, les textes longs et le sens RTL dans le navigateur. Donne la couverture réelle par langue et les langues restant à relire. La validation du format ne constitue pas une revue linguistique.

Ne contacte aucun service externe de traduction et ne crée pas de compte. Ne publie pas en production, ne pousse pas Git et ne change pas l’indexation sans autorisation explicite.
```

Remplacer `LANGUE_CIBLE` par le tag du registre, par exemple `en`, `de-DE`, `es-ES` ou `sr-Cyrl-RS`. Les noms de fichiers utilisent les minuscules : `de-de-work.json`. La commande `prepare --locale all` prépare le premier lot des 114 cibles ; la traduction et la revue restent à effectuer.

## Avec un contenu publié depuis l’admin

1. Dans le Studio éditorial, ouvrir « Traductions · génération dans le harnais ». Choisir la langue et télécharger les textes. L’export contient les sources publiées, leurs empreintes et le dictionnaire déjà disponible dans cette langue. Un épisode en brouillon n’est pas exporté.
2. Joindre ce JSON dans le harnais et envoyer le prompt ci-dessus. Le harnais complète les fichiers locaux et fournit un ou plusieurs lots traduits. Il ne publie pas lui-même le résultat.
3. Dans le même panneau, choisir un lot traduit puis « Importer les traductions ». L’import est réservé au rôle admin. L’API vérifie les empreintes contre le contenu publié actuel, les paramètres, les liens, les nombres et le format avant toute écriture. Un fichier périmé doit être repris depuis un nouvel export.
4. Ouvrir la même page dans la langue cible et relire. Les traductions importées remplacent les entrées correspondantes du dictionnaire local. Une correction peut être réimportée. Les contenus et médias source restent communs.

Un import accepte une seule langue et au maximum 1,5 Mo. Il peut couvrir un lot partiel. Les lots de 80 textes facilitent la relecture et restent généralement sous cette limite ; réduire la taille pour les descriptions longues. Une importation invalide ne modifie aucune traduction. Les anciens textes ne sont pas réutilisés pour un texte modifié : sa nouvelle empreinte est différente.

## Mise en service pour le propriétaire Neon

Appliquer la migration additive `apps/site/drizzle/0006_manual_content_translations.sql` après les migrations existantes avec `pnpm --filter @podcast/site db:migrate`. Elle ajoute seulement `site_translation_messages` ; aucune table existante n’est remplacée. Sauvegarder la base avant migration et vérifier d’abord en Preview.

Le site utilise les variables Postgres et les comptes admin déjà prévus par ADR-0017 et ADR-0018. Aucun compte de traduction, aucune clé IA et aucun cron supplémentaire ne sont requis. En local, les imports sont enregistrés dans `apps/site/.local/translations/published.json`, ignoré par Git. Sur Vercel, Neon est requis pour les imports durables : les fichiers du déploiement ne sont pas réécrits.

Vérification de Preview : publier un épisode de test, exporter ses textes, traduire un petit lot dans le harnais, l’importer avec un compte admin, puis consulter la page traduite. Tester aussi un compte viewer/editor (import refusé), un fichier périmé et une correction réimportée. Le contenu français, les métriques et les illustrations doivent rester identiques.

La migration a été testée dans PGlite ; son exécution dans Neon et la publication Vercel restent à effectuer par le propriétaire. Les variantes traduites restent `noindex` jusqu’à la revue éditoriale prévue dans ADR-0020.
