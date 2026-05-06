export interface PersonalInfo {
  nombre:    string
  cargo:     string   // current role / professional title
  email:     string
  telefono:  string
  linkedin:  string
  ubicacion: string
  website:   string
  foto?:     string   // base64 data URL for profile photo
}

export interface ExperienciaEntry {
  id:          string
  empresa:     string
  cargo:       string
  ubicacion:   string
  fechaInicio: string
  fechaFin:    string
  actual:      boolean
  bullets:     string[]
}

export interface EducacionEntry {
  id:          string
  institucion: string
  titulo:      string
  campo:       string
  fechaInicio: string
  fechaFin:    string
  logros:      string[]
}

export interface IdiomaEntry {
  id:     string
  idioma: string
  nivel:  string
}

export interface CVData {
  personalInfo: PersonalInfo
  resumen:      string
  experiencia:  ExperienciaEntry[]
  educacion:    EducacionEntry[]
  habilidades:  string[]
  idiomas:      IdiomaEntry[]
}

export const EMPTY_CV: CVData = {
  personalInfo: {
    nombre: '', cargo: '', email: '', telefono: '',
    linkedin: '', ubicacion: '', website: '',
  },
  resumen:     '',
  experiencia: [],
  educacion:   [],
  habilidades: [],
  idiomas:     [],
}

// Reference CV based on Daniel Blanco's public template (github.com/danielblanco96/resume-public)
export const DEMO_CV: CVData = {
  personalInfo: {
    nombre:    'Dani García',
    cargo:     'Software Engineer',
    email:     'dani.garcia@email.com',
    telefono:  '(+34) 600 000 000',
    linkedin:  'https://www.linkedin.com/in/dani-garcia-dev/',
    ubicacion: 'Madrid, Spain',
    website:   '',
  },
  resumen: 'Software Engineer con más de 5 años de experiencia en backend y sistemas distribuidos. Especializado en Java, Spring y arquitecturas orientadas a eventos con Kafka. Historial de liderazgo técnico en equipos pequeños y entrega de soluciones con impacto medible.',
  experiencia: [
    {
      id: 'demo-exp-1',
      empresa:     'TechHotel Solutions',
      cargo:       'Software Engineer',
      ubicacion:   'Madrid, Spain',
      fechaInicio: 'Ene 2022',
      fechaFin:    '',
      actual:      true,
      bullets: [
        'Built a real-time monitoring system for devices deployed across hundreds of hotels worldwide, using Kafka, Flink and Neo4j in a Docker Swarm cluster.',
        'Improved the algorithm that calculates hotel device status, reducing processing time by 95%.',
        'Implemented a centralized communication layer for all Property Management Systems (PMS), eliminating duplicate code across multiple platforms.',
      ],
    },
    {
      id: 'demo-exp-2',
      empresa:     'GeoData Systems',
      cargo:       'Software Engineer',
      ubicacion:   'Santiago de Compostela, Spain',
      fechaInicio: 'Jul 2019',
      fechaFin:    'Dic 2021',
      actual:      false,
      bullets: [
        'Led a 5-person team building a water quality analysis platform using drones and USVs to collect samples.',
        'Designed an algorithm to compute optimal sea routes and estimated collection times for autonomous surface vehicles.',
        'Built a collaborative toponymy platform containing over 1.5 million place names with full metadata.',
        'Introduced CI/CD using Jenkins and SonarQube, improving code quality and deployment reliability.',
      ],
    },
    {
      id: 'demo-exp-3',
      empresa:     'WebCraft Studio',
      cargo:       'Web Developer (Prácticas)',
      ubicacion:   'Santiago de Compostela, Spain',
      fechaInicio: 'Sep 2018',
      fechaFin:    'Jun 2019',
      actual:      false,
      bullets: [
        'Developed two client-facing websites using PHP, HTML, CSS, JavaScript and MySQL.',
      ],
    },
  ],
  educacion: [
    {
      id:          'demo-edu-1',
      institucion: 'Universidad de Santiago de Compostela',
      titulo:      'Grado en Ingeniería Informática',
      campo:       'Computer Science',
      fechaInicio: '2014',
      fechaFin:    '2018',
      logros:      ['Nota media: 8.2/10'],
    },
  ],
  habilidades: [
    'Java', 'JavaScript', 'TypeScript', 'SQL', 'HTML', 'CSS',
    'Spring', 'Angular',
    'MySQL', 'PostgreSQL', 'Neo4j', 'Oracle', 'SQLite',
    'Docker', 'Jenkins', 'Kafka', 'RabbitMQ', 'SonarQube', 'Maven', 'Git',
    'Agile', 'Scrum', 'SOLID Principles', 'TDD', 'Code Reviews',
  ],
  idiomas: [
    { id: 'demo-lang-1', idioma: 'Español', nivel: 'Nativo' },
    { id: 'demo-lang-2', idioma: 'Inglés',  nivel: 'C1 Avanzado' },
  ],
}
