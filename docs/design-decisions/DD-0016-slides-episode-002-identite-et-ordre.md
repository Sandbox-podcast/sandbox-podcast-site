# DD-0016 : identité et ordre des slides de l'épisode 002

- Date : 2026-10-14
- Statut : accepté pour l'aperçu local, validation visuelle avec Lou en cours.
- Ordre et identité demandés par Lou. Réalisation HTML décidée par l'agent sur délégation (PD-0003).

L'épisode 002 reprend l'interface de l'épisode 001 : logo, typographie, fonds, commandes de navigation et barre de progression. Le logo est le fichier original `episode-001/assets/sandbox-logov2.png`. Il reste visible sur toutes les slides. Aucun logo recréé en texte ou intégré à une image de slide ne le remplace.

Ordre du support principal :

1. LE RADAR, identique à la slide 1 de l'épisode 001.
2. Muse Wonder, actualité ajoutée par Lou : annonce du 12 octobre 2026, agents de code longue durée, usage de l'ordinateur, contexte annoncé d'un million de tokens et modalités d'accès distinctes pour Muse Wonder et Muse Wonder Full. La slide renvoie à [l'annonce de Meta AI Research](https://research.meta.ai/blog/muse-wonder) et à [la fiche modèle donnée par Lou](https://dev.meta.ai/models/muse-wonder).
3. Gemini 4 Argon : modèle de pointe annoncé par Google, avec les modalités de disponibilité et de performance attribuées à l'entreprise.
4. Auto-réplication : résultats d'évaluations contrôlées d'Anthropic présentés comme un risque prospectif, sans affirmer qu'un ver IA soit déjà actif dans la nature.
5. Actions imprévues de Claude : cas rapportés par Anthropic en interne et en évaluation, en conservant son appréciation d'un impact limité et le contexte de persistance quand l'agent est bloqué.
6. Maia 300 : feuille de route Azure et gains annoncés attribués à Microsoft ; la puce est prévue pour 2027 et l'annonce ne signifie pas un abandon de Nvidia ou des GPU.
7. Lunettes IA : proposition norvégienne de restriction temporaire dans certains lieux, présentée comme une proposition et non comme une interdiction générale adoptée.
8. REA : dépôt open source sous licence MIT qui aide un agent à analyser le comportement d'un logiciel et à reconstruire une fonction ciblée. La slide distingue ce rôle du cas ArtCraft, dont les auteurs décrivent une démarche clean-room indépendante de REA. L'exemple de la clim est présenté comme partagé par Lou. La question de discussion porte sur la valeur des abonnements SaaS au-delà du code.
9. Runway : skills open source pour agents compatibles, dont Claude Code, pour générer avec l'API Runway. Le connecteur MCP hébergé, le modèle Runway proposé dans ElevenCreative et l'application web autonome sont présentés comme des voies distinctes. « Claude devient-il Spielberg ? » reste une accroche : la direction, la cohérence des plans et le montage restent à construire.
10. Cyberattaque des systèmes de froid : le CERT-FR confirme des compromissions de contrôleurs Danfoss, Copeland et Dixell. Le Monde rapporte les réglages altérés, les enseignes et les pertes ; l'AP donne un chiffre différent pour Coopérative U. Metro signale un incident chez un prestataire externe, sans preuve qu'il s'agisse des mêmes contrôleurs. Au 13 octobre, aucune revendication publique n'était recensée.
11. Persuasion personnalisée : une étude Science de 2024 rapportait une baisse moyenne de 20 % de la croyance complotiste après un dialogue GPT-4 Turbo ; le taux d'environ un participant sur quatre qui renonce à sa théorie est une mesure distincte. La slide signale l'expression de préoccupation de Science en juin 2026 et la correction déposée par les auteurs. Elle mentionne aussi le résultat préliminaire, non publié, d'un test non autorisé sur r/ChangeMyView ; la campagne de vente ou d'influence électorale reste une hypothèse de discussion.
12. LE BUILD, identique à la slide 9 de l'épisode 001, conformément au lien fourni par Lou.
13. Les cinq slides Bêta demandées par Lou : sujet, usages et ROI, outils, méthode et exemples, questions en commentaire.
14. LE CLASH, identique à la slide 18 de l'épisode 001.
15. Les quatre questions du Clash demandées par Lou : besoin de lire les tickets, intérêt de sauver le legacy à l'ère de l'IA, relecture du code généré et besoin futur de développeurs qui savent coder. Une seule question apparaît sur chaque slide, sans sous-question ni sous-titre. La quatrième question justifie une slide de plus.

Le support comporte 22 slides. Les anciennes annexes ne font plus partie du parcours. La recherche sur les huit usages est conservée dans les notes de la deuxième slide Bêta et dans [l'analyse du sujet](../site/episode-002-beta-artisans-commercants.md). Les notes et la simulation du Comptoir d'Anna restent consultables en local.

Les contenus Bêta et Clash sont en HTML pour conserver le vrai logo et permettre les retouches. La simulation s'ouvre dans un cadre `sandbox="allow-scripts allow-forms"` sans origine partagée. Les formulaires peuvent déclencher leurs traitements locaux ; la CSP interdit les connexions réseau et les soumissions externes avec `connect-src 'none'` et `form-action 'none'`. L'épisode 001 reste la référence intacte.

La PR #49, consacrée au deck initial, a été fusionnée. Les nouveaux sujets Radar sont proposés dans une PR de suivi ; cette décision ne déclenche ni fusion ni déploiement.
