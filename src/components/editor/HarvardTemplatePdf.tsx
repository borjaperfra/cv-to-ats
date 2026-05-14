import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer'
import type { CVData, SkillCategories } from '@/types/cv'
import { CV_TEMPLATE_LABELS, type CvLang } from '@/lib/cv-labels'

const pt = (mm: number) => mm * 2.835
const toHref = (url: string) => /^https?:\/\//.test(url) ? url : `https://${url}`

const C = {
  text:     '#333333',
  darktext: '#414141',
  gray:     '#5D5D5D',
  light:    '#999999',
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.3,
    paddingTop: pt(15),
    paddingBottom: pt(20),
    paddingLeft: pt(20),
    paddingRight: pt(20),
    backgroundColor: '#ffffff',
    color: C.darktext,
  },

  // ── Header ──────────────────────────────────────────────
  headerCenter:    { alignItems: 'center', marginBottom: pt(2) },
  nameRow:         { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  firstName:       { fontSize: 28, fontFamily: 'Helvetica', color: C.gray },
  lastName:        { fontSize: 28, fontFamily: 'Helvetica-Bold', color: C.text },
  namePlaceholder: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#cccccc' },
  cargo:           { fontSize: 8, color: C.gray, letterSpacing: 0.4, marginBottom: 3 },
  contact:         { fontSize: 7.5, color: C.light },
  contactLink:     { fontSize: 7.5, color: C.light, textDecoration: 'none' },

  // ── Section header ───────────────────────────────────────
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: pt(4), marginBottom: pt(3) },
  sectionTitle:  { fontFamily: 'Helvetica-Bold', fontSize: 14, color: C.text, marginRight: 6 },
  sectionLine:   { flex: 1, borderBottomWidth: 0.9, borderBottomColor: C.gray },

  // ── Skills ───────────────────────────────────────────────
  skillsContainer: { fontSize: 9, lineHeight: 1.5 },
  skillRow:        { flexDirection: 'row', marginBottom: 1 },
  skillLabel:      { fontFamily: 'Helvetica-Bold', width: pt(40), flexShrink: 0 },
  skillValue:      { flex: 1 },

  // ── Entries ──────────────────────────────────────────────
  entry:      { marginBottom: pt(4) },
  entrySmall: { marginBottom: pt(3) },
  rowSpaced:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },

  // ── Experience ───────────────────────────────────────────
  company:   { fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.darktext },
  period:    { fontSize: 8, color: C.light, fontFamily: 'Helvetica-Oblique', flexShrink: 0, marginLeft: pt(4) },
  entryRole: { fontSize: 8, color: C.gray, flexShrink: 1 },
  entryLoc:  { fontSize: 8, color: C.light, flexShrink: 0, marginLeft: pt(4) },

  // ── Bullets ──────────────────────────────────────────────
  bulletRow:  { flexDirection: 'row', marginTop: 2 },
  bulletDot:  { fontSize: 9, marginRight: 5, flexShrink: 0 },
  bulletText: { flex: 1, fontSize: 9 },

  // ── Projects ─────────────────────────────────────────────
  projUrl:  { fontSize: 7.5, color: C.light, flexShrink: 0, marginLeft: pt(4) },
  projDesc: { fontSize: 9, marginTop: 2 },

  // ── Education ────────────────────────────────────────────
  degreeText: { fontSize: 9, color: C.gray, marginTop: 1, marginBottom: 1 },

  // ── Languages spoken ─────────────────────────────────────
  langText: { fontSize: 9, lineHeight: 1.4 },
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
  const firstName = nameParts.length > 2
    ? nameParts.slice(0, -2).join(' ')
    : (nameParts.length === 2 ? nameParts[0] : '')
  const lastNames = nameParts.length > 2
    ? nameParts.slice(-2).join(' ')
    : (nameParts.length === 2 ? nameParts[1] : (nameParts[0] || ''))

  const contactParts = [p.email, p.telefono, p.ubicacion, p.linkedin, p.website].filter(Boolean)

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
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
            <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
              {contactParts.flatMap((part, idx) => {
                const isLink = part === p.linkedin || part === p.website
                const sep = idx < contactParts.length - 1
                  ? [<Text key={`sep-${idx}`} style={s.contact}>{'  |  '}</Text>]
                  : []
                const el = isLink
                  ? <Link key={idx} src={toHref(part)} style={s.contactLink}>{part}</Link>
                  : <Text key={idx} style={s.contact}>{part}</Text>
                return [el, ...sep]
              })}
            </View>
          )}
        </View>

        {/* ── Skills — section header tied to content with wrap={false} ── */}
        {hasSkills && (
          <View wrap={false}>
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

        {/* ── Experience — header inside first entry's wrap={false} block ── */}
        {experiencia.map((exp, idx) => {
          const period = exp.actual
            ? `${exp.fechaInicio} – ${L.present}`
            : `${exp.fechaInicio} – ${exp.fechaFin}`
          return (
            <View key={exp.id} style={s.entry} wrap={false}>
              {idx === 0 && <SectionHeader title={L.experience} />}
              <View style={s.rowSpaced}>
                <Text style={s.company}>{exp.empresa}</Text>
                <Text style={s.period}>{period}</Text>
              </View>
              {(exp.cargo || exp.ubicacion) ? (
                <View style={s.rowSpaced}>
                  <Text style={s.entryRole}>{exp.cargo ?? ''}</Text>
                  {exp.ubicacion ? <Text style={s.entryLoc}>{exp.ubicacion}</Text> : null}
                </View>
              ) : null}
              {exp.bullets.filter(Boolean).map((b, i) => (
                <View key={i} style={s.bulletRow}>
                  <Text style={s.bulletDot}>•</Text>
                  <Text style={s.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          )
        })}

        {/* ── Projects — header inside first entry's wrap={false} block ── */}
        {proyectos.map((proj, idx) => (
          <View key={proj.id} style={s.entrySmall} wrap={false}>
            {idx === 0 && <SectionHeader title={L.projects} />}
            <View style={s.rowSpaced}>
              <Text style={s.company}>{proj.nombre}</Text>
              {proj.url ? <Link src={toHref(proj.url)} style={[s.projUrl, { textDecoration: 'none' }]}>{proj.url}</Link> : null}
            </View>
            {proj.descripcion ? <Text style={s.projDesc}>{proj.descripcion}</Text> : null}
          </View>
        ))}

        {/* ── Education — header inside first entry's wrap={false} block ── */}
        {educacion.map((edu, idx) => {
          const period = [edu.fechaInicio, edu.fechaFin].filter(Boolean).join(' – ')
          const degree = [edu.titulo, edu.campo].filter(Boolean).join(', ')
          return (
            <View key={edu.id} style={s.entrySmall} wrap={false}>
              {idx === 0 && <SectionHeader title={L.education} />}
              <View style={s.rowSpaced}>
                <Text style={s.company}>{edu.institucion || ''}</Text>
                {period ? <Text style={s.period}>{period}</Text> : null}
              </View>
              {degree ? <Text style={s.degreeText}>{degree}</Text> : null}
              {edu.logros.filter(Boolean).map((l, i) => (
                <View key={i} style={s.bulletRow}>
                  <Text style={s.bulletDot}>•</Text>
                  <Text style={s.bulletText}>{l}</Text>
                </View>
              ))}
            </View>
          )
        })}

        {/* ── Languages spoken ── */}
        {idiomas.length > 0 && (
          <View wrap={false}>
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
