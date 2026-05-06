import type { CVData, SkillCategories } from '@/types/cv'

const SKILL_ROWS: { key: keyof SkillCategories; label: string }[] = [
  { key: 'languages',  label: 'Languages' },
  { key: 'frameworks', label: 'Frameworks' },
  { key: 'databases',  label: 'Databases' },
  { key: 'tools',      label: 'Technologies / Tools' },
  { key: 'practices',  label: 'Practices' },
]

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8pt', marginTop: '16pt', marginBottom: '6pt' }}>
      <span style={{
        fontWeight: 700,
        fontSize: '11pt',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.08em',
        color: '#111',
        whiteSpace: 'nowrap' as const,
        flexShrink: 0,
      }}>
        {title}
      </span>
      <div style={{ flex: 1, height: '0.5pt', backgroundColor: '#aaa' }} />
    </div>
  )
}

export default function HarvardTemplate({ data }: { data: CVData }) {
  const { personalInfo: p, experiencia, proyectos, educacion, habilidades, idiomas } = data

  // Last 2 words → bold surnames; everything before → light given name(s)
  const nameParts = (p.nombre || '').trim().split(/\s+/)
  const firstName = nameParts.length > 2
    ? nameParts.slice(0, -2).join(' ')
    : (nameParts.length === 2 ? nameParts[0] : '')
  const lastNames = nameParts.length > 1
    ? nameParts.slice(-2).join(' ')
    : (nameParts[0] || '')

  const contactParts = [p.email, p.telefono, p.ubicacion, p.linkedin, p.website].filter(Boolean)
  const hasSkills = SKILL_ROWS.some(r => habilidades[r.key].length > 0)

  return (
    <div
      id="harvard-template"
      className="bg-white text-black"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '18mm 20mm 20mm 20mm',
        fontSize: '10pt',
        lineHeight: '1.45',
        fontFamily: '"Helvetica Neue", Arial, Helvetica, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <header style={{ display: 'flex', gap: '8mm', alignItems: 'flex-start' }}>
        {p.foto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.foto}
            alt="Profile photo"
            style={{
              width: '28mm', height: '28mm',
              objectFit: 'cover',
              borderRadius: '50%',
              border: '0.5pt solid #ccc',
              flexShrink: 0,
            }}
          />
        )}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ marginBottom: '3pt' }}>
            {p.nombre
              ? <>
                  {firstName && (
                    <span style={{ fontSize: '22pt', fontWeight: 300, letterSpacing: '-0.01em' }}>{firstName} </span>
                  )}
                  <span style={{ fontSize: '22pt', fontWeight: 700, letterSpacing: '-0.01em' }}>{lastNames}</span>
                </>
              : <span style={{ fontSize: '22pt', fontWeight: 700, color: '#ccc' }}>Your Name</span>
            }
          </div>
          {p.cargo && (
            <div style={{ fontSize: '10pt', color: '#555', marginBottom: '4pt', letterSpacing: '0.02em' }}>
              {p.cargo}
            </div>
          )}
          {contactParts.length > 0 && (
            <div style={{ fontSize: '8.5pt', color: '#666' }}>
              {contactParts.join('  |  ')}
            </div>
          )}
        </div>
      </header>

      {/* Skills */}
      {hasSkills && (
        <section aria-label="Skills">
          <SectionHeader title="Skills" />
          <div style={{ fontSize: '9.5pt', lineHeight: '1.7' }}>
            {SKILL_ROWS.map(({ key, label }) =>
              habilidades[key].length > 0 && (
                <div key={key} style={{ display: 'flex', gap: '4pt' }}>
                  <span style={{ fontWeight: 700, minWidth: '108pt', flexShrink: 0 }}>{label}:</span>
                  <span>{habilidades[key].join(', ')}</span>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* Experience */}
      {experiencia.length > 0 && (
        <section aria-label="Experience">
          <SectionHeader title="Experience" />
          {experiencia.map(exp => {
            const period = exp.actual
              ? `${exp.fechaInicio} – Present`
              : `${exp.fechaInicio} – ${exp.fechaFin}`
            const roleMeta = [exp.cargo, exp.ubicacion].filter(Boolean).join(' · ')
            return (
              <div key={exp.id} style={{ marginBottom: '10pt', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 700, fontSize: '10pt' }}>{exp.empresa}</span>
                  <span style={{ fontSize: '9pt', color: '#555', flexShrink: 0, marginLeft: '8pt' }}>{period}</span>
                </div>
                {roleMeta && (
                  <div style={{ fontSize: '9pt', color: '#555', fontStyle: 'italic', marginTop: '1pt', marginBottom: '3pt' }}>{roleMeta}</div>
                )}
                {exp.bullets.filter(Boolean).length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                    {exp.bullets.filter(Boolean).map((b, i) => (
                      <li key={i} style={{ display: 'flex', gap: '6pt', fontSize: '10pt', lineHeight: '1.45', marginTop: '2pt' }}>
                        <span style={{ flexShrink: 0 }}>•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </section>
      )}

      {/* Projects */}
      {proyectos.length > 0 && (
        <section aria-label="Projects">
          <SectionHeader title="Projects" />
          {proyectos.map(proj => (
            <div key={proj.id} style={{ marginBottom: '8pt', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700, fontSize: '10pt' }}>{proj.nombre}</span>
                {proj.url && (
                  <span style={{ fontSize: '8.5pt', color: '#666', flexShrink: 0, marginLeft: '8pt' }}>{proj.url}</span>
                )}
              </div>
              {proj.descripcion && (
                <p style={{ margin: '2pt 0 0 0', fontSize: '10pt', lineHeight: '1.45' }}>{proj.descripcion}</p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Education */}
      {educacion.length > 0 && (
        <section aria-label="Education">
          <SectionHeader title="Education" />
          {educacion.map(edu => {
            const period = `${edu.fechaInicio} – ${edu.fechaFin}`
            const degree = [edu.titulo, edu.campo].filter(Boolean).join(', ')
            return (
              <div key={edu.id} style={{ marginBottom: '8pt', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 700, fontSize: '10pt' }}>
                    {edu.institucion || <span style={{ color: '#ccc' }}>Institution</span>}
                  </span>
                  <span style={{ fontSize: '9pt', color: '#555', flexShrink: 0, marginLeft: '8pt' }}>{period}</span>
                </div>
                {degree && (
                  <div style={{ fontSize: '9pt', color: '#555', fontStyle: 'italic', marginTop: '1pt', marginBottom: '2pt' }}>{degree}</div>
                )}
                {edu.logros.filter(Boolean).length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                    {edu.logros.filter(Boolean).map((l, i) => (
                      <li key={i} style={{ display: 'flex', gap: '6pt', fontSize: '10pt', lineHeight: '1.45', marginTop: '2pt' }}>
                        <span style={{ flexShrink: 0 }}>•</span>
                        <span>{l}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </section>
      )}

      {/* Languages (spoken) */}
      {idiomas.length > 0 && (
        <section aria-label="Languages">
          <SectionHeader title="Languages" />
          <p style={{ fontSize: '9.5pt', lineHeight: '1.6', margin: 0 }}>
            {idiomas.map(l => `${l.idioma}: ${l.nivel}`).join('  ·  ')}
          </p>
        </section>
      )}
    </div>
  )
}
