const sources = {
  lovable: {
    label: 'Lovable, 19 mars 2026',
    title:
      'Prototype-to-production handoff: how non-technical teams use Lovable without bypassing engineering',
    url: 'https://lovable.dev/blog/prototype-to-production-handoff-how-non-technical-teams-use-lovable-without-bypassing-engineering',
  },
  anthropic: {
    label: 'Anthropic, 17 avril 2026',
    title: 'Introducing Claude Design by Anthropic Labs',
    url: 'https://www.anthropic.com/news/claude-design-anthropic-labs',
  },
  atlassian: {
    label: 'Atlassian, 7 octobre 2026',
    title: 'Atlassian brings the AI-native SDLC from playbook to production',
    url: 'https://www.atlassian.com/blog/company-news/team26-europe-ai-sdlc',
  },
  specKit: {
    label: 'GitHub Spec Kit, documentation',
    title: 'Agentic SDD',
    url: 'https://github.github.com/spec-kit/reference/agentic-sdd.html',
  },
  qaWolf: {
    label: 'QA Wolf, 21 octobre 2026',
    title: 'QA Wolf AI diagnoses failures while your suite is still running',
    url: 'https://www.qawolf.com/changelog/ai-investigation',
  },
  gremlin: {
    label: 'Gremlin, 7 octobre 2026',
    title: 'Announcing Gremlin Foresight AI',
    url: 'https://www.gremlin.com/blog/announcing-gremlin-foresight-ai',
  },
  linear: {
    label: 'Linear, 24 mars 2026',
    title: 'Issue tracking is dead',
    url: 'https://linear.app/next',
  },
};

export const radarScenes = [
  {
    id: 'radar',
    chapter: 'Radar',
    kind: 'radar-context',
    label: 'Atlassian : adoption et contexte',
    title: 'Atlassian repense le SDLC autour des agents.',
    subtitle: "L'enjeu annoncé : intégrer l'IA dans tout le cycle de développement logiciel.",
    sources: [sources.atlassian],
    notes: [
      "Atlassian considère que les assistants de code constituent une première étape. L'entreprise propose de repenser le SDLC, Software Development Life Cycle, autour des agents : contexte, planning, design, développement, revue, maintenance et mesure.",
      "Dans son étude AI SDLC 2026, 94 % des responsables engineering déclarent que leurs équipes utilisent déjà l'IA ; seulement 6 % disent disposer des systèmes pour la déployer et la gouverner à grande échelle. Ces deux pourcentages mesurent des questions différentes et ne forment pas une répartition en deux groupes complémentaires.",
      "Teamwork Graph relie le code, les documents, les décisions et plus de 80 sources tierces, en tenant compte des permissions. Code Context ajoute la compréhension du code et de ses relations à grande échelle. GitHub, Jira, Confluence et Slack font partie du contexte décrit dans l'article.",
      "Lors de tests internes, Atlassian annonce jusqu'à 44 % d'amélioration de la qualité des réponses et jusqu'à 48 % de tokens consommés en moins. Ce sont des maxima rapportés par le fournisseur, pas des gains garantis pour tous les clients.",
    ],
  },
  {
    id: 'radar-atlassian-sdlc',
    chapter: 'Radar',
    kind: 'radar-workflow',
    label: 'Atlassian : les agents dans le SDLC',
    title: "Les 7 étapes du SDLC avec l'IA.",
    subtitle: 'Du contexte à la mesure : ce qui change à chaque étape.',
    sources: [sources.atlassian],
    notes: [
      "L'équipe peut assigner un élément Jira à Devin, Factory ou Warp. L'agent reçoit le résumé, la description et le contexte, réalise le travail et ouvre une pull request. Des événements Jira peuvent déclencher les agents avec les points de validation humaine choisis par l'équipe. Codex est annoncé pour plus tard à la date de l'article.",
      "Planning : Planner pose des questions sur le périmètre et les critères de réussite, crée un plan Confluence et le décline en tâches exploitables par les agents. Ces tâches comprennent des descriptions, des critères d'acceptation, les dépôts concernés et les dépendances.",
      "Design : Loom Record for Agent transforme une vidéo commentée en plan d'action structuré. Les clics et le contexte visuel accompagnent la demande pour générer une interface, un prototype ou un élément de travail.",
      'Revue : AI Review prépare une première analyse des changements selon les standards partagés. Interactive PR Reviews avec Loom doit produire une vidéo de la PR, avec les changements et les risques à examiner. Les humains gardent les décisions qui nécessitent leur jugement.',
      "Maintenance : Agent Sessions centralise les objectifs, décisions, changements et PR des sessions. L'activité devient visible dans Jira et son contexte peut être réutilisé. Une session peut aussi commencer avant qu'un ticket existe.",
    ],
  },
  {
    id: 'radar-atlassian-results',
    chapter: 'Radar',
    kind: 'radar-results',
    label: 'Atlassian : résultats et disponibilité',
    title: 'Atlassian annonce ses premiers résultats.',
    subtitle: 'Observations internes et pilote : des résultats à contextualiser.',
    sources: [sources.atlassian],
    notes: [
      "Les ingénieurs Atlassian estiment une vélocité multipliée par plus de sept pour certains développements de fonctionnalités dans des bases de code existantes. L'article évoque aussi un pilote de développement par spécifications qui a réalisé une roadmap de plusieurs mois en quelques semaines. Il ne s'agit ni d'un benchmark indépendant ni d'une promesse de délai universelle.",
      "Atlassian indique que près de la moitié de ses feature flags sont nettoyés automatiquement avec Jira Coding Agent et des automatisations. Un feature flag est un mécanisme d'activation conditionnelle d'une fonctionnalité ; son nettoyage évite de conserver ces mécanismes devenus inutiles.",
      "DX AI Measurement rapproche l'usage des outils IA des résultats de livraison : productivité, qualité, adoption, frictions, ROI comparé à des pairs, évaluation des sessions et pertinence des modèles au regard du coût. L'objectif est d'observer la valeur du travail et les coûts plutôt que de se limiter aux volumes de code.",
      "Disponibilité annoncée le 7 octobre : Code Context en bêta ouverte avec déploiement progressif aux clients payants ; Record for Agent en bêta ouverte ; Planner, agent loops et AI Review en accès anticipé privé ; Agent Sessions et Interactive PR Reviews avec Loom en accès anticipé fermé ; DX AI Measurement généralement disponible. Les statuts sont ceux de l'article, sans supposer un déploiement complet au 30 octobre.",
    ],
  },
];

