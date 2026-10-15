# DD-0024 : Sandbox Time Machine et Sandbox Wrapped

Statut : remplacée par [DD-0025](DD-0025-time-machine-histoire-mondiale-ia.md) après la correction du périmètre par Lou. La Time Machine raconte désormais l'histoire mondiale de l'IA, indépendamment des classements Sandbox.

Date : 2026-10-15. Décision : décidée par l'agent sur délégation (PD-0003), à la demande de Lou. Développement et vérification en localhost.

La rubrique française `/time-machine` complète les classements. Elle compare jusqu'à cinq projets dans les collections GitHub, Skills et modèles IA. La navigation principale française donne accès à cette rubrique ; elle passe sur deux lignes sous 420 pixels pour garder chaque lien lisible. Le sélecteur de langue est masqué sur cette page tant que les autres langues attendent leurs textes relus.

L'interface conserve le bleu nuit, le cyan et les polices du site. Les courbes ont des couleurs distinctes, une légende et un tableau de valeurs. Le score ou le rang, la période et les projets se choisissent dans l'explorateur. Le lecteur rejoue les éditions, avec pause, retour au début et trois vitesses. La lecture ne démarre pas automatiquement. Un curseur et les flèches du clavier donnent accès à chaque édition. Le réglage système de réduction du mouvement et le bouton de l'interface arrêtent les animations.

Les données viennent des éditions archivées de Sandbox Charts. Aucune observation manquante ne devient un zéro ou une mesure interpolée. Les courbes se coupent aux absences. Les cartes de trajectoire calculent les progressions, reculs, absences et présences à la première place. Une absence ne prouve pas l'arrêt d'un projet. Les avis éditoriaux ne sont pas générés.

Le Wrapped se calcule à la demande pour une année et une collection. Le grand gagnant a le plus d'éditions au rang 1. La progression compare le premier et le dernier rang disponibles aux bornes de la période ; les projets absents à une borne sont exclus de ce prix. La surprise est la meilleure progression parmi les projets restants, hors grand gagnant et progression. Les égalités suivent l'ordre alphabétique des identifiants. Les critères sont affichés avec les résultats.

Un bilan annuel complet exige une année terminée, une première édition au plus tard le 7 janvier, une dernière édition au plus tôt le 24 décembre, au moins 350 jours entre les bornes incluses et aucun intervalle supérieur à huit jours entre éditions. Sinon, la couverture reste explicitement partielle ou provisoire. Le visuel SVG exporte les lauréats, leurs courbes, la période et la provenance ; il est autonome, sans script ni ressource distante. Les données JSON exportent les résultats et les dates. Aucun message, publication, tâche planifiée ou accès payant n'est créé.

L'aperçu local volontaire lit les snapshots simulés déjà présents dans le dépôt. Il les identifie dans la page, dans le Wrapped et dans l'export. Ce mode nécessite `NODE_ENV=development` et `SANDBOX_TIME_MACHINE_PREVIEW=1`. Le chemin normal lit le service des classements et exclut les snapshots simulés des données réelles. La rubrique reste en `noindex` pendant sa vérification locale.
