export type CvLang = 'es' | 'en'

interface CvTemplateLabels {
  skills: string
  experience: string
  projects: string
  education: string
  languages: string
  present: string
  skillRows: {
    languages: string
    frameworks: string
    databases: string
    tools: string
    practices: string
  }
}

export const CV_TEMPLATE_LABELS: Record<CvLang, CvTemplateLabels> = {
  en: {
    skills: 'Skills',
    experience: 'Experience',
    projects: 'Projects',
    education: 'Education',
    languages: 'Languages',
    present: 'Present',
    skillRows: {
      languages: 'Languages',
      frameworks: 'Frameworks',
      databases: 'Databases',
      tools: 'Technologies / Tools',
      practices: 'Practices',
    },
  },
  es: {
    skills: 'Habilidades',
    experience: 'Experiencia',
    projects: 'Proyectos',
    education: 'Educación',
    languages: 'Idiomas',
    present: 'Actualidad',
    skillRows: {
      languages: 'Lenguajes',
      frameworks: 'Frameworks',
      databases: 'Bases de datos',
      tools: 'Tecnologías / Herramientas',
      practices: 'Prácticas',
    },
  },
}
