import type { CVData } from '@/types/cv'

export interface SimpleAtsScore {
  score: number
  level: 'low' | 'mid' | 'high'
  breakdown: {
    keywords:   number
    format:     number
    experience: number
    education:  number
    contact:    number
    length:     number
  }
}

function skillCount(cv: CVData): number {
  return (
    cv.habilidades.languages.length +
    cv.habilidades.frameworks.length +
    cv.habilidades.databases.length +
    cv.habilidades.tools.length +
    cv.habilidades.practices.length
  )
}

function estimatePages(cv: CVData): number {
  const words = [
    ...cv.experiencia.map(e => `${e.cargo} ${e.empresa} ${e.bullets.join(' ')}`),
    ...cv.proyectos.map(p => `${p.nombre} ${p.descripcion}`),
    ...cv.educacion.map(e => `${e.titulo} ${e.institucion} ${e.logros.join(' ')}`),
    cv.habilidades.languages.join(' '),
    cv.habilidades.frameworks.join(' '),
    cv.habilidades.databases.join(' '),
    cv.habilidades.tools.join(' '),
    cv.habilidades.practices.join(' '),
    ...cv.idiomas.map(l => l.idioma),
  ].join(' ').split(/\s+/).filter(Boolean).length
  if (words < 300) return 1
  if (words < 550) return 1
  if (words < 850) return 2
  if (words < 1200) return 3
  return 4
}

export function calcAtsScore(cv: CVData): SimpleAtsScore {
  // Keywords & skills (30%)
  const sc = skillCount(cv)
  const keywords = sc >= 15 ? 92 : sc >= 10 ? 80 : sc >= 6 ? 65 : sc >= 3 ? 48 : 25

  // Format & parseability (25%) — Harvard template is always clean single-column
  const format = 90

  // Work experience structure (20%)
  const roles = cv.experiencia
  let expScore = 90
  if (roles.length === 0) {
    expScore = 20
  } else {
    const complete = roles.filter(r =>
      r.empresa.trim() && r.cargo.trim() && r.fechaInicio.trim() &&
      r.bullets.some(b => b.trim().length > 0)
    ).length
    const ratio = complete / roles.length
    expScore = Math.round(50 + ratio * 45)
  }

  // Education & certifications (10%)
  const edu = cv.educacion
  let eduScore = 40
  if (edu.length > 0) {
    const hasComplete = edu.some(e => e.titulo.trim() && e.institucion.trim())
    eduScore = hasComplete ? 85 : 60
  }

  // Contact information (10%) — +25 per element present
  const p = cv.personalInfo
  const contactScore = Math.min(100,
    (p.email.trim() ? 25 : 0) +
    (p.telefono.trim() ? 25 : 0) +
    (p.ubicacion.trim() ? 25 : 0) +
    (p.linkedin.trim() || p.website.trim() ? 25 : 0)
  )

  // Length & file optimization (5%)
  const pages = estimatePages(cv)
  const lengthScore = pages <= 2 ? 92 : pages === 3 ? 75 : 45

  // Weighted average (same weights as the real scorer)
  const score = Math.round(
    keywords   * 0.30 +
    format     * 0.25 +
    expScore   * 0.20 +
    eduScore   * 0.10 +
    contactScore * 0.10 +
    lengthScore  * 0.05
  )

  return {
    score,
    level: score >= 72 ? 'high' : score >= 50 ? 'mid' : 'low',
    breakdown: { keywords, format, experience: expScore, education: eduScore, contact: contactScore, length: lengthScore },
  }
}
