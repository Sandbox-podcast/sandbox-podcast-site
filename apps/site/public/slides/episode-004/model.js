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
  benefitFund: {
    label: 'Anthropic, 18 oct. 2026',
    title: 'Investing in the public benefit',
    url: 'https://www.anthropic.com/news/public-benefit-fund',
  },
  economicFund: {
    label: 'Anthropic, 22 juil. 2026',
    title: 'A research agenda for the Economic Futures Research Fund',
    url: 'https://www.anthropic.com/news/economic-futures-research-fund-agenda',
  },
  publicWealth: {
    label: 'OpenAI, avril 2026, p. 6–7',
    title: 'Industrial Policy for the Intelligence Age: Ideas to Keep People First',
    url: 'https://cdn.openai.com/pdf/561e7512-253e-424b-9734-ef4098440601/Industrial%20Policy%20for%20the%20Intelligence%20Age.pdf',
  },
  sanders: {
    label: 'Bernie Sanders, 18 juin 2026',
    title: 'Sanders Introduces Legislation to Create $7 Trillion AI Sovereign Wealth Fund',
    url: 'https://www.sanders.senate.gov/press-releases/news-sanders-introduces-legislation-to-create-7-trillion-ai-sovereign-wealth-fund/',
  },
  bill: {
    label: 'S. 4825, texte déposé',
    title: 'American A.I. Sovereign Wealth Fund Act, introduced in Senate',
    url: 'https://www.govinfo.gov/content/pkg/BILLS-119s4825is/html/BILLS-119s4825is.htm',
  },
  alaska: {
    label: 'Alaska, montant 2026',
    title: 'Alaska Permanent Fund Dividend: 2026 PFD Amount',
    url: 'https://pfd.alaska.gov/',
  },
};