const talkContent = [
  {
    id: 'talk',
    chapter: 'Talk',
    kind: 'prototype',
    label: 'Le PO construit',
    title: 'Le PO donne forme au produit avant le premier ticket.',
    subtitle: "Avec l'IA, il peut construire et faire essayer un prototype fonctionnel.",
    sources: [sources.lovable, sources.anthropic],
    notes: [
      "Ma vision commence par le PO. Avec un agent, il construit les écrans, les parcours, les règles métier et les validations de saisie dans une application mockée. Le prototype contient du code que l'on peut exécuter et examiner.",
      'Il le confronte aux utilisateurs, aux avant-ventes et aux commerciaux. Il utilise les retours et des skills UX pour corriger le fonctionnement avant de mobiliser le développement de production.',
      'Lovable décrit ce parcours : construire un prototype interactif, le valider avec les utilisateurs, puis synchroniser le code dans GitHub. Anthropic décrit aussi des PM qui prototypent et transmettent leur travail à Claude Code. Ce sont des usages présentés par les fournisseurs.',
    ],
  },
  {
    id: 'talk-code',
    chapter: 'Talk',
    kind: 'handoff',
    label: 'Le développeur reprend',
    title: 'Le développeur transforme le prototype en logiciel de production.',
    subtitle:
      'Il part du fonctionnement validé pour concevoir une réalisation fiable et maintenable.',
    sources: [sources.lovable, sources.specKit],
    notes: [
      'Le développeur essaie la fonctionnalité et accède au code du prototype. Son agent peut examiner les parcours et les règles déjà implémentées. Le PO reste disponible pour les questions métier.',
      'Ensemble, ils challengent les ambiguïtés et les cas oubliés. Un workflow comme Spec Kit aide à clarifier les exigences, préparer le plan et vérifier la cohérence. Spec Kit reste un ensemble de méthodes et de commandes pour un agent, pas une preuve automatique de qualité.',
      "Le développeur prend en charge la conception, l'architecture, la sécurité, l'intégration et les exigences de production. Il choisit ce qu'il conserve ou réimplémente. La maquette validée décrit le fonctionnement attendu sans prouver sa conformité ni le respect des SLA.",
    ],
  },
  {
    id: 'talk-agents',
    chapter: 'Talk',
    kind: 'agents',
    label: 'Les agents exécutent',
    title: 'Les agents préparent et vérifient.',
    subtitle: 'Le binôme pilote le travail dans un harnais comme OpenCode.',
    sources: [sources.specKit, sources.qaWolf, sources.gremlin],
    notes: [
      "Le binôme peut demander aux agents de produire le plan, le découpage technique et les critères d'acceptation, puis de réaliser les modifications et d'exécuter les tests. Il arbitre les décisions et configure les contrôles obligatoires.",
      'QA Wolf annonce des agents qui diagnostiquent les échecs et reproduisent les bugs. Gremlin annonce des agents qui recommandent et exécutent des tests de fiabilité, avec approbation. Ses notes de version indiquent une préversion privée au lancement. Ces annonces ne démontrent pas une couverture exhaustive de tous les défauts.',
      "Dans la vision de Lou, les agents préparent aussi les guides utilisateurs, les GIF et les clips de démonstration à partir de l'application livrée. Cette partie décrit le workflow envisagé, sans attribuer ces capacités à Spec Kit, QA Wolf ou Gremlin.",
    ],
  },
  {
    id: 'talk-tickets',
    chapter: 'Talk',
    kind: 'tickets',
    label: 'Le ticket change de place',
    title: 'Faut-il encore écrire chaque ticket à la main ?',
    subtitle:
      "Le binôme fixe l'objectif. Les agents préparent le découpage et conservent la trace du travail.",
    sources: [sources.atlassian, sources.linear],
    notes: [
      "Un ticket détaillé servait notamment à transmettre au développeur ce qu'il devait réaliser. Ici, le binôme dispose déjà d'une application mockée, de son code et des décisions métier. Les agents peuvent générer et ajuster leur propre plan de tâches.",
      "Atlassian décrit, dans la partie maintenance de son article, une session d'agent qui peut commencer avant qu'un ticket existe. Jira crée ensuite l'élément de suivi à partir de cette session. Agent Sessions est en accès anticipé fermé. Atlassian conserve aussi des plans et des tickets dans son offre.",
      'Linear remet en cause le suivi historique organisé autour des passages de relais. Il conserve des issues dans son produit. Ces deux sources appuient le changement de rôle du ticket, sans annoncer sa suppression générale.',
      'La proposition de Lou va plus loin : le binôme arbitre les fonctionnalités, les agents gèrent le découpage fin, et les comptes rendus ou documents de suivi sont générés à partir du travail réel. On peut conserver une trace sans imposer un backlog détaillé saisi avant chaque réalisation.',
    ],
  },
  {
    id: 'talk-debat',
    chapter: 'Talk',
    kind: 'debate',
    label: 'La vision à débattre',
    title: 'Le design et la qualité exigent-ils encore des postes dédiés ?',
    subtitle:
      "Un binôme produit-développeur peut-il assumer ces responsabilités avec l'aide de ses agents ?",
    sources: [sources.lovable, sources.qaWolf],
    notes: [
      "Je défends l'hypothèse d'une équipe resserrée : le PO construit et valide le fonctionnement, le développeur conçoit la production, et les agents prennent en charge une grande partie du design, de la réalisation, des tests et de la documentation.",
      "Dans ce modèle, certaines équipes pourraient livrer sans designer ni QA dédiés à chaque fonctionnalité, et sans tickets détaillés rédigés à la main. Les sources documentent plusieurs briques de cette organisation. Elles ne démontrent pas la disparition générale de ces métiers, ni qu'un binôme suffit pour tous les produits.",
      "Relance : sur une de nos fonctionnalités, qu'est-ce qui demanderait encore un designer ou une QA dédiés, même avec nos meilleurs agents et skills ?",
      'Relance : quelles preuves faudrait-il obtenir pour confier ce travail au binôme et à ses agents, avec nos engagements clients ?',
    ],
  },
];

