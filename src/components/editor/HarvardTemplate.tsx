import type { CVData } from '@/types/cv'

interface Props {
  data: CVData
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mt-5 mb-2 border-b border-black pb-1.5">
      <p className="font-serif font-bold text-[11pt] uppercase tracking-wide">{title}</p>
    </div>
  )
}

export default function HarvardTemplate({ data }: Props) {
  const { personalInfo: p, resumen, experiencia, educacion, habilidades, idiomas } = data

  const contactParts = [p.email, p.telefono, p.linkedin, p.ubicacion, p.website].filter(Boolean)

  return (
    <div
      id="harvard-template"
      className="bg-white font-serif text-black"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '25.4mm 25.4mm 25.4mm 25.4mm',
        fontSize: '10pt',
        lineHeight: '1.4',
        fontFamily: '"Times New Roman", Times, serif',
        boxSizing: 'border-box',
      }}
    >
      {/* Name */}
      <div className="text-center mb-1">
        <p className="font-bold" style={{ fontSize: '18pt' }}>
          {p.nombre || <span className="text-gray-300">Tu Nombre</span>}
        </p>
        {p.cargo && (
          <p className="italic mt-0.5" style={{ fontSize: '10pt', color: '#444' }}>{p.cargo}</p>
        )}
      </div>

      {/* Contact */}
      {contactParts.length > 0 && (
        <p className="text-center mt-1 text-[9pt]" style={{ color: '#333' }}>
          {contactParts.join(' · ')}
        </p>
      )}

      <div className="border-b border-black mt-3 mb-1" />

      {/* Summary */}
      {resumen && (
        <>
          <SectionHeader title="Resumen" />
          <p className="text-[10pt] leading-snug">{resumen}</p>
        </>
      )}

      {/* Experience */}
      {experiencia.length > 0 && (
        <>
          <SectionHeader title="Experiencia" />
          {experiencia.map(exp => {
            const period = exp.actual ? `${exp.fechaInicio} – Presente` : `${exp.fechaInicio} – ${exp.fechaFin}`
            return (
              <div key={exp.id} className="mb-3" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <div className="flex items-baseline justify-between">
                  <p className="font-bold text-[10pt]">
                    {exp.cargo}
                    {exp.empresa && <span className="font-normal"> — {exp.empresa}</span>}
                  </p>
                  <p className="text-[9pt] italic text-gray-600 flex-shrink-0 ml-2">{period}</p>
                </div>
                {exp.ubicacion && (
                  <p className="text-[9pt] italic text-gray-500 mb-0.5">{exp.ubicacion}</p>
                )}
                {exp.bullets.filter(Boolean).length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {exp.bullets.filter(Boolean).map((b, i) => (
                      <li key={i} className="flex gap-2 text-[10pt]">
                        <span className="flex-shrink-0 mt-0.5">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </>
      )}

      {/* Education */}
      {educacion.length > 0 && (
        <>
          <SectionHeader title="Educación" />
          {educacion.map(edu => {
            const period = `${edu.fechaInicio} – ${edu.fechaFin}`
            const degree = [edu.titulo, edu.campo].filter(Boolean).join(', ')
            return (
              <div key={edu.id} className="mb-3" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <div className="flex items-baseline justify-between">
                  <p className="font-bold text-[10pt]">{degree || <span className="text-gray-300">Título</span>}</p>
                  <p className="text-[9pt] italic text-gray-600 flex-shrink-0 ml-2">{period}</p>
                </div>
                {edu.institucion && (
                  <p className="text-[9pt] italic text-gray-500">{edu.institucion}</p>
                )}
                {edu.logros.filter(Boolean).length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {edu.logros.filter(Boolean).map((l, i) => (
                      <li key={i} className="flex gap-2 text-[10pt]">
                        <span className="flex-shrink-0 mt-0.5">•</span>
                        <span>{l}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </>
      )}

      {/* Skills */}
      {habilidades.length > 0 && (
        <>
          <SectionHeader title="Habilidades" />
          <p className="text-[10pt]">{habilidades.join(' · ')}</p>
        </>
      )}

      {/* Languages */}
      {idiomas.length > 0 && (
        <>
          <SectionHeader title="Idiomas" />
          {idiomas.map(l => (
            <p key={l.id} className="text-[10pt]">
              <span className="font-bold">{l.idioma}</span>: {l.nivel}
            </p>
          ))}
        </>
      )}
    </div>
  )
}
