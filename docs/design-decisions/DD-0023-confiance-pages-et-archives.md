# DD-0023 - Confiance dans les pages historiques et les archives

- Date : 2026-10-14
- Statut : acceptée pour l'implémentation locale
- Décision : décidée par l'agent sur délégation (PD-0003).
- Demande : actions A01 et A02 de [l'audit #62](https://github.com/Sandbox-podcast/sandbox-podcast-site/issues/62).

Les anciennes fiches `/projects`, `/models` et `/moves` lisent des snapshots Git simulés. Leur `noindex` ne suffit pas à informer une personne qui ouvre un lien partagé. Une route Skills spécialisée intercepte par ailleurs les dates d'archives comme des noms de plateforme, ce qui explique la 404 de `/charts/skills/2026-10-10`.

Une page dont les mesures ou l'historique utilisent une provenance `mock` affiche un écran "Ancienne page de démonstration", sans chiffre, rang, courbe ni avis simulé. Elle conserve sa réponse 200 et son canonical pour informer les personnes qui ont un ancien lien, avec des liens vers les classements et les podcasts. Ses métadonnées imposent `noindex` selon la provenance, indépendamment du mode global. Ses images de partage sont également neutralisées. Les fixtures restent intactes dans Git. Aucune redirection vers une fiche supposée équivalente n'est inventée.

Les dates et semaines ISO de `/charts/skills/[segment]` utilisent le rendu et les métadonnées des archives. Les noms de plateforme gardent le catalogue spécialisé. La méthode Skills a une route explicite. Les routes partagées entre langues appliquent le même choix. Une archive affiche d'abord la date de son chemin, même si une édition plus récente existe. Une date sans édition reste en 404.

Le sitemap exclut les fiches historiques simulées. Son contrôle HTTP réutilisable exige une réponse 200 sans redirection, une page HTML indexable et un canonical unique correspondant à l'URL annoncée. Il contrôle toutes les entrées, y compris après une erreur, et refuse les doublons ou URL hors domaine.

Un avertissement au-dessus des faux chiffres a été écarté : il laisse circuler les chiffres et leurs cartes de partage. La suppression des fixtures a aussi été écartée : elles servent aux tests et ne sont pas des données publiées à corriger.

La publication, les commits et les pushes restent soumis au propriétaire. Aucun changement de score, de méthode de calcul ou d'édition réelle n'est inclus. Les questions de dates et méthodes de l'action A03 restent séparées.

Voir [le rapport et les vérifications](../site/confiance-parcours-2026-10-14.md).
