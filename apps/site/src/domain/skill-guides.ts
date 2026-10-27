export interface SkillGuideOption {
  name: string;
  use: string;
  description: string;
  limitation: string;
  source: string;
  check: string;
  prompt: string;
}

export interface SkillGuide {
  slug: string;
  title: string;
  heading: string;
  tool: string;
  kind: 'catalog' | 'recipes';
  takeaway: string;
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
export const SKILL_GUIDES_REVIEWED_AT = '2026-10-26';
export const skillGuidePath = (slug: string) => `/guides/${slug}`;
const anthropicSkill = (name: string) =>
  `https://github.com/anthropics/skills/blob/main/skills/${name}/SKILL.md`;
const openaiSkill = (name: string) =>
  `https://github.com/openai/skills/blob/main/skills/.curated/${name}/SKILL.md`;

export const skillGuides: readonly SkillGuide[] = [
  {
    slug: 'meilleurs-skills-claude',
    title: 'Meilleurs skills Claude et Anthropic : lequel choisir ?',
    heading: 'Quel skill Claude utiliser pour ton travail ?',
    tool: 'Claude',
    kind: 'catalog',
    takeaway:
      'Tu veux produire un fichier ? Commence par son format : Word, Excel, PowerPoint ou PDF. Pour travailler sur un site web, regarde frontend-design.',
    description:
      'Six skills Anthropic expliqués avec des exemples : Word, Excel, PowerPoint, PDF, interface web et création de skills. Comment les utiliser dans Claude.',
    introduction:
      'Tu as un rapport à mettre en page, un tableur à nettoyer ou une présentation à préparer. Anthropic propose des skills pour ces tâches : chacun donne à Claude une méthode de travail et, parfois, des outils pour manipuler tes fichiers. Voici lequel essayer selon ce que tu veux obtenir.',
    scope:
      'Ces six skills viennent du dépôt officiel Anthropic. Dans Claude sur le web, vérifie les skills disponibles dans ton compte. Dans Claude Code, tu peux ajouter les plugins du dépôt avec la procédure plus bas.',
    options: [
      {
        name: 'docx',
        prompt:
          'Avec le skill docx, transforme ces notes en compte rendu Word. Garde les décisions, les responsables et les dates. Mets les actions dans un tableau et signale les informations manquantes.',
        use: 'Créer ou modifier un document Word',
        description:
          'Choisis docx pour obtenir un document Word que tu pourras encore modifier. Fournis tes notes ou un fichier existant, puis précise ce que tu veux garder : titres, tableaux, en-tête ou commentaires.',
        limitation:
          'La fidélité au modèle de départ et la pagination doivent être contrôlées dans le fichier produit.',
        source: anthropicSkill('docx'),
        check:
          'Fournis un document avec un tableau et un saut de page. Vérifie que la modification demandée conserve les deux.',
      },
      {
        name: 'xlsx',
        prompt:
          'Avec le skill xlsx, prépare un récapitulatif de ce fichier de ventes par mois. Ajoute des totaux calculés par formule. Signale les doublons et les montants absents sans les supprimer.',
        use: 'Nettoyer un tableau ou préparer un fichier Excel',
        description:
          'Choisis xlsx pour nettoyer des données, ajouter des formules ou créer un graphique dans Excel. Donne le fichier de départ et explique ce que représente chaque colonne, surtout les dates et les montants.',
        limitation: 'Un total affiché ne prouve pas que la formule se recalcule correctement.',
        source: anthropicSkill('xlsx'),
        check:
          'Modifie une valeur d’entrée après génération. Contrôle le total, les formules et le traitement des cellules vides.',
      },
      {
        name: 'pptx',
        prompt:
          'Avec le skill pptx, prépare trois diapositives à partir de ces notes et de ce modèle PowerPoint : problème, proposition, prochaine étape. Garde les textes et les graphiques modifiables.',
        use: 'Préparer une présentation PowerPoint',
        description:
          'Choisis pptx pour créer ou reprendre une présentation PowerPoint. Joins ton modèle si tu en as un, précise le public et limite le nombre de diapositives. Tu pourras ensuite retoucher le fichier.',
        limitation:
          'L’existence du fichier ne valide ni la lisibilité des slides ni le respect de ta charte.',
        source: anthropicSkill('pptx'),
        check:
          'Demande trois slides à partir de ton masque, puis ouvre-les pour contrôler les débordements et les éléments éditables.',
      },
      {
        name: 'pdf',
        prompt:
          'Avec le skill pdf, extrais le tableau de cette page dans un fichier CSV. Conserve les intitulés et les unités. Marque les valeurs illisibles au lieu de les deviner.',
        use: 'Extraire, assembler ou remplir des PDF',
        description:
          'Choisis pdf pour extraire un tableau, réunir des documents ou remplir un formulaire. Pour un scan, la reconnaissance de caractères peut récupérer le texte ; les chiffres et les colonnes méritent une relecture.',
        limitation:
          'Les scans, colonnes et tableaux demandent une vérification avec la page d’origine.',
        source: anthropicSkill('pdf'),
        check:
          'Utilise une page dont tu connais le contenu. Compare les montants et l’ordre de lecture avec l’extraction.',
      },
      {
        name: 'frontend-design',
        prompt:
          'Avec frontend-design, reprends cette page d’inscription. Rends les champs et le bouton principal faciles à repérer sur mobile. Conserve les couleurs et la typographie du site.',
        use: 'Concevoir une interface web',
        description:
          'Ce skill aide Claude à choisir la typographie, les couleurs et la disposition d’une interface web. Donne-lui la page à créer, son public et ta charte graphique. Une capture de l’existant aide à éviter une proposition hors sujet.',
        limitation:
          'Une proposition visuelle doit encore passer les contrôles d’accessibilité et être essayée sur mobile.',
        source: anthropicSkill('frontend-design'),
        check:
          'Donne un écran et son objectif, puis essaie le résultat au clavier et à 390 pixels de large.',
      },
      {
        name: 'skill-creator',
        prompt:
          'Avec skill-creator, crée un skill pour mes comptes rendus. Voici deux exemples validés. Il doit séparer décisions et propositions, puis lister les actions avec leur responsable quand il est connu.',
        use: 'Formaliser une tâche récurrente',
        description:
          'Tu redonnes les mêmes consignes à chaque réunion ? skill-creator aide à en faire un skill réutilisable. Apporte un exemple de départ et un résultat qui te convient, puis essaie la procédure sur d’autres notes.',
        limitation:
          'Une description trop large peut déclencher le skill sur des demandes sans rapport.',
        source: anthropicSkill('skill-creator'),
        check:
          'Prépare deux demandes qui doivent activer le skill et deux qui ne doivent pas l’activer. Relève les déclenchements.',
      },
    ],
    installation: [
      'Dans Claude Code, saisis la première commande ci-dessous pour ajouter le catalogue Anthropic.',
      'La deuxième commande installe les skills Word, Excel, PowerPoint et PDF. Pour frontend-design et skill-creator, choisis example-skills dans le catalogue anthropic-agent-skills.',
      'Joins une copie de ton fichier ou indique son chemin, puis reprends une des demandes proposées dans ce guide. Cite le nom du skill que tu veux utiliser.',
      'Ouvre le résultat dans ton logiciel habituel. Vérifie les éléments importants : un total qui se recalcule, une page correctement mise en forme ou des diapositives modifiables. Sur claude.ai, utilise la procédure web liée dans la documentation Anthropic.',
    ],
    command:
      '/plugin marketplace add anthropics/skills\n/plugin install document-skills@anthropic-agent-skills',
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
    heading: 'Quatre recettes pour tes tâches répétitives dans ChatGPT',
    tool: 'ChatGPT',
    kind: 'recipes',
    takeaway:
      'Commence par une tâche que tu refais souvent et un exemple de résultat qui te convient. Les quatre recettes ci-dessous sont des idées de skills à créer, pas des extensions à télécharger.',
    description:
      'Recherche, rédaction, rapport de chiffres ou compte rendu : quatre exemples pour créer un skill ChatGPT, avec les consignes à lui donner.',
    introduction:
      'Chaque semaine, tu expliques à ChatGPT comment rédiger ton compte rendu ou présenter tes chiffres. Un skill permet de garder cette méthode pour les prochaines fois. Voici quatre façons de commencer, avec des consignes que tu peux adapter à ton travail.',
    scope:
      'La création décrite ici utilise skill-creator dans ChatGPT Work, si tu y as accès. Tu peux déjà essayer les consignes dans une conversation ordinaire avec tes documents. Cela te permettra de les ajuster avant d’en faire un skill.',
    options: [
      {
        name: 'Recherche sourcée',
        prompt:
          'Compare les offres A et B à partir de leur documentation officielle. Pour chaque différence, donne le lien et la date de consultation. Si tu ne trouves pas une information, écris « non trouvé ». Termine par les points qui restent à vérifier.',
        use: 'Comparer des informations avec leurs preuves',
        description:
          'Utile quand tu compares régulièrement des outils ou prépares une veille. Indique les sources à consulter et les questions auxquelles répondre. Tu obtiendras un format que tu peux relire et vérifier d’une semaine à l’autre.',
        limitation:
          'Il faut un outil de recherche ou un connecteur adapté. Une URL citée doit soutenir la phrase qui la précède.',
        source: 'https://developers.openai.com/plugins/concepts/skills',
        check:
          'Pose une question dont tu connais une source fiable. Ouvre chaque citation et repère les phrases sans preuve.',
      },
      {
        name: 'Rédaction selon ta charte',
        prompt:
          'Réécris ce brouillon dans le ton des deux exemples joints. Garde les noms, chiffres, citations et liens. N’ajoute aucune information. Si une phrase manque de précision, signale-la après le texte.',
        use: 'Appliquer les mêmes règles à chaque texte',
        description:
          'Utile pour une newsletter ou des publications régulières. Fournis deux textes dont tu aimes le ton, le public visé et quelques formulations à éviter. Des exemples donnent une direction plus précise que « écris de façon professionnelle ».',
        limitation:
          'Le skill doit recevoir les faits et les exemples. Une consigne de ton ne fournit aucune source supplémentaire.',
        source: 'https://developers.openai.com/plugins/concepts/skills',
        check:
          'Donne un brouillon avec un nom propre, un chiffre et une citation. Vérifie leur conservation après réécriture.',
      },
      {
        name: 'Reporting récurrent',
        prompt:
          'À partir de ce fichier, prépare le bilan mensuel des ventes. Affiche le total par mois et explique le calcul. Signale les doublons et les valeurs manquantes. Compare uniquement les mois complets.',
        use: 'Reproduire un rapport à partir de données',
        description:
          'Utile si tu prépares toujours le même bilan à partir d’un tableur. Joins un fichier d’exemple et précise les calculs attendus. Décide aussi quoi faire des lignes incomplètes : les ignorer sans le dire fausserait le rapport.',
        limitation:
          'L’accès aux fichiers ou au service de données doit être disponible. Toute donnée absente doit rester identifiable.',
        source: 'https://developers.openai.com/plugins/concepts/skills',
        check:
          'Ajoute un doublon et une cellule vide à ton échantillon. Contrôle les totaux et le signalement des anomalies.',
      },
      {
        name: 'Point de suivi projet',
        prompt:
          'Transforme ces notes en compte rendu court. Sépare les décisions prises des propositions. Liste les actions avec leur responsable et leur date quand ils sont indiqués. Écris « à préciser » quand une information manque.',
        use: 'Transformer des informations en actions',
        description:
          'Utile après une réunion, quand il faut retrouver qui fait quoi. Donne les notes et le format attendu. Si tu utilises des tickets, demande le lien de chaque ticket concerné pour pouvoir revenir au contexte.',
        limitation:
          'Le connecteur projet exige ses propres autorisations. Un responsable ou une échéance non renseignés doivent être signalés.',
        source: 'https://developers.openai.com/plugins/concepts/skills',
        check:
          'Fournis des notes qui contiennent une proposition non validée. Vérifie qu’elle reste distincte d’une décision prise.',
      },
    ],
    installation: [
      'Essaie une des consignes ci-dessus avec un petit document que tu connais. Corrige la demande jusqu’à obtenir un résultat que tu souhaites réutiliser.',
      'Dans ChatGPT Work, sélectionne @skill-creator et demande-lui de transformer cette méthode en skill. Fournis tes consignes et ton exemple de résultat.',
      'Précise quand le skill doit intervenir : par exemple « quand je demande le compte rendu d’une réunion ». Si les données viennent d’un service externe, il faut aussi connecter ce service avec les droits nécessaires.',
      'Sélectionne ton nouveau skill avec @ dans une autre conversation et donne-lui de nouvelles notes. Contrôle notamment les informations manquantes : il doit les signaler, sans inventer de responsable ni de date.',
    ],
    documentation: {
      name: 'OpenAI : distribution des skills dans ChatGPT et Codex',
      url: 'https://learn.chatgpt.com/docs/build-skills',
    },
    questions: [
      {
        question: 'Comment appeler un skill dans ChatGPT ?',
        answer:
          'Si ton interface propose les skills, tape @ et sélectionne celui que tu veux utiliser. Donne ensuite ta demande et les fichiers nécessaires. La documentation OpenAI indique aussi que ChatGPT peut choisir un skill quand sa description correspond à ta demande.',
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
    heading: 'Les skills Codex qui aident à avancer sur un projet',
    tool: 'Codex',
    kind: 'catalog',
    takeaway:
      'Un contrôle GitHub échoue ? Essaie gh-fix-ci. Tu as des retours de revue à traiter ? Choisis gh-address-comments. Pour une question sur une API OpenAI, commence par openai-docs.',
    description:
      'Retrouver une réponse dans la documentation OpenAI, comprendre un test en échec ou traiter une revue GitHub : quel skill utiliser et comment l’installer.',
    introduction:
      'Un test qui bloque la livraison, des commentaires à reprendre dans une revue de code, un paramètre d’API à retrouver : les skills de Codex donnent une procédure à l’agent pour ces tâches. Voici trois ressources du catalogue OpenAI et le créateur de skills pour tes besoins propres.',
    scope:
      'Ce guide s’adresse aux personnes qui travaillent sur du code avec Codex. Les deux skills GitHub utilisent gh, l’outil GitHub en ligne de commande : il doit être installé et connecté à un compte qui peut lire ton dépôt.',
    options: [
      {
        name: 'openai-docs',
        prompt:
          'Avec openai-docs, retrouve dans la documentation officielle comment envoyer un fichier PDF à l’API Responses. Donne un exemple minimal et les liens qui expliquent les paramètres utilisés.',
        use: 'Vérifier une API ou un produit OpenAI',
        description:
          'À utiliser quand tu intègres une API OpenAI ou cherches une information sur Codex. Le skill dirige la recherche vers la documentation officielle et demande des liens pour étayer la réponse.',
        limitation:
          'La documentation ne donne pas l’état de tes comptes, de tes clés ou de ton application.',
        source: openaiSkill('openai-docs'),
        check:
          'Pose une question sur un paramètre d’API. Vérifie le lien vers la documentation et la présence de ce paramètre dans la page.',
      },
      {
        name: 'gh-fix-ci',
        prompt:
          'Avec gh-fix-ci, examine les contrôles GitHub Actions en échec sur cette pull request. Montre l’erreur utile et propose une correction. Attends mon accord avant de modifier le code.',
        use: 'Diagnostiquer une CI GitHub Actions en échec',
        description:
          'La CI regroupe les contrôles automatiques du projet. Quand l’un d’eux échoue dans GitHub Actions, ce skill lit les journaux d’exécution, recherche la cause et propose une correction à valider avant de modifier le code.',
        limitation:
          'Il faut connecter l’outil gh à GitHub. Ce skill prend en charge GitHub Actions ; pour un autre service de tests, il se limite au lien vers l’échec.',
        source: openaiSkill('gh-fix-ci'),
        check:
          'Prends un échec déjà compris. Vérifie que le diagnostic retrouve la cause et que les tests concernés passent après correction autorisée.',
      },
      {
        name: 'gh-address-comments',
        prompt:
          'Avec gh-address-comments, liste les commentaires encore à traiter sur la pull request de cette branche. Résume la modification demandée pour chacun, puis laisse-moi choisir ceux à corriger.',
        use: 'Traiter les retours d’une pull request',
        description:
          'Une pull request, ou PR, propose des changements de code à relire. Ce skill rassemble les retours de cette revue et te demande lesquels traiter. Il aide ensuite à appliquer les corrections choisies.',
        limitation:
          'Demande un accès GitHub et un choix des retours à traiter. Une suggestion de revue peut nécessiter une discussion.',
        source: openaiSkill('gh-address-comments'),
        check:
          'Choisis deux commentaires précis. Compare le diff avec chacun et vérifie les discussions qui restent ouvertes.',
      },
      {
        name: 'skill-creator',
        prompt:
          'Avec skill-creator, prépare un skill pour vérifier une migration de base de données dans ce dépôt. Utilise nos consignes et ces deux exemples de revue. Il doit analyser la migration sans l’appliquer.',
        use: 'Créer une procédure adaptée au dépôt',
        description:
          'À utiliser pour une méthode propre à ton équipe : préparer une revue, vérifier une migration ou rédiger une note de version. Fournis les consignes du dépôt et un exemple validé pour créer une première version.',
        limitation:
          'Écrire les instructions ne démontre pas leur efficacité. Il faut des entrées et des résultats attendus pour les évaluer.',
        source: 'https://learn.chatgpt.com/docs/build-skills',
        check:
          'Formalise une petite tâche connue. Essaie le skill sur un cas courant et un cas où il doit demander une précision.',
      },
    ],
    installation: [
      'Ouvre le skill dans le catalogue OpenAI. Vérifie ses fichiers, sa licence et les outils requis avant de l’ajouter à ton environnement.',
      'Dans une conversation Codex, saisis la commande ci-dessous. Remplace gh-address-comments par le nom du skill souhaité. Le créateur skill-creator fait partie des skills système.',
      'Vérifie que le skill apparaît dans la liste disponible. S’il manque, redémarre Codex. Pour les skills GitHub, assure-toi aussi que gh est connecté à ton compte.',
      'Ouvre ton projet sur une branche de travail et reprends une demande d’exemple. Relis les changements de code et lance les tests du projet avant de les publier.',
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
