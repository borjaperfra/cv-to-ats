import { ImageResponse } from 'next/og'

export const runtime = 'edge'

const BARS = [
  { label: 'Keywords & skills',       pct: 85, color: '#0DA1A4' },
  { label: 'Formato y parseabilidad', pct: 72, color: '#f59e0b' },
  { label: 'Estructura experiencia',  pct: 90, color: '#0DA1A4' },
  { label: 'Educación',               pct: 65, color: '#f59e0b' },
  { label: 'Información de contacto', pct: 95, color: '#0DA1A4' },
]

export async function GET() {
  const image = new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          backgroundColor: '#092c64',
          display: 'flex',
          fontFamily: 'sans-serif',
        }}
      >
        {/* ── Left: headline ── */}
        <div
          style={{
            width: '500px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '72px 56px',
            gap: '0px',
          }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '36px' }}>
            <div style={{
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '4px',
              textTransform: 'uppercase',
              opacity: 0.5,
            }}>
              MANFRED
            </div>
            <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <div style={{
              color: '#01FFC6',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '4px',
              textTransform: 'uppercase',
            }}>
              BETA
            </div>
          </div>

          {/* Headline */}
          <div style={{
            fontSize: '52px',
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1.05,
            letterSpacing: '-1.5px',
          }}>
            Analiza tu CV.
          </div>
          <div style={{
            fontSize: '52px',
            fontWeight: 900,
            color: '#01FFC6',
            lineHeight: 1.05,
            letterSpacing: '-1.5px',
            marginTop: '4px',
          }}>
            Prepáralo
          </div>
          <div style={{
            fontSize: '52px',
            fontWeight: 900,
            color: '#01FFC6',
            lineHeight: 1.05,
            letterSpacing: '-1.5px',
          }}>
            para los ATS.
          </div>

          {/* Subtitle */}
          <div style={{
            fontSize: '16px',
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.55,
            marginTop: '28px',
            maxWidth: '340px',
          }}>
            Descubre qué ven los reclutadores antes de que llegues a la primera entrevista.
          </div>
        </div>

        {/* ── Right: mock report card ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 64px 48px 32px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          }}>
            {/* Card header */}
            <div style={{
              backgroundColor: '#1a2744',
              borderRadius: '16px 16px 0 0',
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '16px',
                }}>
                  M
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '14px' }}>María González</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px' }}>Senior Product Designer · 7 años exp.</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>Puntuación ATS</div>
                <div style={{ color: '#ffffff', fontWeight: 900, fontSize: '30px', lineHeight: 1 }}>78<span style={{ fontSize: '16px', opacity: 0.7 }}>%</span></div>
              </div>
            </div>

            {/* Card body */}
            <div style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: '11px' }}>
              <div style={{
                color: '#9ca3af',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}>
                Desglose por categoría
              </div>
              {BARS.map((bar) => (
                <div key={bar.label} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#374151' }}>{bar.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: bar.color }}>{bar.pct}%</span>
                  </div>
                  <div style={{ height: '5px', backgroundColor: '#f3f4f6', borderRadius: '99px', display: 'flex' }}>
                    <div style={{ width: `${bar.pct}%`, backgroundColor: bar.color, height: '5px', borderRadius: '99px' }} />
                  </div>
                </div>
              ))}

              {/* Footer note */}
              <div style={{
                marginTop: '8px',
                paddingTop: '14px',
                borderTop: '1px solid #f3f4f6',
                color: '#9ca3af',
                fontSize: '11px',
              }}>
                Ejemplo generado a partir de un CV real · manfred.com
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
  image.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400')
  return image
}
