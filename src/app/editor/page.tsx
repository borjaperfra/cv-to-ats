'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { CVData, ExperienciaEntry, EducacionEntry, IdiomaEntry } from '@/types/cv'
import type { ATSAnalysisResult, Suggestion } from '@/types/analysis'
import Header from '@/components/Header'
import { EMPTY_CV } from '@/types/cv'
import { exportToMarkdown } from '@/lib/export-markdown'

const HarvardTemplate = dynamic(() => import('@/components/editor/HarvardTemplate'), { ssr: false })

function genId() { return Math.random().toString(36).slice(2, 9) }

// ─── Tiny reusable field components ────────────────────────────────────────

function Field({ label, value, onChange, placeholder, multiline, rows }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; multiline?: boolean; rows?: number
}) {
  const base = "w-full font-sans text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30 transition-all"
  const style = { borderColor: '#e5e7eb', color: '#1a2744' }
  return (
    <div>
      <label className="block font-sans font-[600] text-xs uppercase tracking-wider text-gray-400 mb-1">{label}</label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            rows={rows ?? 3} className={`${base} resize-none`} style={style} />
        : <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className={base} style={style} />
      }
    </div>
  )
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 font-sans font-[700] text-xs uppercase tracking-wider px-3 py-2 rounded-lg border-2 border-dashed transition-colors duration-200"
      style={{ borderColor: '#0DA1A4', color: '#0DA1A4' }}>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
      </svg>
      {label}
    </button>
  )
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="font-sans text-xs text-gray-300 hover:text-red-400 transition-colors duration-200"
      title="Eliminar">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

// ─── Section wrapper ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 space-y-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <p className="font-sans font-[700] text-xs uppercase tracking-widest text-gray-400">{title}</p>
      {children}
    </div>
  )
}

// ─── Main editor ────────────────────────────────────────────────────────────

