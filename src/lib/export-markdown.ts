import type { CVData } from '@/types/cv'

export function exportToMarkdown(data: CVData): void {
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
    { label: 'Languages',            items: habilidades.languages },
    { label: 'Frameworks',           items: habilidades.frameworks },
    { label: 'Databases',            items: habilidades.databases },
    { label: 'Technologies / Tools', items: habilidades.tools },
    { label: 'Practices',            items: habilidades.practices },
  ].filter(r => r.items.length > 0)

  if (skillRows.length > 0) {
    lines.push('---', '', '## Skills', '')
    skillRows.forEach(row => lines.push(`**${row.label}:** ${row.items.join(', ')}`))
    lines.push('')
  }

  // Experience
  if (experiencia.length > 0) {
    lines.push('---', '', '## Experience', '')
    experiencia.forEach(exp => {
      const period = exp.actual ? `${exp.fechaInicio} – Present` : `${exp.fechaInicio} – ${exp.fechaFin}`
      lines.push(`### ${exp.empresa}`)
      lines.push(`*${exp.cargo}${exp.ubicacion ? ` · ${exp.ubicacion}` : ''} · ${period}*`, '')
      exp.bullets.filter(Boolean).forEach(b => lines.push(`- ${b}`))
      lines.push('')
    })
  }

  // Projects
  if (proyectos.length > 0) {
    lines.push('---', '', '## Projects', '')
    proyectos.forEach(proj => {
      lines.push(`### ${proj.nombre}${proj.url ? ` · ${proj.url}` : ''}`)
      if (proj.descripcion) lines.push('', proj.descripcion)
      lines.push('')
    })
  }

  // Education
  if (educacion.length > 0) {
    lines.push('---', '', '## Education', '')
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
    lines.push('---', '', '## Languages', '')
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
