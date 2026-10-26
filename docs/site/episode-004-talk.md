# Épisode 004 : Radar et Talk

Enregistrement envisagé le 30 octobre 2026. Support préparé le 26 octobre, en local.

Le Talk tient dans cinq slides, écran d'ouverture compris. Il reprend la vision de Lou : le PO construit un prototype fonctionnel avec l'IA, le valide avec les utilisateurs, puis transmet son code au développeur. Le binôme utilise des agents pour préparer la production, réaliser les modifications, vérifier et documenter. La dernière slide ouvre le débat sur les tickets détaillés et les postes dédiés au design et à la QA.

## Le Radar : trois slides Atlassian

1. Le constat 94 % / 6 %, puis une explication : Teamwork Graph relie les tickets, documents et décisions de l'entreprise ; Code Context y ajoute la compréhension du code et de ses relations. Les maxima +44 % de qualité et -48 % de tokens sont présentés comme les résultats de tests internes annoncés par Atlassian avec Teamwork Graph.
2. Les sept étapes ensemble, dans l'ordre : Contexte, Planning, Design, Développement, Review, Maintenance et Mesure. Chaque ligne associe le nom de l'étape à une phrase sur ce qui change avec l'IA. Les détails des outils, dont Devin, Factory, Warp et Codex, restent dans les notes.
3. Les résultats sont expliqués par des phrases complètes : vélocité estimée supérieure à 7x, roadmap de plusieurs mois réalisée en quelques semaines lors d'un pilote, près de 50 % des feature flags nettoyés automatiquement. Le rôle des feature flags est défini. La slide explique aussi que DX AI Measurement suit les effets sur la productivité et la qualité, compare le retour sur investissement et aide à repérer les modèles trop coûteux pour une tâche. Les limites et statuts de disponibilité restent visibles et détaillés dans les notes.

Les sept étapes se lisent ensemble sur la deuxième slide, avec une phrase explicative par étape. Les pourcentages 94 % et 6 % de la première slide sont deux réponses distinctes, sans diagramme suggérant une partition complémentaire.

## Le Talk : cinq slides

1. Sujet d'ouverture : l'évolution de la gestion de projet à l'ère de l'IA. Le binôme produit-développeur constitue un cas concret de cette évolution, sans résumer le sujet à la taille de l'équipe.
2. Le PO donne forme au produit avant le premier ticket : il construit le prototype, fait tester son fonctionnement et transmet son code.
3. Le développeur transforme le prototype en logiciel de production : questions métier, conception technique et agents de réalisation, de test et de documentation.
4. Faut-il encore écrire chaque ticket à la main ? La slide rapproche la vision de Lou de l'annonce Atlassian et de la position de Linear.
5. Le design et la qualité exigent-ils encore des postes dédiés ? La slide présente cette organisation comme une hypothèse à débattre.

Les slides affichent des phrases complètes et des liens vers les sources. Les notes contiennent les explications orales et les limites : les sources ne démontrent pas une disparition générale des métiers, ni une couverture exhaustive des tests. Agent Sessions d'Atlassian est en accès anticipé fermé ; les notes de version de Gremlin indiquent une préversion privée au lancement. Les guides, GIF et démonstrations décrivent le workflow envisagé par Lou.

## Aperçu local

Depuis la racine du dépôt :

```powershell
python -m http.server 4335 --bind 127.0.0.1 --directory apps/site/public
```

Ouvrir <http://127.0.0.1:4335/slides/episode-004/index.html?live=1#talk>.

Flèches, Espace et Page précédente/suivante : navigation. Début/Fin : première/dernière slide. N : notes et sources. P : régie ou mode live. F : plein écran, selon les permissions du navigateur. Le menu donne accès à chaque slide et les ancres restent partageables. Le balayage horizontal fonctionne sur écran tactile.

L'habillage reprend le fond Talk de l'épisode 003, Archivo et le logo existant. Le support reste en HTML/CSS. Lou a demandé de regrouper ce travail dans une PR ; la création de cette PR ne publie pas le support en production.

## Sources

- [Lovable, prototype et reprise du code par les développeurs, 19 mars 2026](https://lovable.dev/blog/prototype-to-production-handoff-how-non-technical-teams-use-lovable-without-bypassing-engineering).
- [Anthropic, Claude Design et prototypage par les PM, 17 avril 2026](https://www.anthropic.com/news/claude-design-anthropic-labs).
- [Atlassian, AI-native SDLC, 7 octobre 2026](https://www.atlassian.com/blog/company-news/team26-europe-ai-sdlc).
- [Linear, Issue tracking is dead, 24 mars 2026](https://linear.app/next).
- [GitHub Spec Kit, référence Agentic SDD](https://github.github.com/spec-kit/reference/agentic-sdd.html).
- [QA Wolf, investigation des échecs, 21 octobre 2026](https://www.qawolf.com/changelog/ai-investigation).
- [Gremlin Foresight AI, 7 octobre 2026](https://www.gremlin.com/blog/announcing-gremlin-foresight-ai).

## Vérifications du 26 octobre

- Dans la branche isolée de préparation de la PR, `pnpm check` passe : formatage, lint, types et tests.
- La suite comprend 1 324 tests du site, sept tests de l'introduction vidéo, quatre tests d'assets vidéo et 24 tests de l'épisode 002 BIS. Elle couvre le nouveau support, la non-régression de l'épisode 003 et l'index des présentations.
- Après la correction des sept étapes, la recette navigateur vérifie 96 vues : huit slides en six formats (1920 x 1080, 1440 x 900, 1280 x 720, 940 x 568, 390 x 844 et 320 x 700), avec et sans régie. Elle vérifie aussi les sept intitulés dans l'ordre et leur lisibilité dans le format de la capture de Lou. Les contrôles portent sur la navigation, les notes, les ressources, les chevauchements et les débordements. Sur téléphone, les slides longues défilent verticalement.
- `pnpm audit --audit-level=high` passe : aucune vulnérabilité élevée ou critique. L'audit signale deux vulnérabilités faibles et deux modérées dans les dépendances existantes ; ce lot ne modifie aucune dépendance.

Les captures et mesures de mise en page sont enregistrées sous `apps/site/.local/episode-004/`. La permission de plein écran natif dépend du navigateur ; le mode live dans la fenêtre est vérifié.
