# DD-0006 : Pages partagées et traductions locales

- Date : 2026-10-08
- Statut : implémentation locale, traductions en cours
- Conception : décidée par l'agent sur délégation (PD-0003)
- Mode de traduction : fichiers locaux, choisi par Lou

Mise à jour du 2026-10-09 : le sélecteur à 115 langues et la recherche décrits ci-dessous sont remplacés par les quatre choix de [DD-0010](DD-0010-quatre-langues-du-site.md). Les pages partagées et les fichiers locaux sont conservés.

Le changement de langue doit ouvrir la même ressource avec les mêmes contenus, sections, médias et interactions. L'ancien accueil anglais utilisait une page simplifiée indépendante, ce qui supprimait les couvertures, les fiches et une partie de la navigation.

Les 24 modèles de routes publiques utilisent désormais les composants français communs. Un dictionnaire local traduit leurs textes visibles et leurs attributs accessibles. Les slugs, identifiants, classements, mesures, sources et fichiers médias restent communs. Les liens internes et les formulaires conservent le préfixe de langue. Le sélecteur garde la page courante, les paramètres de recherche et l'ancre.

Le bouton ouvre une liste consultable des 115 langues du registre. Chaque langue affiche son nom natif et le drapeau associé à la région de sa locale. Les langues sans région utilisent un globe. La recherche reconnaît les noms natifs, français, anglais et les codes de langue. Le menu se ferme avec Échap, son bouton de fermeture ou un clic extérieur.

Les dictionnaires résident dans `apps/site/src/i18n/dictionaries/`. Seul celui de la langue demandée est chargé côté serveur, puis transmis aux composants qui affichent le texte. Aucun service de traduction n'est appelé à l'affichage. Le catalogue des textes permet de compléter les fichiers et de retrouver leurs sources.

La sélection du classement, de la semaine, de la période, de la catégorie et de la vue modèle est conservée dans les paramètres de l'URL. Ces valeurs sont validées côté serveur. Les combinaisons de filtres restent hors indexation.

La bibliothèque de podcasts conserve aussi la recherche, le thème et l'ordre de tri dans l'URL. Le changement de langue retrouve ces valeurs. Une recherche utilise les textes français et leurs traductions dans la langue affichée.

L'anglais reçoit les traductions éditoriales des épisodes, fiches et pages publiques existantes. Les dictionnaires des autres langues contiennent les brouillons de classement existants ; les commandes communes ont été étendues dans 26 langues. Cela ne constitue pas une traduction intégrale des 115 langues. Un texte absent conserve son original français afin de garder tout le contenu accessible. La couverture doit être complétée puis relue avant publication internationale.

Les pages localisées partagées restent `noindex` pendant cette préparation, conformément à ADR-0020. L'administration conserve son parcours français et ses contrôles serveur. Le sélecteur public y est masqué puisque les routes d'administration traduites n'existent pas.

Les ressources proviennent des mêmes données éditoriales que le français, y compris quand un épisode est publié depuis le backoffice. Un nouveau texte doit recevoir une entrée de dictionnaire pour être traduit. L'outil de catalogue conserve les traductions déjà rédigées.

Lou précise que les traductions seront déclenchées manuellement dans le harnais. L’admin exporte les textes publiés et importe les lots produits par ce workflow. Les fichiers locaux restent la base ; les imports de production sont conservés dans Neon. Voir [ADR-0022](../adr/ADR-0022-traductions-manuelles-depuis-le-harnais.md) et [le prompt prêt à copier](../site/prompt-traductions-harnais.md).

Voir [le guide de traduction](../site/traductions-locales.md) pour la mise à jour des textes et les limites connues.
