# DD-0004 : SANDBOX CHARTS et sa fabrique éditoriale

Date : 2026-10-07. Décision : décidée par l'agent sur délégation (PD-0003), selon le brief graphique du propriétaire.

La page `/charts` devient SANDBOX CHARTS, avec quatre entrées : GitHub, Skills, Models et Rising. Elle conserve Archivo, les chiffres en monospace, le bleu nuit, le cyan et les variables du thème rouge existant.

Le titre, la semaine ISO et le mois ouvrent la page. Un podium commun met le premier projet en avant, puis les lignes affichent rang, mouvement, nom, métrique principale et courbe. Chaque ligne se déplie sur la description, les données, les commentaires signés, les usages, les sources et l'historique. Un filtre conserve le rang d'origine, y compris dans le podium.

Les périodes longues montrent un indice de présence aux meilleures places, expliqué dans l'interface. Le mois est celui du lundi de l'édition. Les vues par capacité des modèles utilisent les dimensions disponibles ; une vue sans mesure reste désactivée.

Les mouvements, la watchlist éditoriale, les signaux sectoriels, l'édition mensuelle, les records et les archives complètent la lecture. Les avis absents ne sont pas générés. Les courbes gardent les trous de données. Les liens podcast apparaissent lorsqu'un épisode réel référence la semaine.

Le mode 16:9 concentre la page sur le podium. Les cartes de partage se génèrent localement dans cinq formats ; elles incluent une mention de fixtures dans l'aperçu. Le bloc newsletter renvoie au service configuré. Sans ce service, l'inscription reste désactivée.

Sur mobile, les contrôles et filtres se parcourent horizontalement dans leur propre zone. Le rang, le mouvement, le nom et la métrique principale restent visibles. Les informations secondaires passent dans le détail.

Dans `/admin`, la fabrique des charts distingue collectes, dépôts, candidats, édition hebdomadaire et méthode. Le rédacteur voit les positions en lecture seule, édite ses textes et peut les prévisualiser. Les rôles existants gardent leurs droits côté serveur : lecture, brouillon ou publication. L'ancien document Markdown reste accessible pour les définitions et archives locales.
