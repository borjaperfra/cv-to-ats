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

export interface ProyectoEntry {
  id:          string
  nombre:      string
  descripcion: string
  url:         string
}

export interface SkillCategories {
  languages:  string[]
  frameworks: string[]
  databases:  string[]
  tools:      string[]
  practices:  string[]
}

export interface CVData {
  personalInfo: PersonalInfo
  resumen:      string
  experiencia:  ExperienciaEntry[]
  proyectos:    ProyectoEntry[]
  educacion:    EducacionEntry[]
  habilidades:  SkillCategories
  idiomas:      IdiomaEntry[]
}

export const EMPTY_CV: CVData = {
  personalInfo: {
    nombre: '', cargo: '', email: '', telefono: '',
    linkedin: '', ubicacion: '', website: '',
  },
  resumen:     '',
  experiencia: [],
  proyectos:   [],
  educacion:   [],
  habilidades: { languages: [], frameworks: [], databases: [], tools: [], practices: [] },
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
  resumen: '',
  experiencia: [
    {
      id: 'demo-exp-1',
      empresa:     'TechHotel Solutions',
      cargo:       'Software Engineer',
      ubicacion:   'Madrid, Spain',
      fechaInicio: 'Jan 2022',
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
      fechaFin:    'Dec 2021',
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
      cargo:       'Web Developer (Intern)',
      ubicacion:   'Santiago de Compostela, Spain',
      fechaInicio: 'Sep 2018',
      fechaFin:    'Jun 2019',
      actual:      false,
      bullets: [
        'Developed two client-facing websites using PHP, HTML, CSS, JavaScript and MySQL.',
      ],
    },
  ],
  proyectos: [
    {
      id:          'demo-proj-1',
      nombre:      'Open Toponym',
      descripcion: 'Open-source collaborative platform for geospatial place name data, containing over 1.5M entries with full metadata and multilingual search. Built with Spring Boot, Angular and PostgreSQL.',
      url:         'github.com/danigarcia/open-toponym',
    },
  ],
  educacion: [
    {
      id:          'demo-edu-1',
      institucion: 'Universidad de Santiago de Compostela',
      titulo:      'B.Sc. Computer Science',
      campo:       'Software Engineering',
      fechaInicio: '2014',
      fechaFin:    '2018',
      logros:      ['GPA: 8.2/10'],
    },
  ],
  habilidades: {
    languages:  ['Java', 'JavaScript', 'TypeScript', 'SQL', 'HTML', 'CSS'],
    frameworks: ['Spring', 'Angular'],
    databases:  ['MySQL', 'PostgreSQL', 'Neo4j', 'Oracle', 'SQLite'],
    tools:      ['Docker', 'Jenkins', 'Kafka', 'RabbitMQ', 'SonarQube', 'Maven', 'Git'],
    practices:  ['Agile', 'Scrum', 'SOLID Principles', 'TDD', 'Code Reviews'],
  },
  idiomas: [
    { id: 'demo-lang-1', idioma: 'Spanish', nivel: 'Native' },
    { id: 'demo-lang-2', idioma: 'English', nivel: 'C1 Advanced' },
  ],
}
