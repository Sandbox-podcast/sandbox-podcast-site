import type { ChartId } from './sandbox-charts';

const COPY = {
  'fr-FR': {
    github: [
      'Classement des projets GitHub',
      'Projets open source classés selon les mesures disponibles. Consulte les rangs, les évolutions, les sources et la méthode de chaque édition.',
    ],
    skills: [
      'Classement des skills IA, agents et MCP',
      'Compare les skills IA, agents et MCP à partir des mesures d’adoption disponibles. Rangs, évolutions, sources et méthode de chaque édition.',
    ],
    models: [
      'Classement des modèles IA',
      'Compare les modèles IA selon les mesures disponibles. Retrouve les scores, les sources et les limites de chaque édition.',
    ],
    rising: [
      'Projets GitHub en accélération : Rising',
      'Suis les projets open source qui accélèrent dans les mesures GitHub de Sandbox. Consulte la période observée, les sources et la méthode.',
    ],
    archive: 'archive',
    archiveDescription:
      'Édition archivée du {edition}. Positions et mouvements conservés avec les mesures et la méthode de cette édition.',
    historyTitle: 'Archives des classements',
    historyDescription:
      'Positions et mouvements de l’édition {edition} pour les projets GitHub, les skills et les modèles IA disponibles à cette date.',
    projectTitle: 'rangs et activité GitHub',
    projectDescription:
      'Rangs, mesures GitHub et historique de {name} dans les classements Sandbox. Consulte les éditions, les sources et les dates des relevés.',
  },
  en: {
    github: [
      'GitHub project rankings',
      'Open-source projects ranked using available measurements. Explore positions, changes, sources and the methodology for each edition.',
    ],
    skills: [
      'AI skills, agents and MCP rankings',
      'Compare AI skills, agents and MCP tools using available adoption measurements. Positions, changes, sources and methodology for each edition.',
    ],
    models: [
      'AI model rankings',
      'Compare AI models using available measurements. Explore scores, sources and the limitations of each edition.',
    ],
    rising: [
      'Fast-growing GitHub projects: Rising',
      'Follow open-source projects gaining momentum in Sandbox’s GitHub measurements. Check the observation period, sources and methodology.',
    ],
    archive: 'archive',
    archiveDescription:
      'Archived edition for {edition}. Positions and movements preserved with the measurements and methodology used in that edition.',
    historyTitle: 'Ranking archives',
    historyDescription:
      'Positions and movements for edition {edition}, covering the GitHub projects, skills and AI models available on that date.',
    projectTitle: 'GitHub rankings and activity',
    projectDescription:
      'Rankings, GitHub measurements and history for {name} in Sandbox charts. Explore editions, sources and observation dates.',
  },
  'es-ES': {
    github: [
      'Clasificación de proyectos de GitHub',
      'Proyectos de código abierto clasificados según las mediciones disponibles. Consulta posiciones, cambios, fuentes y metodología de cada edición.',
    ],
    skills: [
      'Clasificación de skills de IA, agentes y MCP',
      'Compara skills de IA, agentes y herramientas MCP según las mediciones de adopción disponibles. Posiciones, cambios, fuentes y metodología.',
    ],
    models: [
      'Clasificación de modelos de IA',
      'Compara modelos de IA según las mediciones disponibles. Consulta las puntuaciones, las fuentes y las limitaciones de cada edición.',
    ],
    rising: [
      'Proyectos de GitHub en aceleración: Rising',
      'Sigue los proyectos de código abierto que aceleran en las mediciones de GitHub de Sandbox. Consulta el período observado, las fuentes y la metodología.',
    ],
    archive: 'archivo',
    archiveDescription:
      'Edición archivada del {edition}. Posiciones y movimientos conservados con las mediciones y la metodología de esa edición.',
    historyTitle: 'Archivo de clasificaciones',
    historyDescription:
      'Posiciones y movimientos de la edición {edition} de los proyectos de GitHub, skills y modelos de IA disponibles en esa fecha.',
    projectTitle: 'posiciones y actividad en GitHub',
    projectDescription:
      'Posiciones, mediciones de GitHub e historial de {name} en las clasificaciones de Sandbox. Consulta ediciones, fuentes y fechas de observación.',
  },
  'de-DE': {
    github: [
      'GitHub-Projekte im Ranking',
      'Open-Source-Projekte nach verfügbaren Messwerten. Positionen, Veränderungen, Quellen und die Methodik jeder Ausgabe im Überblick.',
    ],
    skills: [
      'KI-Skills, Agenten und MCP im Ranking',
      'Vergleiche KI-Skills, Agenten und MCP-Tools anhand verfügbarer Nutzungskennzahlen. Mit Positionen, Veränderungen, Quellen und Methodik.',
    ],
    models: [
      'KI-Modelle im Ranking',
      'Vergleiche KI-Modelle anhand verfügbarer Messwerte. Mit Bewertungen, Quellen und den Einschränkungen jeder Ausgabe.',
    ],
    rising: [
      'GitHub-Projekte mit Wachstum: Rising',
      'Verfolge Open-Source-Projekte, die in den GitHub-Messungen von Sandbox an Fahrt gewinnen. Mit Beobachtungszeitraum, Quellen und Methodik.',
    ],
    archive: 'Archiv',
    archiveDescription:
      'Archivierte Ausgabe vom {edition}. Positionen und Veränderungen mit den Messwerten und der Methodik dieser Ausgabe.',
    historyTitle: 'Ranking-Archiv',
    historyDescription:
      'Positionen und Veränderungen der Ausgabe {edition} für die damals verfügbaren GitHub-Projekte, Skills und KI-Modelle.',
    projectTitle: 'GitHub-Rang und Aktivität',
    projectDescription:
      'Ränge, GitHub-Messwerte und Verlauf von {name} in den Sandbox-Rankings. Mit Ausgaben, Quellen und Beobachtungsdaten.',
  },
} as const;

const copyFor = (locale: string) =>
  Object.hasOwn(COPY, locale) ? COPY[locale as keyof typeof COPY] : COPY['fr-FR'];

export function chartMetadataCopy(chart: ChartId, locale = 'fr-FR', edition?: string) {
  const copy = copyFor(locale);
  const [title, description] = copy[chart];
  return {
    title: edition ? `${title} : ${copy.archive} ${edition}` : title,
    description: edition
      ? `${title}. ${copy.archiveDescription.replace('{edition}', edition)}`
      : description,
  };
}

export function chartArchiveMetadataCopy(edition: string, locale = 'fr-FR') {
  const copy = copyFor(locale);
  return {
    title: `${copy.historyTitle} : ${edition}`,
    description: copy.historyDescription.replace('{edition}', edition),
  };
}

export function rankedProjectMetadataCopy(name: string, fullName: string, locale = 'fr-FR') {
  const copy = copyFor(locale);
  return {
    title: `${name} : ${copy.projectTitle}`,
    description: copy.projectDescription.replace('{name}', fullName),
  };
}
