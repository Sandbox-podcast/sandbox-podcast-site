# DD-0016 : identité et ordre des slides de l'épisode 002

- Date : 2026-10-13
- Statut : accepté pour l'aperçu local, validation visuelle avec Lou en cours.
- Ordre et identité demandés par Lou. Réalisation HTML décidée par l'agent sur délégation (PD-0003).

L'épisode 002 reprend l'interface de l'épisode 001 : logo, typographie, fonds, commandes de navigation et barre de progression. Le logo est le fichier original `episode-001/assets/sandbox-logov2.png`. Il reste visible sur toutes les slides. Aucun logo recréé en texte ou intégré à une image de slide ne le remplace.

Ordre du support principal :

1. LE RADAR, identique à la slide 1 de l'épisode 001.
2. Une actualité Radar sur les modèles Muse Wonder, ajoutée par Lou : annonce du 12 octobre 2026, agents de code longue durée, usage de l'ordinateur, contexte annoncé d'un million de tokens et modalités d'accès distinctes pour Muse Wonder et Muse Wonder Full. La slide renvoie à [l'annonce de Meta AI Research](https://research.meta.ai/blog/muse-wonder) et à [la fiche modèle donnée par Lou](https://dev.meta.ai/models/muse-wonder).
3. LE BUILD, identique à la slide 9 de l'épisode 001, conformément au lien fourni par Lou.
4. Les cinq slides Bêta demandées par Lou : sujet, usages et ROI, outils, méthode et exemples, questions en commentaire.
5. LE CLASH, identique à la slide 18 de l'épisode 001.
6. Les quatre questions du Clash demandées par Lou : besoin de lire les tickets, intérêt de sauver le legacy à l'ère de l'IA, relecture du code généré et besoin futur de développeurs qui savent coder. Une seule question apparaît sur chaque slide, sans sous-question ni sous-titre. La quatrième question justifie une slide de plus.

Le support comporte 13 slides. Les anciennes annexes ne font plus partie du parcours. La recherche sur les huit usages est conservée dans les notes de la deuxième slide Bêta et dans [l'analyse du sujet](../site/episode-002-beta-artisans-commercants.md). Les notes et la simulation du Comptoir d'Anna restent consultables en local.

Les contenus Bêta et Clash sont en HTML pour conserver le vrai logo et permettre les retouches. La simulation s'ouvre dans un cadre `sandbox="allow-scripts allow-forms"` sans origine partagée. Les formulaires peuvent déclencher leurs traitements locaux ; la CSP interdit les connexions réseau et les soumissions externes avec `connect-src 'none'` et `form-action 'none'`. L'épisode 001 reste la référence intacte.

Cette décision ne publie rien. La PR sera créée après validation des retouches avec Lou.
