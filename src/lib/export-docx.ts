import type { CVData } from '@/types/cv'
import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, BorderStyle,
  convertInchesToTwip, LevelFormat,
} from 'docx'

function hr(): Paragraph {
  return new Paragraph({
    border: { bottom: { color: '000000', size: 6, style: BorderStyle.SINGLE, space: 1 } },
    spacing: { after: 80 },
  })
}

function sectionHeader(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22, font: 'Helvetica' })],
    spacing: { before: 200, after: 80 },
    border: { bottom: { color: '000000', size: 4, style: BorderStyle.SINGLE, space: 1 } },
  })
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, font: 'Helvetica' })],
    bullet: { level: 0 },
    spacing: { after: 40 },
  })
}

export async function exportToDocx(data: CVData): Promise<void> {
  const { personalInfo: p, experiencia, proyectos, educacion, habilidades, idiomas } = data

  const children: Paragraph[] = []

  // ── Name ──
  const nameParts = (p.nombre || '').trim().split(/\s+/)
  const firstName = nameParts.length > 2 ? nameParts.slice(0, -2).join(' ') : (nameParts.length === 2 ? nameParts[0] : '')
  const lastNames = nameParts.length > 1 ? nameParts.slice(-2).join(' ') : (nameParts[0] || '')

  children.push(
    new Paragraph({
      children: [
        ...(firstName ? [new TextRun({ text: firstName + ' ', size: 36, font: 'Helvetica' })] : []),
        new TextRun({ text: lastNames, bold: true, size: 36, font: 'Helvetica' }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    })
  )

  // ── Contact line ──
  const contactParts = [p.email, p.telefono, p.linkedin, p.ubicacion, p.website].filter(Boolean)
  if (contactParts.length) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: contactParts.join(' · '), size: 18, font: 'Helvetica' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
      })
    )
  }

  if (p.cargo) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: p.cargo, italics: true, size: 20, font: 'Helvetica' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      })
    )
  }

  children.push(hr())

  // ── Skills ──
  const skillRows = [
    { label: 'Languages',            items: habilidades.languages },
    { label: 'Frameworks',           items: habilidades.frameworks },
    { label: 'Databases',            items: habilidades.databases },
    { label: 'Technologies / Tools', items: habilidades.tools },
    { label: 'Practices',            items: habilidades.practices },
  ].filter(r => r.items.length > 0)

  if (skillRows.length > 0) {
    children.push(sectionHeader('Skills'))
    skillRows.forEach(row => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${row.label}: `, bold: true, size: 20, font: 'Helvetica' }),
            new TextRun({ text: row.items.join(', '), size: 20, font: 'Helvetica' }),
          ],
          spacing: { after: 40 },
        })
      )
    })
  }

  // ── Experience ──
  if (experiencia.length > 0) {
    children.push(sectionHeader('Experience'))
    experiencia.forEach(exp => {
      const period = exp.actual ? `${exp.fechaInicio} – Present` : `${exp.fechaInicio} – ${exp.fechaFin}`
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: exp.empresa, bold: true, size: 22, font: 'Helvetica' }),
            new TextRun({ text: `   ${period}`, size: 19, font: 'Helvetica', color: '555555' }),
          ],
          spacing: { before: 120, after: 30 },
        })
      )
      const roleMeta = [exp.cargo, exp.ubicacion].filter(Boolean).join(' · ')
      if (roleMeta) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: roleMeta, italics: true, size: 19, font: 'Helvetica', color: '555555' })],
            spacing: { after: 60 },
          })
        )
      }
      exp.bullets.filter(Boolean).forEach(b => children.push(bullet(b)))
    })
  }

  // ── Projects ──
  if (proyectos.length > 0) {
    children.push(sectionHeader('Projects'))
    proyectos.forEach(proj => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: proj.nombre, bold: true, size: 22, font: 'Helvetica' }),
            ...(proj.url ? [new TextRun({ text: `   ${proj.url}`, size: 18, font: 'Helvetica', color: '666666' })] : []),
          ],
          spacing: { before: 120, after: 30 },
        })
      )
      if (proj.descripcion) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: proj.descripcion, size: 20, font: 'Helvetica' })],
            spacing: { after: 60 },
          })
        )
      }
    })
  }

  // ── Education ──
  if (educacion.length > 0) {
    children.push(sectionHeader('Education'))
    educacion.forEach(edu => {
      const period = `${edu.fechaInicio} – ${edu.fechaFin}`
      const degree = [edu.titulo, edu.campo].filter(Boolean).join(', ')
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: edu.institucion, bold: true, size: 22, font: 'Helvetica' }),
            new TextRun({ text: `   ${period}`, size: 19, font: 'Helvetica', color: '555555' }),
          ],
          spacing: { before: 120, after: 30 },
        })
      )
      if (degree) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: degree, italics: true, size: 19, font: 'Helvetica', color: '555555' })],
            spacing: { after: 60 },
          })
        )
      }
      edu.logros.filter(Boolean).forEach(l => children.push(bullet(l)))
    })
  }

  // ── Languages ──
  if (idiomas.length > 0) {
    children.push(sectionHeader('Languages'))
    idiomas.forEach(l => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: l.idioma, bold: true, size: 20, font: 'Helvetica' }),
            new TextRun({ text: `: ${l.nivel}`, size: 20, font: 'Helvetica' }),
          ],
          spacing: { after: 40 },
        })
      )
    })
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
          },
        },
      },
      children,
    }],
    numbering: {
      config: [{
        reference: 'default-bullets',
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '•',
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: { left: convertInchesToTwip(0.25), hanging: convertInchesToTwip(0.25) },
            },
          },
        }],
      }],
    },
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `CV-${p.nombre || 'documento'}.docx`
  a.click()
  URL.revokeObjectURL(url)
}
