import type { CVData } from '@/types/cv'
import { CV_TEMPLATE_LABELS, type CvLang } from '@/lib/cv-labels'

export function exportToMarkdown(data: CVData, lang: CvLang = 'en'): void {
  const L = CV_TEMPLATE_LABELS[lang]
  const lines: string[] = []
  const { personalInfo: p, experiencia, proyectos, educacion, habilidades, idiomas } = data

  // Header
  lines.push(`# ${p.nombre}`)
  if (p.cargo) lines.push(`**${p.cargo}**`)
  lines.push('')

  const contactParts = [p.email, p.telefono, p.linkedin, p.ubicacion, p.website].filter(Boolean)
  if (contactParts.length) lines.push(contactParts.join(' · '))
  lines.push('')

  // Skills
  const skillRows = [
    { label: L.skillRows.languages,  items: habilidades.languages },
    { label: L.skillRows.frameworks, items: habilidades.frameworks },
    { label: L.skillRows.databases,  items: habilidades.databases },
    { label: L.skillRows.tools,      items: habilidades.tools },
    { label: L.skillRows.practices,  items: habilidades.practices },
  ].filter(r => r.items.length > 0)

  if (skillRows.length > 0) {
    lines.push('---', '', `## ${L.skills}`, '')
    skillRows.forEach(row => lines.push(`**${row.label}:** ${row.items.join(', ')}`))
    lines.push('')
  }

  // Experience
  if (experiencia.length > 0) {
    lines.push('---', '', `## ${L.experience}`, '')
    experiencia.forEach(exp => {
      const period = exp.actual ? `${exp.fechaInicio} – ${L.present}` : `${exp.fechaInicio} – ${exp.fechaFin}`
      lines.push(`### ${exp.empresa}`)
      lines.push(`*${exp.cargo}${exp.ubicacion ? ` · ${exp.ubicacion}` : ''} · ${period}*`, '')
      exp.bullets.filter(Boolean).forEach(b => lines.push(`- ${b}`))
      lines.push('')
    })
  }

  // Projects
  if (proyectos.length > 0) {
    lines.push('---', '', `## ${L.projects}`, '')
    proyectos.forEach(proj => {
      lines.push(`### ${proj.nombre}${proj.url ? ` · ${proj.url}` : ''}`)
      if (proj.descripcion) lines.push('', proj.descripcion)
      lines.push('')
    })
  }

  // Education
  if (educacion.length > 0) {
    lines.push('---', '', `## ${L.education}`, '')
    educacion.forEach(edu => {
      const period = `${edu.fechaInicio} – ${edu.fechaFin}`
      const degree = [edu.titulo, edu.campo].filter(Boolean).join(', ')
      lines.push(`### ${edu.institucion}`)
      lines.push(`*${degree}${degree ? ' · ' : ''}${period}*`, '')
      edu.logros.filter(Boolean).forEach(l => lines.push(`- ${l}`))
      if (edu.logros.filter(Boolean).length) lines.push('')
    })
  }

  // Languages
  if (idiomas.length > 0) {
    lines.push('---', '', `## ${L.languages}`, '')
    idiomas.forEach(l => lines.push(`- **${l.idioma}**: ${l.nivel}`))
    lines.push('')
  }

  const content = lines.join('\n')
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `CV-${p.nombre || 'documento'}.md`
  a.click()
  URL.revokeObjectURL(url)
}