export const radarScenes = [
  {
    id: 'radar',
    chapter: 'Radar',
    topic: 'Atlassian SDLC',
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
    topic: 'Atlassian SDLC',
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
    topic: 'Atlassian SDLC',
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
  {
    id: 'radar-ia-revenu',
    chapter: 'Radar',
    topic: 'Revenu universel IA',
    kind: 'radar-brief',
    label: 'Revenu universel : les annonces Anthropic',
    title: 'L’IA va-t-elle financer un revenu universel ?',
    subtitle:
      'Anthropic annonce des moyens pour partager les gains et préparer les effets sur le travail.',
    facts: [
      {
        label: '5 % des actions',
        text: 'Anthropic prévoit de les affecter à un fonds d’intérêt général, sous réserve du vote des actionnaires.',
      },
      {
        label: '200 M$',
        text: 'L’entreprise s’engage à financer des recherches et des expérimentations sur les effets économiques de l’IA.',
      },
    ],
    takeaway:
      'Les versements directs sont une possibilité évoquée. Aucun revenu universel n’est promis dans ces annonces.',
    sources: [sources.benefitFund, sources.economicFund],
    notes: [
      'Annonce du 18 octobre 2026 : le Public Benefit Fund serait une entité détenue par Anthropic. L’affectation initiale de 5 % des actions reste soumise à l’approbation des actionnaires.',
      'Le fonds pourrait financer des associations ou effectuer des distributions à certaines populations. L’annonce ne fixe ni montant individuel, ni calendrier de versement, ni droit universel.',
      'Le fonds Economic Futures, distinct, représente un engagement de 200 millions de dollars pour des recherches externes et des pilotes. Les thèmes comprennent le soutien aux revenus et la participation des travailleurs aux gains de l’IA. Il faut distinguer cet engagement d’une somme déjà distribuée aux ménages.',
    ],
  },
  {
    id: 'radar-ia-fonds-publics',
    chapter: 'Radar',
    topic: 'Revenu universel IA',
    kind: 'radar-brief',
    label: 'Revenu universel : OpenAI et Sanders',
    title: 'Des fonds publics pour partager les gains de l’IA',
    subtitle: 'Deux propositions américaines, avec des modalités différentes.',
    facts: [
      {
        label: 'OpenAI',
        text: 'Un portefeuille public diversifié pourrait investir dans la croissance liée à l’IA et distribuer ses rendements aux citoyens.',
      },
      {
        label: 'Bernie Sanders',
        text: 'Son texte vise 50 % du capital des entreprises concernées pour un fonds public. Il l’estime à 7 000 Md$ et évoque plus de 1 000 $ par personne et par an.',
      },
    ],
    takeaway:
      'OpenAI présente une piste de politique économique. Sanders a déposé une proposition de loi ; le montant annoncé reste une estimation.',
    sources: [sources.publicWealth, sources.sanders, sources.bill],
    notes: [
      'Dans son document d’avril 2026, OpenAI propose un Public Wealth Fund investi dans des actifs diversifiés à long terme. Les rendements pourraient être distribués directement. L’alimentation initiale reste à définir avec les pouvoirs publics et les entreprises ; aucun revenu individuel garanti n’est chiffré.',
      'S. 4825 a été déposé par Sanders le 18 juin 2026 et renvoyé à la commission des finances. Le texte initial prévoit une émission d’actions donnant au Trésor 50 % du capital après paiement de la taxe. Le dossier emploie « transfert » : le mécanisme du texte repose plus précisément sur des actions nouvellement émises.',
      'Les 7 000 milliards de dollars sont une valorisation estimée par Sanders dans son communiqué, à la date de présentation. Un prélèvement annuel de 5 % sur le fonds pourrait, selon lui, fournir plus de 1 000 dollars annuels par personne. Ce montant dépend des actifs et de leur valeur ; il ne constitue pas un droit en vigueur.',
    ],
  },
  {
    id: 'radar-ia-financement',
    chapter: 'Radar',
    topic: 'Revenu universel IA',
    kind: 'radar-brief',
    label: 'Revenu universel : financement et distribution',
    title: 'Qui finance, qui possède, qui reçoit ?',
    subtitle:
      'Un revenu universel est un versement régulier à chacun, sans condition de ressources ni d’emploi.',
    facts: [
      {
        label: 'Financer',
        text: 'Les pistes incluent les impôts sur les profits et le capital, les prélèvements liés à l’automatisation ou l’affectation d’actions à un fonds.',
      },
      {
        label: 'Distribuer',
        text: 'Les recettes ou rendements peuvent financer un dividende citoyen, des aides ciblées, des services publics ou du temps de travail réduit.',
      },
      {
        label: 'Alaska : 1 200 $',
        text: 'Montant annoncé en 2026 pour les résidents éligibles, dont 200 $ d’aide énergétique. Un précédent de dividende collectif, financé hors de l’IA.',
      },
    ],
    takeaway:
      'Détenir des actifs donne aussi un pouvoir sur leur gestion. Le montant et la régularité du revenu dépendent du dispositif choisi.',
    sources: [sources.publicWealth, sources.bill, sources.alaska],
    notes: [
      'Distinguer le financement, la propriété et l’usage des fonds. Une taxe produit des recettes ; un fonds détient des actifs ; un dividende distribue une partie des ressources. Ces mécanismes peuvent se combiner sans instaurer un revenu universel.',
      'OpenAI évoque la fiscalité du capital et du travail automatisé, des prestations améliorées et des pilotes de semaine de 32 heures sans perte de salaire. Sanders propose une propriété publique assortie de droits de vote, ce qui ajoute un enjeu de contrôle des entreprises.',
      'L’Alaska annonce un paiement 2026 de 1 200 dollars, comprenant 200 dollars d’aide énergétique. Son fonds est historiquement issu des revenus pétroliers. Le paiement concerne les résidents remplissant les conditions ; cet exemple ne démontre pas qu’un fonds IA pourrait financer un revenu suffisant pour vivre.',
    ],
  },
  {
    id: 'radar-ia-limites',
    chapter: 'Radar',
    topic: 'Revenu universel IA',
    kind: 'radar-brief',
    label: 'Revenu universel : trois visions de l’avenir économique',
    title: 'Trois visions de l’avenir économique avec l’IA',
    subtitle: 'La place du travail et l’origine des revenus changent selon le scénario.',
    facts: [
      {
        label: 'A · On continue à travailler',
        text: 'L’IA augmente la productivité. Les salariés bénéficient de meilleurs revenus, de semaines réduites ou de nouveaux emplois.',
      },
      {
        label: 'B · On travaille moins',
        text: 'Une partie des emplois disparaît. Les gains économiques financent de nouvelles protections sociales, des revenus complémentaires ou des dividendes citoyens.',
      },
      {
        label: 'C · Le travail devient largement facultatif',
        text: 'L’IA et la robotique assurent une grande part de la production. Les revenus proviennent davantage de la propriété du capital ou de mécanismes collectifs de redistribution.',
      },
    ],
    takeaway:
      'Trois futurs possibles à débattre. Aucun de ces scénarios n’est une prévision établie.',
    sources: [sources.publicWealth, sources.economicFund],
    notes: [
      'Scénario A : le travail reste la principale source de revenus. Les gains de productivité peuvent se traduire par de meilleurs salaires, des horaires réduits ou de nouveaux emplois. Ce partage dépend des choix des entreprises et des politiques publiques.',
      'Scénario B : une partie des emplois disparaît et les revenus du travail sont complétés par des protections sociales ou des dividendes. Le scénario C va plus loin : le travail devient largement facultatif et les revenus reposent davantage sur le capital et la redistribution. Cela suppose que l’IA et la robotique prennent en charge une part considérable de la production.',
      'Ces trois visions reprennent la grille de discussion proposée par Lou. Les sources présentent des pistes sur le travail, les aides aux revenus et le partage du capital ; elles n’établissent ni cette classification exacte, ni sa probabilité, ni une succession obligatoire de A vers C. Question pour l’oral : quel scénario paraît plausible et qui décide du partage des gains ?',
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
