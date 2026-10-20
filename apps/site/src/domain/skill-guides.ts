export interface SkillGuideOption {
  name: string;
  use: string;
  description: string;
  limitation: string;
  source: string;
  check: string;
}

export interface SkillGuide {
  slug: string;
  title: string;
  heading: string;
  description: string;
  introduction: string;
  scope: string;
  options: readonly SkillGuideOption[];
  installation: readonly string[];
  command?: string;
  documentation: { name: string; url: string };
  questions: readonly { question: string; answer: string }[];
}

// Date de la revue documentaire, jamais remplacée par la date de visite ou de build.
export const SKILL_GUIDES_REVIEWED_AT = '2026-10-20';
export const skillGuidePath = (slug: string) => `/guides/${slug}`;
const anthropicSkill = (name: string) =>
  `https://github.com/anthropics/skills/blob/main/skills/${name}/SKILL.md`;
const openaiSkill = (name: string) =>
  `https://github.com/openai/skills/blob/main/skills/.curated/${name}/SKILL.md`;

export const skillGuides: readonly SkillGuide[] = [
  {
    slug: 'meilleurs-skills-claude',
    title: 'Meilleurs skills Claude et Anthropic : lequel choisir ?',
    heading: 'Meilleurs skills Claude : choisir par usage',
    description:
      'Compare 6 skills Anthropic pour Claude : documents, PDF, Excel, présentations et design. Sources, limites et installation dans Claude Code.',
    introduction:
      'Pour choisir les meilleurs skills Claude, pars du livrable : docx pour Word, xlsx pour un tableur, pptx pour les slides, pdf pour les PDF et frontend-design pour une interface. Le skill-creator sert à construire ta propre méthode. Ces six pistes viennent du dépôt Anthropic ; leur intérêt dépend du travail que tu veux leur confier.',
    scope:
      '« Skills Anthropic » désigne ici les ressources du dépôt anthropics/skills. Claude, Claude Code et l’API ont des modes d’accès différents. La présence d’un fichier SKILL.md ne suffit pas à confirmer que ses scripts et ses dépendances fonctionneront dans ton environnement. Consulte la documentation de la surface que tu utilises avant de l’installer.',
    options: [
      {
        name: 'docx',
        use: 'Créer ou modifier un document Word',
        description:
          'Travaille sur les fichiers Word, leur structure et leur mise en forme. À examiner si ton destinataire doit continuer à modifier le document.',
        limitation:
          'La fidélité au modèle de départ et la pagination doivent être contrôlées dans le fichier produit.',
        source: anthropicSkill('docx'),
        check:
          'Fournis un document avec un tableau et un saut de page. Vérifie que la modification demandée conserve les deux.',
      },
      {
        name: 'xlsx',
        use: 'Nettoyer un tableau ou préparer un fichier Excel',
        description:
          'Couvre les feuilles de calcul, les formules et les graphiques. À examiner quand le résultat attendu est un fichier tableur.',
        limitation: 'Un total affiché ne prouve pas que la formule se recalcule correctement.',
        source: anthropicSkill('xlsx'),
        check:
          'Modifie une valeur d’entrée après génération. Contrôle le total, les formules et le traitement des cellules vides.',
      },
      {
        name: 'pptx',
        use: 'Préparer une présentation PowerPoint',
        description:
          'Couvre la création et la modification de présentations, y compris les modèles et les notes. À examiner pour un support éditable.',
        limitation:
          'L’existence du fichier ne valide ni la lisibilité des slides ni le respect de ta charte.',
        source: anthropicSkill('pptx'),
        check:
          'Demande trois slides à partir de ton masque, puis ouvre-les pour contrôler les débordements et les éléments éditables.',
      },
      {
        name: 'pdf',
        use: 'Extraire, assembler ou remplir des PDF',
        description:
          'Regroupe des procédures de manipulation de PDF, dont l’extraction et l’OCR des pages scannées.',
        limitation:
          'Les scans, colonnes et tableaux demandent une vérification avec la page d’origine.',
        source: anthropicSkill('pdf'),
        check:
          'Utilise une page dont tu connais le contenu. Compare les montants et l’ordre de lecture avec l’extraction.',
      },
      {
        name: 'frontend-design',
        use: 'Concevoir une interface web',
        description:
          'Guide les choix visuels d’une interface, dont la typographie et la composition, à partir du sujet et du public.',
        limitation:
          'Une proposition visuelle doit encore passer les contrôles d’accessibilité et être essayée sur mobile.',
        source: anthropicSkill('frontend-design'),
        check:
          'Donne un écran et son objectif, puis essaie le résultat au clavier et à 390 pixels de large.',
      },
      {
        name: 'skill-creator',
        use: 'Formaliser une tâche récurrente',
        description:
          'Aide à rédiger, améliorer et évaluer un skill. À examiner quand tes consignes reviennent d’une tâche à l’autre.',
        limitation:
          'Une description trop large peut déclencher le skill sur des demandes sans rapport.',
        source: anthropicSkill('skill-creator'),
        check:
          'Prépare deux demandes qui doivent activer le skill et deux qui ne doivent pas l’activer. Relève les déclenchements.',
      },
    ],
    installation: [
      'Ouvre le fichier SKILL.md du candidat, ses scripts et sa licence. Les conditions des skills documentaires diffèrent de celles des exemples sous licence Apache.',
      'Dans Claude Code, ajoute le dépôt officiel comme marketplace avec la commande ci-dessous. Choisis ensuite le plugin document-skills ou example-skills suivant ton besoin.',
      'Pour claude.ai ou l’API, suis la procédure propre à ce produit depuis le dépôt Anthropic. Ne transpose pas une commande Claude Code dans une conversation web.',
      'Lance un essai sur une copie de ton fichier, avec un résultat attendu écrit à l’avance. Garde la version du skill et les défauts observés.',
    ],
    command: '/plugin marketplace add anthropics/skills',
    documentation: {
      name: 'Anthropic : dépôt et procédures d’installation',
      url: 'https://github.com/anthropics/skills#try-in-claude-code-claudeai-and-the-api',
    },
    questions: [
      {
        question: 'Quels sont les meilleurs skills Anthropic pour commencer ?',
        answer:
          'Choisis d’abord le format du fichier attendu : docx, xlsx, pptx ou pdf. Pour une interface, examine frontend-design. Ce choix par tâche évite d’installer une bibliothèque entière avant de savoir ce dont tu as besoin.',
      },
      {
        question: 'Les skills Claude sont-ils tous open source ?',
        answer:
          'Non. Anthropic précise que ses skills documentaires sont disponibles en code source sous des conditions spécifiques. Lis le fichier de licence de chaque skill avant de le redistribuer ou de l’intégrer à un produit.',
      },
      {
        question: 'Le premier du classement Skills est-il le meilleur pour Claude ?',
        answer:
          'Le classement Sandbox suit des mesures d’adoption et leur évolution. Pour choisir un skill, vérifie aussi sa compatibilité et le résultat sur ton propre cas. Un nombre d’installations ne mesure pas la qualité d’un document ou d’un code produit.',
      },
    ],
  },
  {
    slug: 'meilleurs-skills-chatgpt',
    title: 'Meilleurs skills ChatGPT : usages, choix et installation',
    heading: 'Meilleurs skills ChatGPT : partir de ta tâche',
    description:
      'Quels skills choisir pour ChatGPT ? Compare recherche sourcée, rédaction, reporting et suivi de projet, avec prérequis et protocole de vérification.',
    introduction:
      'Les meilleurs skills ChatGPT sont ceux qui décrivent précisément une tâche que tu répètes : rechercher des sources, appliquer une charte de rédaction, préparer un reporting ou suivre un projet. Commence par un seul de ces usages et un exemple de résultat attendu. Vérifie ensuite les outils et accès dont le skill a besoin.',
    scope:
      'Un skill rassemble une procédure et ses ressources. Un plugin peut distribuer des skills et des connecteurs ; un serveur MCP fournit des données et des actions. OpenAI documente les skills pour ChatGPT et Codex, avec des modes de distribution différents. Les pistes ci-dessous sont des modèles de skills à configurer, pas des noms de plugins prêts à installer ni une liste de fonctionnalités incluses dans chaque compte.',
    options: [
      {
        name: 'Recherche sourcée',
        use: 'Comparer des informations avec leurs preuves',
        description:
          'Définis les sources admises, la date à relever et le format des citations. Demande au skill de distinguer les faits vérifiés et les questions ouvertes.',
        limitation:
          'Il faut un outil de recherche ou un connecteur adapté. Une URL citée doit soutenir la phrase qui la précède.',
        source: 'https://developers.openai.com/plugins/concepts/skills',
        check:
          'Pose une question dont tu connais une source fiable. Ouvre chaque citation et repère les phrases sans preuve.',
      },
      {
        name: 'Rédaction selon ta charte',
        use: 'Appliquer les mêmes règles à chaque texte',
        description:
          'Prépare un skill avec ta voix, les mots à conserver et deux exemples validés. Précise les passages qu’il peut reformuler et les faits qu’il doit garder.',
        limitation:
          'Le skill doit recevoir les faits et les exemples. Une consigne de ton ne fournit aucune source supplémentaire.',
        source: 'https://developers.openai.com/plugins/concepts/skills',
        check:
          'Donne un brouillon avec un nom propre, un chiffre et une citation. Vérifie leur conservation après réécriture.',
      },
      {
        name: 'Reporting récurrent',
        use: 'Reproduire un rapport à partir de données',
        description:
          'Décris les colonnes, les calculs et les règles en cas de valeur absente. Fournis un petit jeu de données avec les résultats que tu as calculés.',
        limitation:
          'L’accès aux fichiers ou au service de données doit être disponible. Toute donnée absente doit rester identifiable.',
        source: 'https://developers.openai.com/plugins/concepts/skills',
        check:
          'Ajoute un doublon et une cellule vide à ton échantillon. Contrôle les totaux et le signalement des anomalies.',
      },
      {
        name: 'Point de suivi projet',
        use: 'Transformer des informations en actions',
        description:
          'Fixe un format avec décisions, actions, responsables et échéances. Demande une référence vers le document ou le ticket qui justifie chaque action.',
        limitation:
          'Le connecteur projet exige ses propres autorisations. Un responsable ou une échéance non renseignés doivent être signalés.',
        source: 'https://developers.openai.com/plugins/concepts/skills',
        check:
          'Fournis des notes qui contiennent une proposition non validée. Vérifie qu’elle reste distincte d’une décision prise.',
      },
    ],
    installation: [
      'Choisis le résultat attendu et rassemble un exemple d’entrée avec sa sortie validée. Nomme les erreurs qui rendraient le résultat inutilisable.',
      'Vérifie si ton interface accepte un skill autonome ou un plugin qui le contient. La documentation OpenAI distingue ces modes d’accès ; une procédure Codex CLI ne remplace pas celle de ChatGPT web.',
      'Si la tâche lit un service externe, configure le connecteur nécessaire et ses droits. Le texte du skill ne crée pas cet accès.',
      'Teste une demande normale, une entrée incomplète et une demande hors périmètre. Révise les instructions à partir des différences avec tes résultats attendus.',
    ],
    documentation: {
      name: 'OpenAI : distribution des skills dans ChatGPT et Codex',
      url: 'https://learn.chatgpt.com/docs/build-skills',
    },
    questions: [
      {
        question: 'Un skill ChatGPT est-il un GPT personnalisé ?',
        answer:
          'La documentation des skills décrit des dossiers d’instructions et de ressources réutilisables, éventuellement distribués dans un plugin. Vérifie le format réel du produit que tu consultes : le mot « skill » peut aussi servir d’étiquette commerciale pour un simple ensemble de prompts.',
      },
      {
        question: 'Peut-on utiliser un skill Claude dans ChatGPT ?',
        answer:
          'Le fichier SKILL.md peut suivre un format commun. La compatibilité complète dépend aussi des outils, des scripts et des références employés. Lis ces dépendances et teste le résultat dans ChatGPT avant de compter sur ce transfert.',
      },
      {
        question: 'Comment départager deux skills ChatGPT ?',
        answer:
          'Donne-leur la même entrée, le même résultat attendu et les mêmes outils. Compte les faits perdus, les calculs faux et les corrections manuelles nécessaires. Répète avec une entrée incomplète : tu verras comment chacun traite ce qui manque.',
      },
    ],
  },
  {
    slug: 'meilleurs-skills-openai',
    title: 'Meilleurs skills OpenAI et Codex : guide de choix',
    heading: 'Meilleurs skills OpenAI pour travailler avec Codex',
    description:
      'Choisis tes skills OpenAI pour Codex : documentation API, correction de CI et revue GitHub. Sources officielles, prérequis, installation et tests à faire.',
    introduction:
      'Pour trouver les meilleurs skills OpenAI dans Codex, commence par le blocage que tu veux résoudre : openai-docs pour consulter la documentation, gh-fix-ci pour diagnostiquer GitHub Actions et gh-address-comments pour traiter une revue de code. Le skill-creator sert à formaliser une procédure propre à ton projet.',
    scope:
      'Ce guide examine des skills du catalogue openai/skills et les procédures de Codex. Pour une utilisation dans ChatGPT, consulte le guide dédié : l’interface, les connecteurs et les possibilités d’exécution changent ce qu’un skill peut faire. Les noms ci-dessous identifient des ressources précises ; vérifie leur version et leurs prérequis dans le dépôt avant installation.',
    options: [
      {
        name: 'openai-docs',
        use: 'Vérifier une API ou un produit OpenAI',
        description:
          'Oriente la recherche vers la documentation officielle OpenAI et les sources nécessaires à une réponse citée.',
        limitation:
          'La documentation ne donne pas l’état de tes comptes, de tes clés ou de ton application.',
        source: openaiSkill('openai-docs'),
        check:
          'Pose une question sur un paramètre d’API. Vérifie le lien vers la documentation et la présence de ce paramètre dans la page.',
      },
      {
        name: 'gh-fix-ci',
        use: 'Diagnostiquer une CI GitHub Actions en échec',
        description:
          'Lit les contrôles et les logs d’une pull request, puis prépare un plan de correction. La procédure prévoit une validation avant modification.',
        limitation:
          'Nécessite la CLI gh authentifiée. Les autres fournisseurs de CI sont hors du périmètre annoncé.',
        source: openaiSkill('gh-fix-ci'),
        check:
          'Prends un échec déjà compris. Vérifie que le diagnostic retrouve la cause et que les tests concernés passent après correction autorisée.',
      },
      {
        name: 'gh-address-comments',
        use: 'Traiter les retours d’une pull request',
        description:
          'Rassemble les commentaires de revue et aide à appliquer les corrections choisies sur la branche courante.',
        limitation:
          'Demande un accès GitHub et un choix des retours à traiter. Une suggestion de revue peut nécessiter une discussion.',
        source: openaiSkill('gh-address-comments'),
        check:
          'Choisis deux commentaires précis. Compare le diff avec chacun et vérifie les discussions qui restent ouvertes.',
      },
      {
        name: 'skill-creator',
        use: 'Créer une procédure adaptée au dépôt',
        description:
          'Sert à créer ou mettre à jour un skill dans l’environnement OpenAI. Utile pour une procédure répétée et spécifique à ton équipe.',
        limitation:
          'Écrire les instructions ne démontre pas leur efficacité. Il faut des entrées et des résultats attendus pour les évaluer.',
        source: 'https://learn.chatgpt.com/docs/build-skills',
        check:
          'Formalise une petite tâche connue. Essaie le skill sur un cas courant et un cas où il doit demander une précision.',
      },
    ],
    installation: [
      'Ouvre le skill dans le catalogue OpenAI. Vérifie ses fichiers, sa licence et les outils requis avant de l’ajouter à ton environnement.',
      'Dans Codex, demande au skill-installer d’installer le nom choisi. La commande ci-dessous utilise l’exemple fourni par le catalogue officiel.',
      'Contrôle ensuite que le skill apparaît dans la liste disponible. Si ta version ne le détecte pas, redémarre Codex et relis la documentation de cette version.',
      'Essaie-le sur une branche de travail. Vérifie le diff et les contrôles du dépôt avant d’autoriser un commit, un push ou une publication.',
    ],
    command: '$skill-installer gh-address-comments',
    documentation: {
      name: 'OpenAI : catalogue des skills et installation',
      url: 'https://github.com/openai/skills#installing-a-skill',
    },
    questions: [
      {
        question: 'Quels skills OpenAI installer en premier ?',
        answer:
          'Si tu travailles sur une API OpenAI, examine openai-docs. Pour une CI GitHub Actions bloquée, examine gh-fix-ci. Pour les retours d’une PR, examine gh-address-comments. Installe celui qui répond à ta prochaine tâche et contrôle son résultat avant d’en ajouter d’autres.',
      },
      {
        question: 'Un skill Codex a-t-il besoin d’une clé API OpenAI ?',
        answer:
          'Lis les prérequis du skill et de ses scripts. Une procédure de documentation et une procédure qui appelle un service externe n’ont pas les mêmes besoins. N’ajoute une clé ou un compte que si la tâche et l’outil utilisé l’exigent.',
      },
      {
        question: 'Les étoiles GitHub permettent-elles de choisir le meilleur skill ?',
        answer:
          'Elles renseignent sur l’attention reçue par un dépôt. Pour choisir, regarde aussi la tâche couverte, les dépendances et les corrections nécessaires sur ton cas. Garde les mesures d’adoption séparées des résultats de tes essais.',
      },
    ],
  },
];

export function findSkillGuide(slug: string): SkillGuide | undefined {
  return skillGuides.find((guide) => guide.slug === slug);
}
