import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { CVData, SkillCategories } from '@/types/cv'
import { CV_TEMPLATE_LABELS, type CvLang } from '@/lib/cv-labels'

const pt = (mm: number) => mm * 2.835

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.45,
    paddingTop: pt(18),
    paddingBottom: pt(20),
    paddingLeft: pt(20),
    paddingRight: pt(20),
    backgroundColor: '#ffffff',
    color: '#000000',
  },

  // ── Header ──────────────────────────────────────────────
  headerCenter: { alignItems: 'center', marginBottom: pt(4) },
  nameRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 3 },
  firstName: { fontSize: 22, fontFamily: 'Helvetica', letterSpacing: -0.3 },
  lastName:  { fontSize: 22, fontFamily: 'Helvetica-Bold', letterSpacing: -0.3 },
  namePlaceholder: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#cccccc' },
  cargo:   { fontSize: 10, color: '#555555', marginBottom: 4, letterSpacing: 0.2 },
  contact: { fontSize: 8.5, color: '#666666' },

  // ── Section header ───────────────────────────────────────
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: pt(16), marginBottom: pt(6) },
  sectionTitle:  { fontFamily: 'Helvetica-Bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#111111', marginRight: 8 },
  sectionLine:   { flex: 1, borderBottomWidth: 0.5, borderBottomColor: '#aaaaaa' },

  // ── Skills ───────────────────────────────────────────────
  skillsContainer: { fontSize: 9.5, lineHeight: 1.7 },
  skillRow:   { flexDirection: 'row', marginBottom: 1 },
  skillLabel: { fontFamily: 'Helvetica-Bold', width: pt(38), flexShrink: 0 },
  skillValue: { flex: 1 },

  // ── Experience / Education ───────────────────────────────
  entry:      { marginBottom: pt(10) },
  entrySmall: { marginBottom: pt(8) },
  rowSpaced:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  company:    { fontFamily: 'Helvetica-Bold', fontSize: 10 },
  period:     { fontSize: 9, color: '#555555', flexShrink: 0, marginLeft: pt(8) },
  roleItalic: { fontSize: 9, color: '#555555', fontFamily: 'Helvetica-Oblique', marginTop: 1, marginBottom: 3 },
  degreeItalic: { fontSize: 9, color: '#555555', fontFamily: 'Helvetica-Oblique', marginTop: 1, marginBottom: 2 },

  // ── Bullets ──────────────────────────────────────────────
  bulletRow:  { flexDirection: 'row', marginTop: 2 },
  bulletDot:  { fontSize: 10, marginRight: 6, flexShrink: 0 },
  bulletText: { flex: 1, fontSize: 10 },

  // ── Projects ─────────────────────────────────────────────
  projUrl:  { fontSize: 8.5, color: '#666666', flexShrink: 0, marginLeft: pt(8) },
  projDesc: { fontSize: 10, marginTop: 2 },

  // ── Languages spoken ─────────────────────────────────────
  langText: { fontSize: 9.5, lineHeight: 1.6 },
})

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionLine} />
    </View>
  )
}

