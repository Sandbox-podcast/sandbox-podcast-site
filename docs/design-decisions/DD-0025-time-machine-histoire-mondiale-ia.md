# DD-0025 : Time Machine, histoire mondiale de l'IA

Date : 2026-10-15. Décision : décidée par l'agent sur délégation (PD-0003), après la correction explicite de Lou. Remplace DD-0024 pour le périmètre, les données et le Wrapped.

La rubrique `/time-machine` raconte les grandes annonces de l'IA dans le monde depuis 1996. Elle présente les modèles, les produits, les publications scientifiques, les démonstrations et les décisions publiques. Les classements Sandbox ne l'alimentent plus.

Chaque événement conserve sa date, la précision connue (jour, mois ou année), le type de date (annonce, ouverture, publication, événement ou entrée en vigueur), son organisation, son résumé et au moins une source primaire. Une annonce ne vaut pas une disponibilité publique. Les dates imprécises restent affichées avec leur précision réelle. Le corpus est une sélection éditoriale documentée, extensible dans Git ; aucune exhaustivité mondiale n'est promise.

La courbe cumule les événements de la sélection sur un axe temporel proportionnel. Elle ne mesure ni l'intelligence, ni la performance, ni le volume mondial des annonces. Les filtres recalculent le cumul. Les périodes, la recherche, les catégories et la liste chronologique donnent accès aux événements rapprochés. Le clavier, les boutons et le curseur donnent les mêmes accès que le graphique.

Le mouvement accompagne la sélection et la lecture volontaire. La lecture automatique est désactivée au chargement. Le réglage système de réduction du mouvement et le bouton de l'interface arrêtent la lecture et les animations. Le récapitulatif annuel Sandbox Wrapped présente les événements documentés de l'année, sans gagnants calculés à partir des classements. L'année courante reste signalée comme en cours. Les exports conservent les sources et la portée éditoriale.

Le contenu local est validé par Zod et lu sans base de données, collecte au chargement, compte ou service payant. Aucune publication, automatisation, migration, modification des archives de classements, commit ou push n'est inclus.

Complément du 15 octobre 2026, décidé par l'agent sur délégation (PD-0003), à la demande de Lou :

- Deux sélecteurs fixent les années de début et de fin, année unique comprise. Une borne qui dépasse l'autre la déplace. Le graphique recalcule ses dates et son cumul ; une année isolée affiche des mois.
- Les événements sont tous présents dans le HTML initial, regroupés dans des sections annuelles repliables. Les sources restent accessibles sans JavaScript.
- La page devient indexable si son corpus existe. Elle reçoit un titre descriptif, une description, une URL canonique, une image de partage, une entrée sitemap et un JSON-LD CollectionPage, ItemList et BreadcrumbList. Les dates historiques ne sont pas des dates de publication du site.
- Human Quality et Humanizer guident la réduction des textes : retrait des slogans, doublons et explications de provenance répétées. Les faits, les dates et les restrictions d'accès restent.

L'indexation réelle dépend d'une publication ultérieure sur le domaine public. Aucun classement dans les moteurs n'est promis.