const handoff = talkContent.find((slide) => slide.kind === 'handoff');
const agents = talkContent.find((slide) => slide.kind === 'agents');

export const talkScenes = [
  {
    id: 'talk',
    chapter: 'Talk',
    kind: 'opening',
    label: 'Le sujet du Talk',
    title: "L'évolution de la gestion de projet à l'ère de l'IA",
    subtitle: 'Du besoin métier au logiciel livré, comment organiser le travail avec des agents ?',
    sources: [sources.lovable, sources.qaWolf],
    notes: [
      "Le sujet du Talk est l'évolution de la gestion de projet à l'ère de l'IA. La vision de Lou sert de cas concret : un PO construit un prototype codé, le valide avec les utilisateurs, puis un développeur le transforme en logiciel de production avec ses agents.",
      "Question d'ouverture : si ce binôme peut concevoir les parcours, générer le découpage et tester avec l'IA, quelles fonctions les tickets détaillés, le design et la QA dédiés doivent-ils encore remplir ?",
      'Présenter cette organisation comme une hypothèse à débattre. Les articles montrent des capacités et des usages ; ils ne prouvent pas que tous les produits peuvent être livrés par deux personnes ni que les métiers disparaissent.',
    ],
  },
  ...talkContent
    .filter((slide) => slide.kind !== 'agents')
    .map((slide) => {
      if (slide.kind === 'prototype') return { ...slide, id: 'talk-prototype' };
      if (slide.kind !== 'handoff') return slide;
      return {
        ...slide,
        sources: [...slide.sources, sources.qaWolf, sources.gremlin],
        notes: [...(handoff?.notes ?? []), ...(agents?.notes ?? [])],
      };
    }),
];

export const scenes = [...radarScenes, ...talkScenes];

export function sceneIndex(hash, slides = scenes) {
  const anchor = hash.replace(/^#/, '');
  const index = slides.findIndex((slide) => slide.id === anchor);
  if (index >= 0) return index;
  const numeric = Number(anchor) - 1;
  return Number.isInteger(numeric) && numeric >= 0 && numeric < slides.length ? numeric : 0;
}
