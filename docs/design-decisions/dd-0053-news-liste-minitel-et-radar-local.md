# DD-0053 News : liste Minitel et radar sur le plateau

- Date : 2026-10-18
- Statut : V2 locale après corrections de Lou, automatisation reliée dans le code de la PR ; publication de production encore désactivée
- Origine : demandes directes de Lou et captures du bloc Explorer l'IA et du radar.

## Demandes de Lou

La page d'actualité présente une liste sobre, inspirée du Minitel et d'un relevé radar. Chaque ligne contient seulement une phrase cliquable vers sa source et la date et l'heure réelles de publication. Une carte rejoint Explorer l'IA et un radar cliquable est placé sur l'étagère supérieure du plateau.

## Corrections de Lou et choix de la V2

Le vert est rejeté par Lou. La page adopte le bleu nuit, le blanc et le cyan de SANDBOX, avec des titres de 18 pixels, des dates de 14 pixels et des synthèses de 16 pixels. La chasse fixe reste réservée aux repères et dates. Le fil conserve ses lignes et filets, sans images. Les filtres se déplient à la demande. Choix décidés par l'agent sur délégation (PD-0003), avec le skill UI/UX demandé par Lou.

Le collecteur utilise les pages publiques des dix médias demandés et examine jusqu'à trois liens récents par média. Lors du relevé du 18 octobre, neuf étaient accessibles ; There's An AI For That ne l'était pas et aucun contournement n'a été essayé. Ce constat peut changer. Le tri diversifié alterne les médias. Le fil courant retient quatorze jours de nouvelles et ne garantit pas une couverture exhaustive.

Chaque titre est reformulé, sans préfixe du média. Un clic ouvre un élément HTML natif `details` contenant exactement trois phrases et le lien vers la publication extérieure. Ces textes sont présents dans le HTML initial, même volet fermé. La date est celle de publication ; si l'heure manque, la page le précise. Une fiche nouvelle doit passer les contrôles de citations, de date, de source et de traduction avant de s'afficher. Les corrections éditoriales connues restent prioritaires.

Les noms propres et mots-clés restent dans les titres et synthèses. Les skills `no-ai-slop`, `anti-slop-fr` et `writing:unslop`, demandés par Lou, servent à rédiger et relire. Les trois phrases imposées par Lou priment sur leurs préférences de rythme. La page décrit une collection de liens avec `CollectionPage`, `ItemList` et `BreadcrumbList` ; elle ne s'attribue pas les articles des médias.

L'aperçu local reste réservé au développement avec `SANDBOX_NEWS_PREVIEW=1` et utilise un cache fichier ignoré par Git. Le nouveau flux de production et ses écritures Neon restent désactivés jusqu'à la migration 0016 et aux variables de configuration décrites dans [DD-0057](dd-0057-automatisation-production-news.md).

Le `noindex` local reste actif. La collecte programmée, la génération et les traductions sont maintenant prévues par le code de la PR, mais ne sont pas lancées en production. Les archives et la pagination HTML restent à construire ; aucune position Google n'est garantie.

Le décor original est conservé. Une copie ajoute le radar en laiton à l'emplacement de la petite sphère sur l'étagère supérieure. Le lien est superposé à l'objet, accessible au clavier. Le texte décoratif du plateau ne doit pas intercepter les clics. La troisième carte conserve le traitement photographique des deux cartes existantes.

Lancement et provenance des images : [rapport V1](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/news-v1-local-2026-10-18.md). État actuel et recette : [rapport V2](https://github.com/Sandbox-podcast/sandbox-podcast-resources/blob/main/docs/site/history/2026/10/news-v2-medias-seo-2026-10-18.md).
