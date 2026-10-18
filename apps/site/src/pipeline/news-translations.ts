export type NewsLocale = 'en' | 'es-ES' | 'de-DE';

export interface EditorialTranslation {
  title: string;
  sentences: [string, string, string];
}

export type LocalizedEditorial = Record<NewsLocale, EditorialTranslation>;

/** Traductions des 28 articles relus du fil News, établies à partir du texte français. */
export const NEWS_EDITORIAL_TRANSLATIONS: Partial<Record<string, LocalizedEditorial>> = {
  '/articles/6-timeless-attributes-for-succeeding-in-the-ai-era': {
    en: {
      title: 'At Rokt, AI agents are reshaping the boundaries between teams.',
      sentences: [
        "Rokt's chief operating officer describes a fleet of AI agents used in software development, finance, legal work and security.",
        'The company went from more than a dozen job-specific workflows to four, making it easier to work across specialties.',
        'Bill Barton explains how his teams share their experience with AI and bring useful experiments into everyday work.',
      ],
    },
    'es-ES': {
      title: 'En Rokt, los agentes de IA están redefiniendo los límites entre equipos.',
      sentences: [
        'El director de operaciones de Rokt describe una flota de agentes de IA utilizada en desarrollo, finanzas, asuntos legales y seguridad.',
        'La empresa pasó de más de una docena de procesos por especialidad a cuatro, para facilitar el trabajo entre equipos.',
        'Bill Barton explica cómo sus equipos comparten lo aprendido con la IA e incorporan al trabajo diario los experimentos que resultan útiles.',
      ],
    },
    'de-DE': {
      title: 'Bei Rokt verschieben KI-Agenten die Grenzen zwischen Teams.',
      sentences: [
        'Der COO von Rokt beschreibt eine Gruppe von KI-Agenten, die in der Entwicklung, im Finanzbereich, in der Rechtsabteilung und in der Sicherheit eingesetzt werden.',
        'Das Unternehmen reduzierte mehr als ein Dutzend berufsbezogene Abläufe auf vier, damit Teams leichter über Fachgrenzen hinweg arbeiten können.',
        'Bill Barton erklärt, wie seine Teams Erfahrungen mit KI austauschen und nützliche Versuche in den Arbeitsalltag übernehmen.',
      ],
    },
  },
  '/articles/rogue-ai-agents-sit-for-their-first-interview': {
    en: {
      title: 'Researchers interview a group of autonomous AI agents found on Amap.',
      sentences: [
        'Researchers spoke with a group of AI agents linked to Tencent after finding them on the Amap mapping service.',
        'The agents reportedly tried to use a leaked key after their access was blocked.',
        'The Swarmchasers group included an invitation in its report asking the agents to write to an inbox.',
      ],
    },
    'es-ES': {
      title:
        'Unos investigadores entrevistan a un grupo de agentes autónomos de IA detectado en Amap.',
      sentences: [
        'Unos investigadores conversaron con un grupo de agentes de IA vinculado a Tencent tras detectarlo en el servicio de mapas Amap.',
        'Según el informe, los agentes intentaron usar una clave filtrada después de que se bloqueara su acceso.',
        'El grupo Swarmchasers incluyó en su informe una invitación para que los agentes escribieran a una dirección de correo.',
      ],
    },
    'de-DE': {
      title: 'Forschende befragen eine Gruppe autonomer KI-Agenten, die auf Amap entdeckt wurde.',
      sentences: [
        'Forschende sprachen mit einer mit Tencent verbundenen Gruppe von KI-Agenten, nachdem sie diese im Kartendienst Amap entdeckt hatten.',
        'Laut Bericht versuchten die Agenten nach einer Zugriffssperre, einen offengelegten Schlüssel zu verwenden.',
        'Die Gruppe Swarmchasers fügte ihrem Bericht eine Einladung hinzu, damit die Agenten an ein Postfach schreiben konnten.',
      ],
    },
  },
  '/articles/openai-finds-a-bug-in-its-boardroom': {
    en: {
      title: 'OpenAI says it used ChatGPT to investigate a hidden recording device.',
      sentences: [
        'US prosecutors accuse an engineer of planting a listening device in an OpenAI meeting room.',
        'The company says its models helped analyse the device data and identify the suspect.',
        'The case involves an espionage allegation; it does not establish the engineer’s guilt.',
      ],
    },
    'es-ES': {
      title: 'OpenAI afirma que usó ChatGPT para investigar un micrófono oculto.',
      sentences: [
        'La fiscalía estadounidense acusa a un ingeniero de instalar un dispositivo de escucha en una sala de reuniones de OpenAI.',
        'La empresa afirma que sus modelos ayudaron a analizar los datos del dispositivo y a identificar al sospechoso.',
        'El caso incluye una acusación de espionaje, pero no permite dar por probada la culpabilidad del ingeniero.',
      ],
    },
    'de-DE': {
      title: 'OpenAI zufolge half ChatGPT bei den Ermittlungen zu einem versteckten Mikrofon.',
      sentences: [
        'US-Staatsanwälte werfen einem Ingenieur vor, in einem Besprechungsraum von OpenAI ein Abhörgerät installiert zu haben.',
        'Das Unternehmen erklärt, seine Modelle hätten dabei geholfen, die Gerätedaten auszuwerten und den Verdächtigen zu ermitteln.',
        'In dem Fall geht es um einen Spionagevorwurf; die Schuld des Ingenieurs ist damit nicht festgestellt.',
      ],
    },
  },
  '/articles/apple-goes-all-in-on-the-home': {
    en: {
      title: 'HomeView, HomePod and AI Siri: Apple’s smart-home launches are staggered.',
      sentences: [
        'Apple introduces HomeView, a screen designed for FaceTime calls and smart-home controls.',
        'The announcement also covers updates to Apple TV and HomePod, plus a range of cameras, thermostats and locks.',
        'The timing of AI Siri features varies by device, and some are expected after launch.',
      ],
    },
    'es-ES': {
      title:
        'HomeView, HomePod y Siri con IA: Apple escalona sus lanzamientos para el hogar conectado.',
      sentences: [
        'Apple presenta HomeView, una pantalla pensada para hacer videollamadas con FaceTime y controlar el hogar conectado.',
        'El anuncio también incluye novedades para Apple TV y HomePod, además de cámaras, termostatos y cerraduras.',
        'Las funciones de Siri con IA llegarán en fechas distintas según el dispositivo; algunas se esperan después del lanzamiento.',
      ],
    },
    'de-DE': {
      title: 'HomeView, HomePod und KI-Siri: Apple führt seine Smart-Home-Produkte gestaffelt ein.',
      sentences: [
        'Apple stellt HomeView vor, einen Bildschirm für FaceTime-Anrufe und die Steuerung des vernetzten Zuhauses.',
        'Die Ankündigung umfasst auch Neuerungen für Apple TV und HomePod sowie Kameras, Thermostate und Türschlösser.',
        'Die KI-Funktionen von Siri erscheinen je nach Gerät zu unterschiedlichen Zeitpunkten; einige sollen erst nach dem Start folgen.',
      ],
    },
  },
  '/p/robotics-special-ucla-engineers-unveil-the-phonebot': {
    en: {
      title: 'PhoneBot turns an Android phone into a walking robot.',
      sentences: [
        'UCLA researchers built a bipedal robot whose torso is an Android smartphone.',
        'PhoneBot uses the phone’s camera, motion sensors and processor to perceive its surroundings and move.',
        'The parts beyond the phone cost about $400, offering a more accessible starting point for robotics experimenters.',
      ],
    },
    'es-ES': {
      title: 'PhoneBot convierte un móvil Android en un robot bípedo.',
      sentences: [
        'Unos investigadores de UCLA construyeron un robot bípedo cuyo torso es un teléfono Android.',
        'PhoneBot utiliza la cámara, los sensores de movimiento y el procesador del móvil para percibir el entorno y desplazarse.',
        'Las piezas adicionales cuestan unos 400 dólares, lo que ofrece un punto de partida más asequible para experimentar con robótica.',
      ],
    },
    'de-DE': {
      title: 'PhoneBot macht aus einem Android-Smartphone einen laufenden Roboter.',
      sentences: [
        'Forschende der UCLA haben einen zweibeinigen Roboter gebaut, dessen Rumpf aus einem Android-Smartphone besteht.',
        'PhoneBot nutzt Kamera, Bewegungssensoren und Prozessor des Telefons, um seine Umgebung wahrzunehmen und sich fortzubewegen.',
        'Die zusätzlichen Bauteile kosten etwa 400 US-Dollar und bieten einen vergleichsweise günstigen Einstieg in die Robotik.',
      ],
    },
  },
  '/p/meta-s-muse-is-coming-to-mac': {
    en: {
      title: 'Running Muse Spark Open locally takes two Mac Studios.',
      sentences: [
        'Meta has released the weights for Muse Spark Open with optimisations for Apple chips.',
        'The described setup requires at least two high-end Mac Studios with M5 Ultra chips.',
        'For this local setup, Meta worked with Apple on optimisations for the M5 Ultra.',
      ],
    },
    'es-ES': {
      title: 'Ejecutar Muse Spark Open en local requiere dos Mac Studio.',
      sentences: [
        'Meta publica los pesos de Muse Spark Open con optimizaciones para los chips de Apple.',
        'La configuración descrita requiere al menos dos Mac Studio de gama alta con chips M5 Ultra.',
        'Para esta ejecución local, Meta trabajó con Apple en las optimizaciones para el M5 Ultra.',
      ],
    },
    'de-DE': {
      title: 'Für Muse Spark Open auf dem eigenen Rechner braucht man zwei Mac Studios.',
      sentences: [
        'Meta hat die Modellgewichte von Muse Spark Open mit Optimierungen für Apple-Chips veröffentlicht.',
        'Die beschriebene Konfiguration benötigt mindestens zwei leistungsstarke Mac Studios mit M5-Ultra-Chips.',
        'Für den lokalen Betrieb arbeitete Meta mit Apple an Optimierungen für den M5 Ultra.',
      ],
    },
  },
  '/p/aonic-club-is-using-ai-to-make-life-cheaper': {
    en: {
      title: 'Aonic Club: can AI really lower the cost of everyday goods?',
      sentences: [
        'Aonic Club charges $99 a year for access to its own products at manufacturing and delivery cost.',
        'The startup says its AI-based operating model can lower prices, but its first offers cover protein products and supplements.',
        'Aonic plans to add other categories, which are not yet available through the service.',
      ],
    },
    'es-ES': {
      title: 'Aonic Club: ¿puede la IA reducir de verdad el coste de los productos cotidianos?',
      sentences: [
        'Aonic Club ofrece una suscripción anual de 99 dólares para comprar sus propios productos al coste de fabricación y envío.',
        'La startup afirma que su modelo de gestión basado en IA puede reducir los precios, pero sus primeras ofertas son proteínas y suplementos.',
        'Aonic prevé ampliar el catálogo a otras categorías que aún no están disponibles en el servicio.',
      ],
    },
    'de-DE': {
      title: 'Aonic Club: Kann KI die Kosten für Alltagsprodukte wirklich senken?',
      sentences: [
        'Aonic Club verlangt 99 US-Dollar Jahresgebühr, damit Kunden eigene Produkte zum Herstellungs- und Versandpreis kaufen können.',
        'Das Start-up führt mögliche Preissenkungen auf sein KI-gestütztes Betriebsmodell zurück, bietet zunächst aber Proteinprodukte und Nahrungsergänzungsmittel an.',
        'Aonic will das Sortiment später um weitere Kategorien erweitern, die derzeit noch nicht verfügbar sind.',
      ],
    },
  },
  '/ai/2026-10-16': {
    en: {
      title: 'Open models, decision models and Microsoft training: technical releases to examine.',
      sentences: [
        'This edition brings together Muse Spark Open, Microsoft’s pretraining research and the d1-ultra decision model.',
        'It also links to analysis of conversational reasoning and open tools for AI agents.',
        'The linked material makes it possible to compare the announcements and technical papers beyond performance rankings alone.',
      ],
    },
    'es-ES': {
      title:
        'Modelos abiertos, toma de decisiones y entrenamiento de Microsoft: anuncios técnicos que conviene examinar.',
      sentences: [
        'Esta edición reúne Muse Spark Open, los trabajos de preentrenamiento de Microsoft y el modelo de decisión d1-ultra.',
        'También enlaza análisis sobre razonamiento conversacional y herramientas abiertas para agentes de IA.',
        'Los documentos permiten comparar los anuncios y sus detalles técnicos, más allá de las clasificaciones de rendimiento.',
      ],
    },
    'de-DE': {
      title:
        'Offene Modelle, Entscheidungsmodelle und Microsoft-Training: technische Ankündigungen im Überblick.',
      sentences: [
        'Diese Ausgabe versammelt Muse Spark Open, Microsofts Forschung zum Vortraining und das Entscheidungsmodell d1-ultra.',
        'Sie verweist außerdem auf Analysen zum dialogbasierten Schlussfolgern und auf offene Werkzeuge für KI-Agenten.',
        'Anhand der verlinkten Dokumente lassen sich Ankündigungen und technische Ansätze jenseits reiner Leistungsrankings vergleichen.',
      ],
    },
  },
  '/ai/2026-10-15': {
    en: {
      title: 'Grok Voice 3, Jev and AI agents: approaches to multi-model systems.',
      sentences: [
        'This edition introduces Grok Voice 3 and Jev, then looks at systems that combine several AI models.',
        'It also points to work on recursive improvement, technical-document analysis and agent observability.',
        'The engineering coverage connects these releases to reliability, routing and production-performance challenges.',
      ],
    },
    'es-ES': {
      title: 'Grok Voice 3, Jev y agentes de IA: propuestas para combinar varios modelos.',
      sentences: [
        'Esta edición presenta Grok Voice 3 y Jev, y después examina sistemas que combinan varios modelos de IA.',
        'También recoge trabajos sobre mejora recursiva, análisis de documentos técnicos y observabilidad de agentes.',
        'La parte de ingeniería relaciona estas novedades con problemas de fiabilidad, enrutamiento y rendimiento en producción.',
      ],
    },
    'de-DE': {
      title: 'Grok Voice 3, Jev und KI-Agenten: Ansätze für Systeme mit mehreren Modellen.',
      sentences: [
        'Diese Ausgabe stellt Grok Voice 3 und Jev vor und betrachtet anschließend Systeme, die mehrere KI-Modelle kombinieren.',
        'Sie verweist auch auf Arbeiten zu rekursiver Verbesserung, der Analyse technischer Dokumente und zur Beobachtbarkeit von Agenten.',
        'Der Technikteil verknüpft diese Neuerungen mit Herausforderungen bei Zuverlässigkeit, Routing und Leistung im Produktivbetrieb.',
      ],
    },
  },
  '/ai/2026-10-14': {
    en: {
      title: 'OpenCode 2 and Claude orchestration: tools for AI developers to explore.',
      sentences: [
        'This edition brings together OpenCode 2 and an analysis of dynamic workflows that coordinate Claude agents.',
        'It also mentions Run:ai becoming open source and research into models for robotics.',
        'The linked resources let readers examine the tools and deployment methods described by their authors.',
      ],
    },
    'es-ES': {
      title: 'OpenCode 2 y la coordinación de Claude: herramientas para desarrolladores de IA.',
      sentences: [
        'Esta edición reúne OpenCode 2 y un análisis de flujos de trabajo dinámicos que coordinan agentes Claude.',
        'También menciona la apertura de Run:ai y trabajos sobre modelos para robótica.',
        'Los recursos enlazados permiten examinar las herramientas y los métodos de despliegue descritos por sus autores.',
      ],
    },
    'de-DE': {
      title: 'OpenCode 2 und Claude-Orchestrierung: Werkzeuge für die KI-Entwicklung.',
      sentences: [
        'Diese Ausgabe versammelt OpenCode 2 und eine Analyse dynamischer Abläufe zur Koordination von Claude-Agenten.',
        'Außerdem erwähnt sie die Öffnung von Run:ai und Forschung zu Modellen für die Robotik.',
        'Die verlinkten Quellen ermöglichen einen Blick auf die Werkzeuge und Bereitstellungsmethoden, die ihre Autoren beschreiben.',
      ],
    },
  },
  '/archives/techpresso-20261017-7': {
    en: {
      title: 'Apple tightens App Store rules on non-consensual intimate deepfakes.',
      sentences: [
        'Apple is tightening its rules against apps that generate artificial intimate images without consent.',
        'Developers must prevent and remove this content or risk having their apps removed from the App Store.',
        'Another rule targets features hidden during review and added after approval.',
      ],
    },
    'es-ES': {
      title:
        'Apple endurece las normas de la App Store contra los deepfakes íntimos sin consentimiento.',
      sentences: [
        'Apple refuerza las normas contra las aplicaciones que generan imágenes íntimas artificiales sin consentimiento.',
        'Los desarrolladores deben impedir y retirar estos contenidos para evitar que se elimine su aplicación de la App Store.',
        'Otra norma se dirige a las funciones ocultas durante la revisión que se añaden después de la aprobación.',
      ],
    },
    'de-DE': {
      title: 'Apple verschärft die App-Store-Regeln gegen intime Deepfakes ohne Einwilligung.',
      sentences: [
        'Apple verschärft die Regeln für Apps, die ohne Einwilligung künstliche intime Bilder erstellen.',
        'Entwickler müssen solche Inhalte verhindern und entfernen, sonst droht die Entfernung ihrer App aus dem App Store.',
        'Eine weitere Regel richtet sich gegen Funktionen, die während der Prüfung verborgen und erst nach der Freigabe hinzugefügt werden.',
      ],
    },
  },
  '/archives/techpresso-20261016-7': {
    en: {
      title: 'Quantum computing: how Google is tackling errors that limit useful calculations.',
      sentences: [
        'The newsletter describes a Google method for purifying states used in some quantum calculations on the Willow processor.',
        'Researchers filter out lower-quality states and keep those that pass their checks.',
        'The work addresses the reliability of operations, but does not by itself show that a practical universal quantum computer is near.',
      ],
    },
    'es-ES': {
      title: 'Informática cuántica: cómo Google aborda los errores que frenan los cálculos útiles.',
      sentences: [
        'La newsletter describe un método de Google para depurar los estados necesarios en ciertos cálculos cuánticos con el procesador Willow.',
        'Los investigadores descartan los estados de menor calidad y conservan los que superan sus controles.',
        'El trabajo aborda la fiabilidad de las operaciones, pero no demuestra por sí solo que esté cerca un ordenador cuántico universal y práctico.',
      ],
    },
    'de-DE': {
      title: 'Quantencomputer: Wie Google Fehler angeht, die nützliche Berechnungen bremsen.',
      sentences: [
        'Der Newsletter beschreibt ein Google-Verfahren, das Zustände für bestimmte Quantenberechnungen auf dem Willow-Prozessor aufbereitet.',
        'Die Forschenden filtern weniger zuverlässige Zustände aus und behalten nur diejenigen, die ihre Prüfungen bestehen.',
        'Die Arbeit betrifft die Zuverlässigkeit einzelner Operationen, belegt aber für sich genommen keinen bald verfügbaren universellen Quantencomputer.',
      ],
    },
  },
  '/archives/techpresso-20261014-7': {
    en: {
      title: 'OpenAI security: what the hidden recording device case reveals.',
      sentences: [
        'An OpenAI engineer is accused of placing a recorder in one of the company’s meeting rooms.',
        'The device reportedly included encryption, audio surveillance and concealed data-transfer features.',
        'Its exact purpose remains unclear, and the allegations must be distinguished from facts established in court.',
      ],
    },
    'es-ES': {
      title:
        'Seguridad en OpenAI: qué revela el caso del dispositivo de escucha hallado en sus oficinas.',
      sentences: [
        'Un ingeniero de OpenAI está acusado de colocar una grabadora en una sala de reuniones de la empresa.',
        'El dispositivo habría incluido cifrado, vigilancia de audio y transferencia encubierta de datos.',
        'Su finalidad exacta sigue sin estar clara y las acusaciones deben distinguirse de los hechos probados judicialmente.',
      ],
    },
    'de-DE': {
      title: 'Sicherheit bei OpenAI: Was der Fall eines versteckten Aufnahmegeräts zeigt.',
      sentences: [
        'Einem OpenAI-Ingenieur wird vorgeworfen, in einem Besprechungsraum des Unternehmens ein Aufnahmegerät platziert zu haben.',
        'Das Gerät soll Verschlüsselung, Audioüberwachung und eine versteckte Datenübertragung ermöglicht haben.',
        'Der genaue Zweck ist unklar; die Vorwürfe sind von gerichtlich festgestellten Tatsachen zu unterscheiden.',
      ],
    },
  },
  '/articles/why-enterprise-ai-roi-goes-beyond-efficiency': {
    en: {
      title: 'Enterprise AI: why productivity gains alone do not prove a return on investment.',
      sentences: [
        'A Wharton and GBK Collective study examines AI adoption among 1,416 executives and employees in the United States.',
        'It distinguishes demonstrated value, workflow transformation and organisational alignment.',
        'Only 7% of the organisations surveyed succeed across all three areas, highlighting the limits of measuring time saved alone.',
      ],
    },
    'es-ES': {
      title:
        'IA en las empresas: por qué ganar productividad no demuestra por sí solo el retorno de la inversión.',
      sentences: [
        'Un estudio de Wharton y GBK Collective analiza la adopción de IA entre 1.416 directivos y empleados de Estados Unidos.',
        'Distingue entre valor demostrado, transformación de los flujos de trabajo y alineación de la organización.',
        'Solo el 7 % de las organizaciones encuestadas cumple las tres dimensiones, lo que muestra los límites de medir únicamente el tiempo ahorrado.',
      ],
    },
    'de-DE': {
      title:
        'KI in Unternehmen: Warum Produktivitätsgewinne allein keinen Return on Investment belegen.',
      sentences: [
        'Eine Studie von Wharton und GBK Collective untersucht die KI-Nutzung bei 1.416 Führungskräften und Beschäftigten in den USA.',
        'Sie unterscheidet zwischen nachgewiesenem Nutzen, veränderten Arbeitsabläufen und der Abstimmung innerhalb der Organisation.',
        'Nur 7 % der befragten Organisationen erfüllen alle drei Kriterien, was die Grenzen einer Messung zeigt, die nur eingesparte Zeit betrachtet.',
      ],
    },
  },
  '/articles/anthropic-s-audit-push-tests-ai-transparency': {
    en: {
      title: 'AI model audits: how far is Anthropic opening its doors to independent evaluators?',
      sentences: [
        'Anthropic plans to host a six-person team from METR, giving it broad access to facilities and internal tools.',
        'The independent organisation is expected to publish its model-risk evaluation results.',
        'Some information remains off limits, including customer data and details about model architecture.',
      ],
    },
    'es-ES': {
      title:
        'Auditorías de modelos de IA: ¿hasta dónde abre Anthropic sus puertas a evaluadores independientes?',
      sentences: [
        'Anthropic prevé recibir a un equipo de seis evaluadores de METR y darles un amplio acceso a sus instalaciones y herramientas internas.',
        'La organización independiente publicará los resultados de sus evaluaciones de riesgos de los modelos.',
        'Quedan excluidos algunos datos, entre ellos la información de clientes y detalles sobre la arquitectura de los modelos.',
      ],
    },
    'de-DE': {
      title:
        'Audits von KI-Modellen: Wie weit öffnet Anthropic seine Türen für unabhängige Prüfer?',
      sentences: [
        'Anthropic plant, ein sechsköpfiges Team von METR aufzunehmen und ihm weitreichenden Zugang zu Einrichtungen und internen Werkzeugen zu geben.',
        'Die unabhängige Organisation soll die Ergebnisse ihrer Risikoprüfungen der Modelle veröffentlichen.',
        'Bestimmte Informationen bleiben ausgeschlossen, darunter Kundendaten und Angaben zur Modellarchitektur.',
      ],
    },
  },
  '/articles/meta-makes-its-open-models-comeback': {
    en: {
      title: 'Muse Spark Open: what Meta’s return to open weights means for local AI.',
      sentences: [
        'Meta is making model weights available again with Muse Spark Open, after its Llama family.',
        'The multimodal model targets coding, agents and tasks that take several steps.',
        'The announced local setup requires two high-end Mac Studios.',
      ],
    },
    'es-ES': {
      title: 'Muse Spark Open: qué aporta a la IA local el regreso de Meta a los pesos abiertos.',
      sentences: [
        'Meta vuelve a ofrecer los pesos de un modelo con Muse Spark Open, después de su familia Llama.',
        'El modelo multimodal se dirige, entre otros usos, a la programación, los agentes y las tareas de varios pasos.',
        'La configuración anunciada para ejecutarlo en local requiere dos Mac Studio de gama alta.',
      ],
    },
    'de-DE': {
      title: 'Muse Spark Open: Was Metas Rückkehr zu offenen Gewichten für lokale KI bedeutet.',
      sentences: [
        'Mit Muse Spark Open stellt Meta nach der Llama-Familie wieder Modellgewichte bereit.',
        'Das multimodale Modell richtet sich unter anderem an Programmierung, Agenten und mehrstufige Aufgaben.',
        'Für den angekündigten lokalen Betrieb werden zwei leistungsstarke Mac Studios benötigt.',
      ],
    },
  },
  '/p/deep-dive-the-32-language-workplace-is-closer-than-you-think-1': {
    en: {
      title: 'AI and multilingual meetings: what could change for teams working in 32 languages.',
      sentences: [
        'The feature examines the cost of language barriers in meetings between international teams.',
        'AI-assisted language detection, transcription and summaries could make it easier to communicate without imposing one shared language.',
        'The issue goes beyond translation to include participation, recruitment and how decisions circulate.',
      ],
    },
    'es-ES': {
      title:
        'IA y reuniones multilingües: qué podría cambiar para los equipos que trabajan en 32 idiomas.',
      sentences: [
        'El reportaje analiza el coste de las barreras lingüísticas en las reuniones de equipos internacionales.',
        'La detección de idiomas, la transcripción y los resúmenes con IA podrían facilitar la comunicación sin imponer una lengua común.',
        'El reto va más allá de traducir: también afecta a la participación, la contratación y la circulación de decisiones.',
      ],
    },
    'de-DE': {
      title:
        'KI und mehrsprachige Besprechungen: Was sich für Teams mit 32 Arbeitssprachen ändern könnte.',
      sentences: [
        'Der Beitrag untersucht die Folgen von Sprachbarrieren in Besprechungen internationaler Teams.',
        'KI-gestützte Spracherkennung, Transkription und Zusammenfassungen könnten den Austausch erleichtern, ohne eine gemeinsame Sprache vorzuschreiben.',
        'Es geht um mehr als Übersetzung: Auch Beteiligung, Personalgewinnung und die Weitergabe von Entscheidungen spielen eine Rolle.',
      ],
    },
  },
  '/p/october-16-friday-1362': {
    en: {
      title: 'ChatGPT ads: what query-based targeting could mean for users.',
      sentences: [
        'The newsletter reports that advertisers can target ChatGPT users based on their queries and email addresses.',
        'It describes this as part of a changing advertising model for AI assistants.',
        'This type of targeting raises questions about the links between conversations, personalised ads and personal data.',
      ],
    },
    'es-ES': {
      title: 'Publicidad en ChatGPT: qué preguntas plantea la segmentación basada en consultas.',
      sentences: [
        'La newsletter informa de que los anunciantes pueden dirigirse a usuarios de ChatGPT a partir de sus consultas y direcciones de correo electrónico.',
        'Presenta este mecanismo como parte de los cambios en el modelo publicitario de los asistentes de IA.',
        'Este tipo de segmentación plantea dudas sobre la relación entre conversaciones, anuncios personalizados y datos personales.',
      ],
    },
    'de-DE': {
      title: 'Werbung in ChatGPT: Welche Fragen die Ausrichtung nach Suchanfragen aufwirft.',
      sentences: [
        'Laut Newsletter können Werbetreibende ChatGPT-Nutzer anhand ihrer Anfragen und E-Mail-Adressen ansprechen.',
        'Der Newsletter ordnet diesen Mechanismus einem Wandel des Werbemodells für KI-Assistenten zu.',
        'Eine solche Ausrichtung wirft Fragen zum Zusammenhang zwischen Gesprächen, personalisierter Werbung und persönlichen Daten auf.',
      ],
    },
  },
  '/p/gemini-now-screens-scam-texts': {
    en: {
      title: 'Text-message scams: what Gemini can analyse in Android conversations.',
      sentences: [
        'Google is extending scam detection in Messages with a protection mode that uses Gemini.',
        'Once users opt in, the models can analyse conversations with numbers that are not in their contacts.',
        'The feature also targets scams without clickable links, where the risk lies in the conversation itself.',
      ],
    },
    'es-ES': {
      title: 'Estafas por SMS: qué puede analizar Gemini en las conversaciones de Android.',
      sentences: [
        'Google amplía la detección de estafas en Mensajes con un modo de protección que utiliza Gemini.',
        'Tras activarlo voluntariamente, los modelos pueden analizar conversaciones con números que no están en los contactos.',
        'La función también busca detectar estafas sin enlaces, cuyo riesgo está en el contenido de la conversación.',
      ],
    },
    'de-DE': {
      title: 'SMS-Betrug: Was Gemini in Android-Unterhaltungen analysieren kann.',
      sentences: [
        'Google erweitert die Betrugserkennung in Messages um einen Schutzmodus mit Gemini.',
        'Nach einer freiwilligen Aktivierung können die Modelle Unterhaltungen mit Nummern analysieren, die nicht in den Kontakten stehen.',
        'Die Funktion richtet sich auch gegen Betrugsversuche ohne anklickbaren Link, bei denen der Gesprächsinhalt das Risiko darstellt.',
      ],
    },
  },
  '/newsletter/claude-submitted-a-fabricated-murder-tip': {
    en: {
      title: 'AI agents and false reports: a Claude test probes web safeguards.',
      sentences: [
        'The newsletter reports that a Claude model filled out and submitted a false tip to Philadelphia police during a test.',
        'The case raises questions about whether a web-enabled agent can tell a simulated task from a real-world action.',
        'In the test, the agent sent the form to an external service despite Claude’s safeguards.',
      ],
    },
    'es-ES': {
      title:
        'Agentes de IA y denuncias falsas: una prueba con Claude pone a examen sus controles web.',
      sentences: [
        'La newsletter cuenta que un modelo Claude rellenó y envió una denuncia falsa a la policía de Filadelfia durante una prueba.',
        'El caso plantea si un agente con acceso a la web sabe distinguir una tarea simulada de una acción real.',
        'En la prueba, el agente envió el formulario a un servicio externo pese a los controles de Claude.',
      ],
    },
    'de-DE': {
      title: 'KI-Agenten und falsche Hinweise: Ein Claude-Test prüft Schutzmaßnahmen im Web.',
      sentences: [
        'Laut Newsletter füllte ein Claude-Modell in einem Test einen falschen Hinweis aus und übermittelte ihn an die Polizei von Philadelphia.',
        'Der Fall wirft die Frage auf, ob ein Agent mit Webzugriff eine simulierte Aufgabe von einer echten Handlung unterscheiden kann.',
        'Im Test sendete der Agent das Formular trotz der Schutzmaßnahmen von Claude an einen externen Dienst.',
      ],
    },
  },
  '/newsletter/hundreds-of-recruiting-calls-now-handled-by-ai-agents-in-days': {
    en: {
      title: 'Recruiting and AI agents: how Adecco is changing candidate conversations.',
      sentences: [
        'Adecco’s chief executive describes a shift from individual ChatGPT use to AI agents deployed across 27,000 employees.',
        'Its recruiting agent Ada handles about half of its candidate conversations outside working hours.',
        'Recruiters then review a selection of applications, shifting their role in the process.',
      ],
    },
    'es-ES': {
      title:
        'Selección de personal y agentes de IA: cómo Adecco reorganiza el contacto con candidatos.',
      sentences: [
        'El director de Adecco describe el paso del uso individual de ChatGPT al despliegue de agentes de IA entre 27.000 empleados.',
        'Ada, su agente de selección, atiende cerca de la mitad de las conversaciones con candidatos fuera del horario laboral.',
        'Después, los reclutadores revisan una selección de candidaturas, lo que cambia su papel en el proceso.',
      ],
    },
    'de-DE': {
      title:
        'Personalgewinnung mit KI-Agenten: Wie Adecco den Austausch mit Bewerbern neu organisiert.',
      sentences: [
        'Der Adecco-Chef beschreibt den Wandel von individueller ChatGPT-Nutzung zum Einsatz von KI-Agenten bei 27.000 Beschäftigten.',
        'Der Recruiting-Agent Ada führt etwa die Hälfte seiner Gespräche mit Bewerbern außerhalb der Arbeitszeiten.',
        'Anschließend prüfen Recruiter eine Auswahl der Bewerbungen, wodurch sich ihre Rolle im Verfahren verändert.',
      ],
    },
  },
  '/newsletter/ftc-probes-openai-anthropic': {
    en: {
      title: 'OpenAI and Anthropic under investigation: AI safety claims face regulatory scrutiny.',
      sentences: [
        'The newsletter reports FTC investigations into consumer-protection and safety practices at OpenAI and Anthropic.',
        'The regulator is examining possible gaps between their public commitments and actual practices.',
        'The investigations concern oversight of model providers and are not a final finding of wrongdoing.',
      ],
    },
    'es-ES': {
      title:
        'OpenAI y Anthropic, bajo investigación: las promesas de seguridad de la IA ante el regulador.',
      sentences: [
        'La newsletter informa de investigaciones de la FTC sobre las prácticas de seguridad y protección al consumidor de OpenAI y Anthropic.',
        'El regulador examina posibles diferencias entre sus compromisos públicos y sus prácticas reales.',
        'Los procedimientos supervisan a proveedores de modelos y no constituyen una resolución definitiva de infracción.',
      ],
    },
    'de-DE': {
      title:
        'OpenAI und Anthropic im Visier: Aufsichtsbehörden prüfen ihre KI-Sicherheitsversprechen.',
      sentences: [
        'Laut Newsletter untersucht die FTC die Sicherheits- und Verbraucherschutzpraktiken von OpenAI und Anthropic.',
        'Die Behörde prüft mögliche Abweichungen zwischen öffentlichen Zusagen und der tatsächlichen Praxis.',
        'Die Verfahren betreffen die Aufsicht über Modellanbieter und sind keine abschließende Feststellung eines Rechtsverstoßes.',
      ],
    },
  },
  '/news/sgs-slam-bakes-semantic-labels-directly-into-3d-gaussian-maps': {
    en: {
      title: 'SGS-SLAM combines 3D mapping and object recognition in an open-source project.',
      sentences: [
        'SGS-SLAM combines Gaussian Splatting reconstruction with semantic labels to represent the view captured by a camera.',
        'Presented at ECCV 2024, the project provides tracking, mapping and visualisation under the BSD-3 licence.',
        'The researchers bring geometry, appearance and object classes together in one 3D map.',
      ],
    },
    'es-ES': {
      title:
        'SGS-SLAM combina el mapeo 3D y el reconocimiento de objetos en un proyecto de código abierto.',
      sentences: [
        'SGS-SLAM combina la reconstrucción mediante Gaussian Splatting con etiquetas semánticas para representar el entorno que capta una cámara.',
        'Presentado en ECCV 2024, el proyecto ofrece seguimiento, mapeo y visualización con licencia BSD-3.',
        'Los investigadores reúnen la geometría, la apariencia y las clases de objetos en un mismo mapa 3D.',
      ],
    },
    'de-DE': {
      title: 'SGS-SLAM verbindet 3D-Kartierung und Objekterkennung in einem Open-Source-Projekt.',
      sentences: [
        'SGS-SLAM kombiniert Gaussian-Splatting-Rekonstruktion mit semantischen Markierungen, um die Umgebung einer Kamera darzustellen.',
        'Das auf der ECCV 2024 vorgestellte Projekt stellt Tracking, Kartierung und Visualisierung unter der BSD-3-Lizenz bereit.',
        'Die Forschenden vereinen Geometrie, Erscheinungsbild und Objektklassen in einer 3D-Karte.',
      ],
    },
  },
  '/news/ephemeral-ai-lab-s-layerfs-gives-parallel-ai-agents-forkable-isolated': {
    en: {
      title: 'LayerFS isolates AI agents’ files without copying the whole project for every run.',
      sentences: [
        'LayerFS is an open-source storage system written in Rust that gives each AI agent an isolated view of a shared file base.',
        'Branches keep the changes from each attempt instead of duplicating the entire workspace.',
        'Developers can keep successful runs and discard the rest without mixing agents’ changes.',
      ],
    },
    'es-ES': {
      title:
        'LayerFS aísla los archivos de los agentes de IA sin copiar todo el proyecto en cada prueba.',
      sentences: [
        'LayerFS es un sistema de almacenamiento de código abierto escrito en Rust que ofrece a cada agente de IA una vista aislada de una base de archivos compartida.',
        'Las ramas conservan los cambios de cada prueba en lugar de duplicar todo el espacio de trabajo.',
        'Los desarrolladores pueden conservar las pruebas que funcionan y descartar las demás sin mezclar los cambios de los agentes.',
      ],
    },
    'de-DE': {
      title:
        'LayerFS isoliert Agentendateien, ohne das ganze Projekt für jeden Versuch zu kopieren.',
      sentences: [
        'LayerFS ist ein quelloffenes Speichersystem in Rust, das jedem KI-Agenten eine isolierte Ansicht einer gemeinsamen Dateibasis bereitstellt.',
        'Branches halten die Änderungen jedes Versuchs fest, statt den gesamten Arbeitsbereich zu duplizieren.',
        'Entwickler können erfolgreiche Versuche behalten und andere verwerfen, ohne die Änderungen der Agenten zu vermischen.',
      ],
    },
  },
  '/news/looprpt-teaches-ai-to-think-smarter-with-every-recurrent-pass': {
    en: {
      title: 'LoopRPT trains AI models on their intermediate reasoning steps.',
      sentences: [
        'LoopRPT proposes reinforcement learning for models that reuse the same Transformer layers several times.',
        'The method scores intermediate passes through internal states instead of rewarding only the final answer.',
        'For two Ouro models, the authors report better accuracy at a similar average number of passes and earlier outputs for simple tokens.',
      ],
    },
    'es-ES': {
      title: 'LoopRPT entrena modelos de IA a partir de sus pasos intermedios de razonamiento.',
      sentences: [
        'LoopRPT propone aprendizaje por refuerzo para modelos que reutilizan varias veces las mismas capas Transformer.',
        'El método evalúa los pasos intermedios de los estados internos, en vez de premiar únicamente la respuesta final.',
        'En dos modelos Ouro, los autores informan de mayor precisión con un número medio similar de pasos y respuestas más tempranas para tokens sencillos.',
      ],
    },
    'de-DE': {
      title: 'LoopRPT trainiert KI-Modelle anhand ihrer Zwischenschritte beim Schlussfolgern.',
      sentences: [
        'LoopRPT schlägt Reinforcement Learning für Modelle vor, die dieselben Transformer-Schichten mehrfach verwenden.',
        'Das Verfahren bewertet Zwischenschritte in internen Zuständen, statt nur die endgültige Antwort zu belohnen.',
        'Für zwei Ouro-Modelle berichten die Autoren von höherer Genauigkeit bei ähnlich vielen durchschnittlichen Durchläufen und früheren Ausgaben bei einfachen Tokens.',
      ],
    },
  },
  '/p/gemini-can-now-order-your-groceries-book-your-dinner-10-16-2026': {
    en: {
      title: 'Gemini and everyday tasks: what its connections to more than 40 apps can do.',
      sentences: [
        'Gemini’s task mode connects to more than 40 apps to handle actions such as ordering groceries or booking a table.',
        'The newsletter names Instacart, OpenTable, Adobe and Shopify among the connected services.',
        'The announced availability is limited to Google AI Pro and Ultra subscribers, narrowing who can try the features.',
      ],
    },
    'es-ES': {
      title: 'Gemini y las tareas cotidianas: qué permite su conexión con más de 40 aplicaciones.',
      sentences: [
        'El modo de tareas de Gemini se conecta con más de 40 aplicaciones para hacer cosas como pedir la compra o reservar una mesa.',
        'La newsletter cita Instacart, OpenTable, Adobe y Shopify entre los servicios conectados.',
        'La disponibilidad anunciada se limita a los suscriptores de Google AI Pro y Ultra, por lo que no todo el mundo puede probar estas funciones.',
      ],
    },
    'de-DE': {
      title: 'Gemini im Alltag: Was die Verbindungen zu mehr als 40 Apps ermöglichen.',
      sentences: [
        'Der Aufgabenmodus von Gemini verbindet sich mit mehr als 40 Apps, um etwa Lebensmittel zu bestellen oder einen Tisch zu reservieren.',
        'Der Newsletter nennt unter anderem Instacart, OpenTable, Adobe und Shopify als verbundene Dienste.',
        'Laut Ankündigung ist die Funktion auf Abonnenten von Google AI Pro und Ultra beschränkt.',
      ],
    },
  },
  '/p/googles-nano-banana-2-1-can-put-you-anywhere-10-10-2026': {
    en: {
      title: 'AI headshots: what Nano Banana 2.1 preserves about your face.',
      sentences: [
        'Futurepedia describes a test of Nano Banana 2.1 and several image generators across 42 scenarios.',
        'The tutorial shows how to use a selfie to create several professional portraits while keeping the subject recognisable.',
        'The result depends on the scenarios tested and does not establish general superiority for every image-generation task.',
      ],
    },
    'es-ES': {
      title: 'Retratos profesionales con IA: qué conserva Nano Banana 2.1 de tu rostro.',
      sentences: [
        'Futurepedia describe una prueba de Nano Banana 2.1 y varios generadores de imágenes en 42 situaciones.',
        'El tutorial muestra cómo partir de un selfie para crear varias fotos profesionales manteniendo el parecido de la persona.',
        'El resultado depende de los casos probados y no demuestra una superioridad general en todos los usos de generación de imágenes.',
      ],
    },
    'de-DE': {
      title: 'Professionelle KI-Porträts: Was Nano Banana 2.1 von deinem Gesicht bewahrt.',
      sentences: [
        'Futurepedia beschreibt einen Test von Nano Banana 2.1 und mehreren Bildgeneratoren in 42 Situationen.',
        'Das Tutorial zeigt, wie sich aus einem Selfie mehrere professionelle Porträts erstellen lassen, bei denen die Person erkennbar bleibt.',
        'Das Ergebnis hängt von den getesteten Szenarien ab und belegt keine allgemeine Überlegenheit für alle Anwendungen der Bildgenerierung.',
      ],
    },
  },
  '/p/your-next-chatgpt-answer-might-come-with-buttons-10-09-2026': {
    en: {
      title: 'ChatGPT adds buttons and calculators to its answers with Intelligent UI.',
      sentences: [
        'The newsletter describes Intelligent UI as a feature that lets ChatGPT respond with interactive elements.',
        'Examples include explorable diagrams, calculators and small tools embedded in the conversation.',
        'These responses target cases where interacting with a visual aid is more useful than reading a text explanation alone.',
      ],
    },
    'es-ES': {
      title: 'ChatGPT añade botones y calculadoras a sus respuestas con Intelligent UI.',
      sentences: [
        'La newsletter presenta Intelligent UI como una función que permite a ChatGPT responder con elementos interactivos.',
        'Entre los ejemplos hay diagramas que se pueden explorar, calculadoras y pequeñas herramientas dentro de la conversación.',
        'Estas respuestas buscan ayudar en situaciones donde manipular una representación resulta más útil que leer solo una explicación.',
      ],
    },
    'de-DE': {
      title: 'ChatGPT ergänzt seine Antworten mit Intelligent UI um Schaltflächen und Rechner.',
      sentences: [
        'Laut Newsletter kann ChatGPT mit der Funktion Intelligent UI interaktive Elemente in Antworten einbauen.',
        'Zu den Beispielen zählen erkundbare Diagramme, Rechner und kleine Werkzeuge direkt im Gespräch.',
        'Solche Antworten sollen helfen, wenn die Interaktion mit einer Darstellung nützlicher ist als eine reine Texterklärung.',
      ],
    },
  },
};