export default function EditorPage() {
  const [cv, setCv] = useState<CVData>(EMPTY_CV)
  const [showPreview, setShowPreview] = useState(false)
  const [exportingDocx, setExportingDocx] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  // ─ Detected CV from previous analysis ─
  const [detectedCvText, setDetectedCvText] = useState<string | null>(null)
  const [detectedResult, setDetectedResult] = useState<ATSAnalysisResult | null>(null)
  const [cvLoaded, setCvLoaded] = useState(false)
  const [loadingCv, setLoadingCv] = useState(false)
  const [loadingRecs, setLoadingRecs] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    const cvText = sessionStorage.getItem('atsCvText')
    const resultRaw = sessionStorage.getItem('atsResult')
    if (cvText && cvText.length > 100) {
      setDetectedCvText(cvText)
      if (resultRaw) {
        try { setDetectedResult(JSON.parse(resultRaw) as ATSAnalysisResult) } catch { /* ignore */ }
      }
    }
  }, [])

  const allSuggestions: Suggestion[] = detectedResult
    ? detectedResult.categories.flatMap(c => c.suggestions ?? [])
    : []

  const handleLoadCv = async () => {
    if (!detectedCvText) return
    setLoadingCv(true)
    setLoadError('')
    try {
      const res = await fetch('/api/editor/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'parse', cvText: detectedCvText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cargar el CV.')
      setCv(data as CVData)
      setCvLoaded(true)
      setDetectedCvText(null) // dismiss banner
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error inesperado.')
    } finally {
      setLoadingCv(false)
    }
  }

  const handleApplyRecs = async () => {
    if (!allSuggestions.length) return
    setLoadingRecs(true)
    setLoadError('')
    try {
      const res = await fetch('/api/editor/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'improve', cvData: cv, suggestions: allSuggestions }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al aplicar las recomendaciones.')
      setCv(data as CVData)
      setDetectedResult(null) // dismiss recs button after applying
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error inesperado.')
    } finally {
      setLoadingRecs(false)
    }
  }

  const setP = useCallback((field: keyof CVData['personalInfo'], value: string) => {
    setCv(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, [field]: value } }))
  }, [])

  // ─ Experience ─
  const addExp = () => setCv(prev => ({
    ...prev,
    experiencia: [...prev.experiencia, {
      id: genId(), empresa: '', cargo: '', ubicacion: '',
      fechaInicio: '', fechaFin: '', actual: false, bullets: [''],
    }],
  }))
  const updateExp = (id: string, patch: Partial<ExperienciaEntry>) => setCv(prev => ({
    ...prev,
    experiencia: prev.experiencia.map(e => e.id === id ? { ...e, ...patch } : e),
  }))
  const removeExp = (id: string) => setCv(prev => ({ ...prev, experiencia: prev.experiencia.filter(e => e.id !== id) }))

  // ─ Education ─
  const addEdu = () => setCv(prev => ({
    ...prev,
    educacion: [...prev.educacion, {
      id: genId(), institucion: '', titulo: '', campo: '',
      fechaInicio: '', fechaFin: '', logros: [],
    }],
  }))
  const updateEdu = (id: string, patch: Partial<EducacionEntry>) => setCv(prev => ({
    ...prev,
    educacion: prev.educacion.map(e => e.id === id ? { ...e, ...patch } : e),
  }))
  const removeEdu = (id: string) => setCv(prev => ({ ...prev, educacion: prev.educacion.filter(e => e.id !== id) }))

  // ─ Skills ─
  const [skillInput, setSkillInput] = useState('')
  const addSkill = () => {
    const trimmed = skillInput.trim()
    if (!trimmed) return
    setCv(prev => ({ ...prev, habilidades: [...prev.habilidades, trimmed] }))
    setSkillInput('')
  }

  // ─ Languages ─
  const addIdioma = () => setCv(prev => ({
    ...prev,
    idiomas: [...prev.idiomas, { id: genId(), idioma: '', nivel: '' }],
  }))
  const updateIdioma = (id: string, patch: Partial<IdiomaEntry>) => setCv(prev => ({
    ...prev,
    idiomas: prev.idiomas.map(l => l.id === id ? { ...l, ...patch } : l),
  }))
  const removeIdioma = (id: string) => setCv(prev => ({ ...prev, idiomas: prev.idiomas.filter(l => l.id !== id) }))

  // ─ Exports ─
  const handlePdfExport = async () => {
    setExportingPdf(true)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const templateEl = document.getElementById('harvard-template')
      if (!templateEl) return

      // On mobile the desktop preview wrapper is hidden — temporarily reveal it
      const hiddenAncestor = templateEl.parentElement?.closest('[class*="hidden"]') as HTMLElement | null
      if (hiddenAncestor) {
        hiddenAncestor.style.display = 'block'
        await new Promise(r => setTimeout(r, 60))
      }

      const canvas = await html2canvas(templateEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      })

      if (hiddenAncestor) hiddenAncestor.style.display = ''

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = pdf.internal.pageSize.getHeight()
      const imgH = (canvas.height * pdfW) / canvas.width

      if (imgH <= pdfH) {
        pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, pdfW, imgH)
      } else {
        // Multi-page: slice canvas into A4 chunks
        const pageHpx = Math.floor((pdfH * canvas.width) / pdfW)
        let y = 0
        while (y < canvas.height) {
          const sliceH = Math.min(pageHpx, canvas.height - y)
          const pg = document.createElement('canvas')
          pg.width = canvas.width
          pg.height = sliceH
          const ctx = pg.getContext('2d')!
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, pg.width, pg.height)
          ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
          if (y > 0) pdf.addPage()
          pdf.addImage(pg.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, pdfW, (sliceH * pdfW) / canvas.width)
          y += pageHpx
        }
      }

      const nombre = cv.personalInfo.nombre || 'cv'
      pdf.save(`${nombre.replace(/\s+/g, '_').toLowerCase()}_harvard.pdf`)
    } finally {
      setExportingPdf(false)
    }
  }

  const handleDocxExport = async () => {
    setExportingDocx(true)
    try {
      const { exportToDocx } = await import('@/lib/export-docx')
      await exportToDocx(cv)
    } finally {
      setExportingDocx(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0ede8' }}>

      <Header />

      {/* Hero */}
      <section className="bg-navy text-white py-10 px-6">
        <div className="max-w-container mx-auto text-center">
          <p className="font-sans font-[900] uppercase tracking-widest text-neon text-xs mb-4">
            Herramienta Gratuita de Manfred
          </p>
          <h1 className="font-heading font-[900] text-4xl md:text-5xl leading-tight mb-3">
            Editor de CV
            <br />
            <span className="italic" style={{ color: '#01FFC6' }}>estilo Harvard</span>
          </h1>
          <p className="font-sans text-base text-white/70 max-w-xl mx-auto">
            Crea tu CV en el formato más aceptado por los ATS. Exporta a DOCX, PDF o Markdown.
          </p>
        </div>
      </section>

      {/* Two-column layout */}
      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-6 items-start">

        {/* ─── LEFT: Form ─── */}
        <div className="flex-1 min-w-0 space-y-4 max-w-xl">

          {/* ─ CV detected banner ─ */}
          {detectedCvText && (
            <div className="rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              style={{ backgroundColor: '#e6f7f7', border: '1px solid #b2e8e8' }}>
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: '#0DA1A4' }}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-sans font-[700] text-sm" style={{ color: '#0DA1A4' }}>
                    {detectedResult?.nombre
                      ? `Hemos detectado el CV de ${detectedResult.nombre}`
                      : 'Hemos detectado un CV del análisis anterior'}
                  </p>
                  <p className="font-sans text-xs mt-0.5" style={{ color: '#0a7a7c' }}>
                    Cárgalo automáticamente en el editor con todos los campos rellenados.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleLoadCv}
                  disabled={loadingCv}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-sans font-[900] text-xs uppercase tracking-wider text-white transition-all disabled:opacity-60"
                  style={{ backgroundColor: '#0DA1A4' }}
                >
                  {loadingCv ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Cargando...
                    </>
                  ) : 'Cargar en el editor'}
                </button>
                <button
                  onClick={() => setDetectedCvText(null)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: '#0DA1A4' }}
                  aria-label="Descartar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ─ Apply ATS recommendations banner ─ */}
          {cvLoaded && detectedResult && allSuggestions.length > 0 && (
            <div className="rounded-2xl p-4"
              style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: '#f59e0b' }}>
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-sans font-[700] text-sm" style={{ color: '#92400e' }}>
                      {allSuggestions.length} recomendaciones del análisis ATS
                    </p>
                    <p className="font-sans text-xs mt-0.5" style={{ color: '#b45309' }}>
                      La IA optimizará tu perfil profesional, los logros de cada puesto y añadirá las habilidades técnicas que faltan.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDetectedResult(null)}
                  className="flex-shrink-0 p-1 rounded-lg transition-colors mt-0.5"
                  style={{ color: '#d97706' }}
                  aria-label="Descartar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <button
                onClick={handleApplyRecs}
                disabled={loadingRecs}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-sans font-[900] text-xs uppercase tracking-wider text-white transition-all disabled:opacity-60"
                style={{ backgroundColor: '#d97706' }}
              >
                {loadingRecs ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Aplicando mejoras...
                  </>
                ) : 'Aplicar recomendaciones al CV'}
              </button>
            </div>
          )}

          {/* ─ Load/apply error ─ */}
          {loadError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-sans text-sm text-red-700">{loadError}</p>
            </div>
          )}

          {/* Export buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleDocxExport}
              disabled={exportingDocx}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans font-[900] text-xs uppercase tracking-wider text-white transition-all duration-300 disabled:opacity-60"
              style={{ backgroundColor: '#092c64' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {exportingDocx ? 'Generando...' : 'Descargar DOCX'}
            </button>
            <button
              onClick={handlePdfExport}
              disabled={exportingPdf}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans font-[900] text-xs uppercase tracking-wider border-2 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ borderColor: '#092c64', color: '#092c64' }}
            >
              {exportingPdf ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Generando PDF...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descargar PDF
                </>
              )}
            </button>
            <button
              onClick={() => exportToMarkdown(cv)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans font-[900] text-xs uppercase tracking-wider border-2 transition-all duration-300"
              style={{ borderColor: '#e5e7eb', color: '#9ca3af' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Markdown
            </button>
          </div>

          {/* Personal Info */}
          <Section title="Información personal">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Nombre completo" value={cv.personalInfo.nombre} onChange={v => setP('nombre', v)} placeholder="Juan García López" />
              </div>
              <div className="col-span-2">
                <Field label="Título profesional" value={cv.personalInfo.cargo} onChange={v => setP('cargo', v)} placeholder="Senior Software Engineer" />
              </div>
              <Field label="Email" value={cv.personalInfo.email} onChange={v => setP('email', v)} placeholder="juan@email.com" />
              <Field label="Teléfono" value={cv.personalInfo.telefono} onChange={v => setP('telefono', v)} placeholder="+34 600 000 000" />
              <Field label="LinkedIn" value={cv.personalInfo.linkedin} onChange={v => setP('linkedin', v)} placeholder="linkedin.com/in/juan" />
              <Field label="Ubicación" value={cv.personalInfo.ubicacion} onChange={v => setP('ubicacion', v)} placeholder="Madrid, España" />
              <div className="col-span-2">
                <Field label="Web / Portfolio" value={cv.personalInfo.website} onChange={v => setP('website', v)} placeholder="juangarcia.dev" />
              </div>
            </div>
          </Section>

          {/* Summary */}
          <Section title="Resumen profesional">
            <Field label="Resumen" value={cv.resumen}
              onChange={v => setCv(prev => ({ ...prev, resumen: v }))}
              placeholder="Escribe un resumen conciso de tu perfil profesional..."
              multiline rows={4} />
          </Section>

          {/* Experience */}
          <Section title="Experiencia">
            {cv.experiencia.map((exp, idx) => (
              <div key={exp.id} className="space-y-3 pt-3 border-t border-gray-100 first:border-0 first:pt-0">
                <div className="flex items-center justify-between">
                  <p className="font-sans font-[700] text-xs text-gray-500">Posición {idx + 1}</p>
                  <RemoveButton onClick={() => removeExp(exp.id)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Cargo" value={exp.cargo} onChange={v => updateExp(exp.id, { cargo: v })} placeholder="Software Engineer" />
                  <Field label="Empresa" value={exp.empresa} onChange={v => updateExp(exp.id, { empresa: v })} placeholder="Acme Corp" />
                  <Field label="Fecha inicio" value={exp.fechaInicio} onChange={v => updateExp(exp.id, { fechaInicio: v })} placeholder="Ene 2022" />
                  <Field label="Fecha fin" value={exp.fechaFin} onChange={v => updateExp(exp.id, { fechaFin: v })} placeholder="Dic 2024" />
                  <div className="col-span-2">
                    <Field label="Ubicación" value={exp.ubicacion} onChange={v => updateExp(exp.id, { ubicacion: v })} placeholder="Madrid, España" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id={`actual-${exp.id}`} checked={exp.actual}
                    onChange={e => updateExp(exp.id, { actual: e.target.checked })}
                    className="w-4 h-4 accent-teal rounded" />
                  <label htmlFor={`actual-${exp.id}`} className="font-sans text-sm text-gray-500">Trabajo actual</label>
                </div>
                <div>
                  <label className="block font-sans font-[600] text-xs uppercase tracking-wider text-gray-400 mb-1.5">Logros y responsabilidades</label>
                  <div className="space-y-2">
                    {exp.bullets.map((b, bi) => (
                      <div key={bi} className="flex gap-2 items-start">
                        <span className="mt-2.5 text-gray-300 text-xs flex-shrink-0">•</span>
                        <input
                          type="text" value={b}
                          onChange={e => {
                            const bullets = [...exp.bullets]
                            bullets[bi] = e.target.value
                            updateExp(exp.id, { bullets })
                          }}
                          placeholder="Describe un logro concreto con métricas..."
                          className="flex-1 font-sans text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30 transition-all"
                          style={{ borderColor: '#e5e7eb', color: '#1a2744' }}
                        />
                        <button onClick={() => {
                          const bullets = exp.bullets.filter((_, i) => i !== bi)
                          updateExp(exp.id, { bullets: bullets.length ? bullets : [''] })
                        }} className="mt-2 text-gray-300 hover:text-red-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => updateExp(exp.id, { bullets: [...exp.bullets, ''] })}
                    className="mt-2 font-sans text-xs text-gray-400 hover:text-teal transition-colors">
                    + Añadir punto
                  </button>
                </div>
              </div>
            ))}
            <AddButton label="Añadir experiencia" onClick={addExp} />
          </Section>

          {/* Education */}
          <Section title="Educación">
            {cv.educacion.map((edu, idx) => (
              <div key={edu.id} className="space-y-3 pt-3 border-t border-gray-100 first:border-0 first:pt-0">
                <div className="flex items-center justify-between">
                  <p className="font-sans font-[700] text-xs text-gray-500">Formación {idx + 1}</p>
                  <RemoveButton onClick={() => removeEdu(edu.id)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Field label="Institución" value={edu.institucion} onChange={v => updateEdu(edu.id, { institucion: v })} placeholder="Universidad Complutense" />
                  </div>
                  <Field label="Título" value={edu.titulo} onChange={v => updateEdu(edu.id, { titulo: v })} placeholder="Grado en Ingeniería" />
                  <Field label="Campo de estudio" value={edu.campo} onChange={v => updateEdu(edu.id, { campo: v })} placeholder="Informática" />
                  <Field label="Fecha inicio" value={edu.fechaInicio} onChange={v => updateEdu(edu.id, { fechaInicio: v })} placeholder="2016" />
                  <Field label="Fecha fin" value={edu.fechaFin} onChange={v => updateEdu(edu.id, { fechaFin: v })} placeholder="2020" />
                </div>
                <div>
                  <label className="block font-sans font-[600] text-xs uppercase tracking-wider text-gray-400 mb-1.5">Logros destacados (opcional)</label>
                  <div className="space-y-2">
                    {edu.logros.map((l, li) => (
                      <div key={li} className="flex gap-2 items-start">
                        <span className="mt-2.5 text-gray-300 text-xs flex-shrink-0">•</span>
                        <input
                          type="text" value={l}
                          onChange={e => {
                            const logros = [...edu.logros]
                            logros[li] = e.target.value
                            updateEdu(edu.id, { logros })
                          }}
                          placeholder="Premio, distinción, TFG destacado..."
                          className="flex-1 font-sans text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30 transition-all"
                          style={{ borderColor: '#e5e7eb', color: '#1a2744' }}
                        />
                        <button onClick={() => {
                          updateEdu(edu.id, { logros: edu.logros.filter((_, i) => i !== li) })
                        }} className="mt-2 text-gray-300 hover:text-red-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => updateEdu(edu.id, { logros: [...edu.logros, ''] })}
                    className="mt-2 font-sans text-xs text-gray-400 hover:text-teal transition-colors">
                    + Añadir logro
                  </button>
                </div>
              </div>
            ))}
            <AddButton label="Añadir educación" onClick={addEdu} />
          </Section>

          {/* Skills */}
          <Section title="Habilidades">
            <div className="flex flex-wrap gap-2 min-h-[40px]">
              {cv.habilidades.map((skill, i) => (
                <span key={i}
                  className="flex items-center gap-1.5 font-sans text-sm px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: '#e6f7f7', color: '#0DA1A4' }}>
                  {skill}
                  <button onClick={() => setCv(prev => ({ ...prev, habilidades: prev.habilidades.filter((_, idx) => idx !== i) }))}
                    className="text-teal/50 hover:text-teal transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text" value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
                placeholder="React, Python, SQL... (Enter para añadir)"
                className="flex-1 font-sans text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30 transition-all"
                style={{ borderColor: '#e5e7eb', color: '#1a2744' }}
              />
              <button onClick={addSkill}
                className="px-4 py-2 rounded-lg font-sans font-[700] text-xs uppercase tracking-wider text-white transition-all"
                style={{ backgroundColor: '#0DA1A4' }}>
                Añadir
              </button>
            </div>
          </Section>

          {/* Languages */}
          <Section title="Idiomas">
            {cv.idiomas.map((l, idx) => (
              <div key={l.id} className="flex gap-3 items-end">
                <div className="flex-1">
                  <Field label={idx === 0 ? 'Idioma' : ''} value={l.idioma}
                    onChange={v => updateIdioma(l.id, { idioma: v })} placeholder="Español" />
                </div>
                <div className="flex-1">
                  <Field label={idx === 0 ? 'Nivel' : ''} value={l.nivel}
                    onChange={v => updateIdioma(l.id, { nivel: v })} placeholder="Nativo / B2 / Avanzado" />
                </div>
                <div className="mb-0.5">
                  <RemoveButton onClick={() => removeIdioma(l.id)} />
                </div>
              </div>
            ))}
            <AddButton label="Añadir idioma" onClick={addIdioma} />
          </Section>

        </div>

        {/* ─── RIGHT: Preview ─── */}
        <div className="hidden lg:block sticky top-20" style={{ width: '210mm', flexShrink: 0 }}>
          <p className="font-sans font-[700] text-xs uppercase tracking-widest text-gray-400 mb-3">
            Vista previa · Plantilla Harvard
          </p>
          <div style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.12)', borderRadius: 4, overflow: 'hidden' }}>
            <HarvardTemplate data={cv} />
          </div>
        </div>

      </div>

      {/* Mobile preview toggle */}
      <div className="lg:hidden fixed bottom-4 right-4 z-20">
        <button
          onClick={() => setShowPreview(v => !v)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl font-sans font-[900] text-xs uppercase tracking-wider text-white"
          style={{ backgroundColor: '#092c64', boxShadow: '0 4px 16px rgba(9,44,100,0.4)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {showPreview ? 'Ocultar' : 'Vista previa'}
        </button>
      </div>

      {/* Mobile preview modal */}
      {showPreview && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/50 overflow-auto p-4"
          onClick={() => setShowPreview(false)}>
          <div onClick={e => e.stopPropagation()} className="max-w-full overflow-x-auto">
            <HarvardTemplate data={cv} />
          </div>
        </div>
      )}

    </div>
  )
}