export default function HarvardTemplatePdf({ data, lang = 'en' }: { data: CVData; lang?: CvLang }) {
  const { personalInfo: p, experiencia, proyectos, educacion, habilidades, idiomas } = data
  const L = CV_TEMPLATE_LABELS[lang]

  const SKILL_ROWS: { key: keyof SkillCategories; label: string }[] = [
    { key: 'languages',  label: L.skillRows.languages },
    { key: 'frameworks', label: L.skillRows.frameworks },
    { key: 'databases',  label: L.skillRows.databases },
    { key: 'tools',      label: L.skillRows.tools },
    { key: 'practices',  label: L.skillRows.practices },
  ]
  const hasSkills = SKILL_ROWS.some(r => habilidades[r.key].length > 0)

  const nameParts = (p.nombre || '').trim().split(/\s+/)
  const firstName = nameParts.length > 2 ? nameParts.slice(0, -2).join(' ') : (nameParts.length === 2 ? nameParts[0] : '')
  const lastNames  = nameParts.length > 2 ? nameParts.slice(-2).join(' ')   : (nameParts.length === 2 ? nameParts[1] : (nameParts[0] || ''))

  const contactParts = [p.email, p.telefono, p.ubicacion, p.linkedin, p.website].filter(Boolean)

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.headerCenter}>
          <View style={s.nameRow}>
            {p.nombre ? (
              <>
                {firstName ? <Text style={s.firstName}>{firstName} </Text> : null}
                <Text style={s.lastName}>{lastNames}</Text>
              </>
            ) : (
              <Text style={s.namePlaceholder}>Your Name</Text>
            )}
          </View>
          {p.cargo ? <Text style={s.cargo}>{p.cargo}</Text> : null}
          {contactParts.length > 0 && (
            <Text style={s.contact}>{contactParts.join('  |  ')}</Text>
          )}
        </View>

        {/* Skills */}
        {hasSkills && (
          <View>
            <SectionHeader title={L.skills} />
            <View style={s.skillsContainer}>
              {SKILL_ROWS.map(({ key, label }) =>
                habilidades[key].length > 0 ? (
                  <View key={key} style={s.skillRow}>
                    <Text style={s.skillLabel}>{label}:</Text>
                    <Text style={s.skillValue}>{habilidades[key].join(', ')}</Text>
                  </View>
                ) : null
              )}
            </View>
          </View>
        )}

        {/* Experience */}
        {experiencia.length > 0 && (
          <View>
            <SectionHeader title={L.experience} />
            {experiencia.map(exp => {
              const period  = exp.actual ? `${exp.fechaInicio} – ${L.present}` : `${exp.fechaInicio} – ${exp.fechaFin}`
              const roleMeta = [exp.cargo, exp.ubicacion].filter(Boolean).join(' · ')
              return (
                <View key={exp.id} style={s.entry} wrap={false}>
                  <View style={s.rowSpaced}>
                    <Text style={s.company}>{exp.empresa}</Text>
                    <Text style={s.period}>{period}</Text>
                  </View>
                  {roleMeta ? <Text style={s.roleItalic}>{roleMeta}</Text> : null}
                  {exp.bullets.filter(Boolean).map((b, i) => (
                    <View key={i} style={s.bulletRow}>
                      <Text style={s.bulletDot}>•</Text>
                      <Text style={s.bulletText}>{b}</Text>
                    </View>
                  ))}
                </View>
              )
            })}
          </View>
        )}

        {/* Projects */}
        {proyectos.length > 0 && (
          <View>
            <SectionHeader title={L.projects} />
            {proyectos.map(proj => (
              <View key={proj.id} style={s.entrySmall} wrap={false}>
                <View style={s.rowSpaced}>
                  <Text style={s.company}>{proj.nombre}</Text>
                  {proj.url ? <Text style={s.projUrl}>{proj.url}</Text> : null}
                </View>
                {proj.descripcion ? <Text style={s.projDesc}>{proj.descripcion}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {educacion.length > 0 && (
          <View>
            <SectionHeader title={L.education} />
            {educacion.map(edu => {
              const period = `${edu.fechaInicio} – ${edu.fechaFin}`
              const degree = [edu.titulo, edu.campo].filter(Boolean).join(', ')
              return (
                <View key={edu.id} style={s.entrySmall} wrap={false}>
                  <View style={s.rowSpaced}>
                    <Text style={s.company}>{edu.institucion || 'Institution'}</Text>
                    <Text style={s.period}>{period}</Text>
                  </View>
                  {degree ? <Text style={s.degreeItalic}>{degree}</Text> : null}
                  {edu.logros.filter(Boolean).map((l, i) => (
                    <View key={i} style={s.bulletRow}>
                      <Text style={s.bulletDot}>•</Text>
                      <Text style={s.bulletText}>{l}</Text>
                    </View>
                  ))}
                </View>
              )
            })}
          </View>
        )}

        {/* Languages spoken */}
        {idiomas.length > 0 && (
          <View>
            <SectionHeader title={L.languages} />
            <Text style={s.langText}>
              {idiomas.map(l => `${l.idioma}: ${l.nivel}`).join('  ·  ')}
            </Text>
          </View>
        )}

      </Page>
    </Document>
  )
}
