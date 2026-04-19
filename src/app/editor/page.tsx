'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { CVData, ExperienciaEntry, EducacionEntry, IdiomaEntry } from '@/types/cv'
import type { ATSAnalysisResult, Suggestion } from '@/types/analysis'
import Header from '@/components/Header'
import { EMPTY_CV } from '@/types/cv'
import { exportToMarkdown } from '@/lib/export-markdown'
import { getLang } from '@/components/LanguageSelector'

const LABELS = {
  es: {
    personalInfo: 'Información personal', nombre: 'Nombre completo', cargo: 'Título profesional',
    email: 'Email', telefono: 'Teléfono', linkedin: 'LinkedIn', ubicacion: 'Ubicación',
    website: 'Web / Portfolio', resumenSection: 'Resumen profesional', resumenField: 'Resumen',
    experiencia: 'Experiencia', educacion: 'Educación', habilidades: 'Habilidades', idiomas: 'Idiomas',
    posicion: 'Posición', formacion: 'Formación', cargoField: 'Cargo', empresa: 'Empresa',
    fechaInicio: 'Fecha inicio', fechaFin: 'Fecha fin', actual: 'Trabajo actual',
    logros: 'Logros y responsabilidades', logrosEdu: 'Logros destacados (opcional)',
    institucion: 'Institución', titulo: 'Título', campo: 'Campo de estudio',
    idioma: 'Idioma', nivel: 'Nivel', addExp: 'Añadir experiencia', addEdu: 'Añadir educación',
    addIdioma: 'Añadir idioma', addSkill: 'Añadir', addBullet: '+ Añadir punto',
    addLogro: '+ Añadir logro', skillPlaceholder: 'React, Python, SQL... (Enter para añadir)',
    preview: 'Vista previa · Plantilla Harvard',
  },
  en: {
    personalInfo: 'Personal information', nombre: 'Full name', cargo: 'Professional title',
    email: 'Email', telefono: 'Phone', linkedin: 'LinkedIn', ubicacion: 'Location',
    website: 'Website / Portfolio', resumenSection: 'Professional summary', resumenField: 'Summary',
    experiencia: 'Experience', educacion: 'Education', habilidades: 'Skills', idiomas: 'Languages',
    posicion: 'Position', formacion: 'Education entry', cargoField: 'Job title', empresa: 'Company',
    fechaInicio: 'Start date', fechaFin: 'End date', actual: 'Current job',
    logros: 'Achievements and responsibilities', logrosEdu: 'Notable achievements (optional)',
    institucion: 'Institution', titulo: 'Degree', campo: 'Field of study',
    idioma: 'Language', nivel: 'Level', addExp: 'Add experience', addEdu: 'Add education',
    addIdioma: 'Add language', addSkill: 'Add', addBullet: '+ Add bullet',
    addLogro: '+ Add achievement', skillPlaceholder: 'React, Python, SQL... (Enter to add)',
    preview: 'Preview · Harvard template',
  },
}

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

const DRAFT_KEY = 'cv-editor-draft'

function wordCount(cv: CVData): number {
  return [
    cv.resumen,
    ...cv.experiencia.map(e => `${e.cargo} ${e.empresa} ${e.bullets.join(' ')}`),
    ...cv.educacion.map(e => `${e.titulo} ${e.institucion} ${e.logros.join(' ')}`),
    cv.habilidades,
    ...cv.idiomas.map(l => l.idioma),
  ].join(' ').split(/\s+/).filter(Boolean).length
}

export default function EditorPage() {
  const [cv, setCv] = useState<CVData>(EMPTY_CV)
  const [showPreview, setShowPreview] = useState(false)
  const [exportingDocx, setExportingDocx] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [lang, setLang] = useState<'es' | 'en'>('es')

  // ─ Detected CV from previous analysis ─
  const [detectedCvText, setDetectedCvText] = useState<string | null>(null)
  const [detectedResult, setDetectedResult] = useState<ATSAnalysisResult | null>(null)
  const [cvLoaded, setCvLoaded] = useState(false)
  const [loadingCv, setLoadingCv] = useState(false)
  const [loadingRecs, setLoadingRecs] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [changesApplied, setChangesApplied] = useState<number | null>(null)

  useEffect(() => {
    setLang(getLang())

    // Always restore the persisted draft first so the editor is never empty on return
    const draft = localStorage.getItem(DRAFT_KEY)
    if (draft) {
      try {
        setCv(JSON.parse(draft))
        setSavedAt(new Date())
      } catch { /* ignore */ }
    }

    // If there's fresh analysis data, show the import banner on top of whatever is loaded
    // Check sessionStorage first, fall back to localStorage (UX-04 persists it there)
    const cvText = sessionStorage.getItem('atsCvText') || localStorage.getItem('atsCvText')
    const resultRaw = sessionStorage.getItem('atsResult')
    if (cvText && cvText.length > 100) {
      setDetectedCvText(cvText)
      if (resultRaw) {
        try { setDetectedResult(JSON.parse(resultRaw) as ATSAnalysisResult) } catch { /* ignore */ }
      }
    }
  }, [])

  // Autosave draft on every change (debounced 800ms)
  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(cv))
      setSavedAt(new Date())
    }, 800)
    return () => clearTimeout(t)
  }, [cv])

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
      setDetectedCvText(null)
      // Clear sessionStorage so the import banner doesn't reappear on next visit
      sessionStorage.removeItem('atsCvText')
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
    const prevCv = cv
    try {
      const res = await fetch('/api/editor/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'improve', cvData: cv, suggestions: allSuggestions }),
      })
      const data = await res.json() as CVData
      if (!res.ok) throw new Error((data as unknown as { error: string }).error || 'Error al aplicar las recomendaciones.')
      // Count changes between old and new CV
      const bulletChanges = prevCv.experiencia.reduce((sum, exp, i) => {
        const newExp = data.experiencia[i]
        if (!newExp) return sum
        return sum + exp.bullets.filter((b, bi) => b !== (newExp.bullets[bi] ?? '')).length
      }, 0)
      const resumenChanged = prevCv.resumen !== data.resumen ? 1 : 0
      setChangesApplied(bulletChanges + resumenChanged)
      setCv(data)
      setDetectedResult(null)
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
  // Renders a text-based PDF directly from the cv data object using jsPDF's text API.
  // This produces a real text layer so the PDF is parseable by ATS systems and by
  // our own /api/analyze route (pdf-parse). Image-based PDFs (html2canvas) have no
  // text layer and cannot be re-analyzed.
  const handlePdfExport = async () => {
    setExportingPdf(true)
    try {
      const { jsPDF } = await import('jspdf')

      const W = 210, H = 297
      const mL = 20, mR = 20, mT = 18, mB = 20
      const cW = W - mL - mR
      const LH = 5   // base line-height in mm (10 pt)
      const LH9 = 4.5 // line-height for 9 pt

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      let y = mT

      // Adds a new page and resets y to top margin
      const newPage = () => { pdf.addPage(); y = mT }
      // Ensures at least `mm` of vertical space remains; adds page if not
      const need = (mm: number) => { if (y + mm > H - mB) newPage() }

      // Font shorthand helpers
      const bold   = (n = 10) => { pdf.setFont('times', 'bold');   pdf.setFontSize(n) }
      const normal = (n = 10) => { pdf.setFont('times', 'normal'); pdf.setFontSize(n) }
      const italic = (n = 10) => { pdf.setFont('times', 'italic'); pdf.setFontSize(n) }

      // Renders wrapped text at current y; advances y by the block height
      const textBlock = (text: string, x: number, maxW: number, lh = LH) => {
        const lines = pdf.splitTextToSize(text, maxW)
        need(lines.length * lh)
        pdf.text(lines, x, y)
        y += lines.length * lh
      }

      // Section header: bold uppercase label + full-width rule beneath
      const sectionHeader = (title: string) => {
        need(12)
        bold(11)
        pdf.text(title.toUpperCase(), mL, y)
        y += 1.5
        pdf.setLineWidth(0.3)
        pdf.line(mL, y, W - mR, y)
        y += 4
      }

      // ── Name ──────────────────────────────────────────────────────
      bold(18)
      pdf.text(cv.personalInfo.nombre || '', W / 2, y, { align: 'center' })
      y += 8

      if (cv.personalInfo.cargo) {
        italic(10)
        pdf.text(cv.personalInfo.cargo, W / 2, y, { align: 'center' })
        y += 5
      }

      const contact = [
        cv.personalInfo.email, cv.personalInfo.telefono,
        cv.personalInfo.linkedin, cv.personalInfo.ubicacion, cv.personalInfo.website,
      ].filter(Boolean)
      if (contact.length) {
        normal(9)
        pdf.text(contact.join(' \u00b7 '), W / 2, y, { align: 'center' })
        y += 5
      }

      pdf.setLineWidth(0.3)
      pdf.line(mL, y, W - mR, y)
      y += 5

      // ── Resumen ───────────────────────────────────────────────────
      if (cv.resumen) {
        sectionHeader('Resumen')
        normal(10)
        textBlock(cv.resumen, mL, cW)
        y += 2
      }

      // ── Experiencia ───────────────────────────────────────────────
      if (cv.experiencia.length > 0) {
        sectionHeader('Experiencia')
        for (const exp of cv.experiencia) {
          const period = exp.actual
            ? `${exp.fechaInicio} \u2013 Presente`
            : `${exp.fechaInicio} \u2013 ${exp.fechaFin}`
          need(LH + 2)

          // Cargo + empresa (left) · period (right) on the same baseline
          bold(10)
          const label = exp.cargo + (exp.empresa ? ` \u2014 ${exp.empresa}` : '')
          pdf.text(label, mL, y)
          italic(9)
          pdf.text(period, W - mR, y, { align: 'right' })
          y += LH

          if (exp.ubicacion) {
            italic(9)
            pdf.text(exp.ubicacion, mL, y)
            y += LH9
          }

          normal(10)
          for (const b of exp.bullets.filter(Boolean)) {
            const lines = pdf.splitTextToSize(b, cW - 4)
            need(lines.length * LH)
            pdf.text('\u2022', mL, y)
            pdf.text(lines, mL + 4, y)
            y += lines.length * LH
          }
          y += 2
        }
      }

      // ── Educación ─────────────────────────────────────────────────
      if (cv.educacion.length > 0) {
        sectionHeader('Educaci\u00f3n')
        for (const edu of cv.educacion) {
          const period = `${edu.fechaInicio} \u2013 ${edu.fechaFin}`
          const degree = [edu.titulo, edu.campo].filter(Boolean).join(', ')
          need(LH + 2)

          bold(10)
          pdf.text(degree || 'T\u00edtulo', mL, y)
          italic(9)
          pdf.text(period, W - mR, y, { align: 'right' })
          y += LH

          if (edu.institucion) {
            italic(9)
            pdf.text(edu.institucion, mL, y)
            y += LH9
          }

          normal(10)
          for (const l of edu.logros.filter(Boolean)) {
            const lines = pdf.splitTextToSize(l, cW - 4)
            need(lines.length * LH)
            pdf.text('\u2022', mL, y)
            pdf.text(lines, mL + 4, y)
            y += lines.length * LH
          }
          y += 2
        }
      }

      // ── Habilidades ───────────────────────────────────────────────
      if (cv.habilidades.length > 0) {
        sectionHeader('Habilidades')
        normal(10)
        textBlock(cv.habilidades.join(' \u00b7 '), mL, cW)
        y += 2
      }

      // ── Idiomas ───────────────────────────────────────────────────
      if (cv.idiomas.length > 0) {
        sectionHeader('Idiomas')
        for (const lang of cv.idiomas) {
          need(LH)
          bold(10)
          const prefix = `${lang.idioma}: `
          pdf.text(prefix, mL, y)
          normal(10)
          pdf.text(lang.nivel, mL + pdf.getTextWidth(prefix), y)
          y += LH
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

      {/* Two-column layout — each column scrolls independently */}
      <div className="max-w-7xl mx-auto px-4 flex gap-6" style={{ height: 'calc(100vh - 64px)' }}>

        {/* ─── LEFT: Form ─── */}
        <div className="flex-1 min-w-0 max-w-xl overflow-y-auto py-8 pr-2 space-y-4">

          {/* ─ Empty state nudge ─ */}
          {!detectedCvText && !cvLoaded && !savedAt && (
            <div className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <div className="flex-1 min-w-0">
                <p className="font-sans font-[800] text-sm" style={{ color: '#1a2744' }}>
                  ¿Tienes un CV existente?
                </p>
                <p className="font-sans text-xs text-gray-400 mt-0.5">
                  Analízalo primero y lo importamos aquí automáticamente con todos los campos rellenos.
                </p>
              </div>
              <a
                href="/"
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans font-[900] text-xs uppercase tracking-wider text-white transition-all duration-200 hover:opacity-90"
                style={{ backgroundColor: '#0DA1A4' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Analizar CV
              </a>
            </div>
          )}

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
                  onClick={() => { setDetectedCvText(null); sessionStorage.removeItem('atsCvText') }}
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

          {/* ─ Changes applied banner ─ */}
          {changesApplied !== null && (
            <div className="rounded-2xl p-4 flex items-center justify-between gap-3"
              style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#16a34a' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <p className="font-sans text-sm font-[600]" style={{ color: '#166534' }}>
                  {changesApplied > 0
                    ? `${changesApplied} ${changesApplied === 1 ? 'mejora aplicada' : 'mejoras aplicadas'} — revisa los cambios antes de exportar`
                    : 'CV optimizado — revisa el resultado antes de exportar'}
                </p>
              </div>
              <button onClick={() => setChangesApplied(null)} style={{ color: '#16a34a' }} aria-label="Cerrar">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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

          {/* Word count + autosave indicator */}
          <div className="flex items-center justify-between text-xs font-sans text-gray-400">
            <span>
              <span className="font-[700]" style={{ color: '#1a2744' }}>{wordCount(cv).toLocaleString('es-ES')}</span> palabras
              {' · '}
              <span className="font-[700]" style={{ color: '#1a2744' }}>~{Math.max(1, Math.ceil(wordCount(cv) / 350))}</span>{' '}
              {Math.max(1, Math.ceil(wordCount(cv) / 350)) === 1 ? 'página' : 'páginas'}
            </span>
            {savedAt && (
              <span className="flex items-center gap-1" style={{ color: '#10b981' }}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Guardado
              </span>
            )}
          </div>

          {/* Export buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleDocxExport}
              disabled={exportingDocx}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans font-[900] text-xs uppercase tracking-wider text-white transition-all duration-300 disabled:opacity-60 hover:opacity-80"
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
          <Section title={LABELS[lang].personalInfo}>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label={LABELS[lang].nombre} value={cv.personalInfo.nombre} onChange={v => setP('nombre', v)} placeholder="Juan García López" />
              </div>
              <div className="col-span-2">
                <Field label={LABELS[lang].cargo} value={cv.personalInfo.cargo} onChange={v => setP('cargo', v)} placeholder="Senior Software Engineer" />
              </div>
              <Field label={LABELS[lang].email} value={cv.personalInfo.email} onChange={v => setP('email', v)} placeholder="juan@email.com" />
              <Field label={LABELS[lang].telefono} value={cv.personalInfo.telefono} onChange={v => setP('telefono', v)} placeholder="+34 600 000 000" />
              <Field label={LABELS[lang].linkedin} value={cv.personalInfo.linkedin} onChange={v => setP('linkedin', v)} placeholder="linkedin.com/in/juan" />
              <Field label={LABELS[lang].ubicacion} value={cv.personalInfo.ubicacion} onChange={v => setP('ubicacion', v)} placeholder="Madrid, España" />
              <div className="col-span-2">
                <Field label={LABELS[lang].website} value={cv.personalInfo.website} onChange={v => setP('website', v)} placeholder="juangarcia.dev" />
              </div>
            </div>
          </Section>

          {/* Summary */}
          <Section title={LABELS[lang].resumenSection}>
            <Field label={LABELS[lang].resumenField} value={cv.resumen}
              onChange={v => setCv(prev => ({ ...prev, resumen: v }))}
              placeholder="Escribe un resumen conciso de tu perfil profesional..."
              multiline rows={4} />
          </Section>

          {/* Experience */}
          <Section title={LABELS[lang].experiencia}>
            {cv.experiencia.map((exp, idx) => (
              <div key={exp.id} className="space-y-3 pt-3 border-t border-gray-100 first:border-0 first:pt-0">
                <div className="flex items-center justify-between">
                  <p className="font-sans font-[700] text-xs text-gray-500">{LABELS[lang].posicion} {idx + 1}</p>
                  <RemoveButton onClick={() => removeExp(exp.id)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={LABELS[lang].cargoField} value={exp.cargo} onChange={v => updateExp(exp.id, { cargo: v })} placeholder="Software Engineer" />
                  <Field label={LABELS[lang].empresa} value={exp.empresa} onChange={v => updateExp(exp.id, { empresa: v })} placeholder="Acme Corp" />
                  <Field label={LABELS[lang].fechaInicio} value={exp.fechaInicio} onChange={v => updateExp(exp.id, { fechaInicio: v })} placeholder="Ene 2022" />
                  <Field label={LABELS[lang].fechaFin} value={exp.fechaFin} onChange={v => updateExp(exp.id, { fechaFin: v })} placeholder="Dic 2024" />
                  <div className="col-span-2">
                    <Field label={LABELS[lang].ubicacion} value={exp.ubicacion} onChange={v => updateExp(exp.id, { ubicacion: v })} placeholder="Madrid, España" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id={`actual-${exp.id}`} checked={exp.actual}
                    onChange={e => updateExp(exp.id, { actual: e.target.checked })}
                    className="w-4 h-4 accent-teal rounded" />
                  <label htmlFor={`actual-${exp.id}`} className="font-sans text-sm text-gray-500">{LABELS[lang].actual}</label>
                </div>
                <div>
                  <label className="block font-sans font-[600] text-xs uppercase tracking-wider text-gray-400 mb-1.5">{LABELS[lang].logros}</label>
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
                        }} className="mt-2 text-gray-300 hover:text-red-400 transition-colors duration-200">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => updateExp(exp.id, { bullets: [...exp.bullets, ''] })}
                    className="mt-2 font-sans text-xs text-gray-400 hover:text-teal transition-colors duration-200">
                    {LABELS[lang].addBullet}
                  </button>
                </div>
              </div>
            ))}
            <AddButton label={LABELS[lang].addExp} onClick={addExp} />
          </Section>

          {/* Education */}
          <Section title={LABELS[lang].educacion}>
            {cv.educacion.map((edu, idx) => (
              <div key={edu.id} className="space-y-3 pt-3 border-t border-gray-100 first:border-0 first:pt-0">
                <div className="flex items-center justify-between">
                  <p className="font-sans font-[700] text-xs text-gray-500">{LABELS[lang].formacion} {idx + 1}</p>
                  <RemoveButton onClick={() => removeEdu(edu.id)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Field label={LABELS[lang].institucion} value={edu.institucion} onChange={v => updateEdu(edu.id, { institucion: v })} placeholder="Universidad Complutense" />
                  </div>
                  <Field label={LABELS[lang].titulo} value={edu.titulo} onChange={v => updateEdu(edu.id, { titulo: v })} placeholder="Grado en Ingeniería" />
                  <Field label={LABELS[lang].campo} value={edu.campo} onChange={v => updateEdu(edu.id, { campo: v })} placeholder="Informática" />
                  <Field label={LABELS[lang].fechaInicio} value={edu.fechaInicio} onChange={v => updateEdu(edu.id, { fechaInicio: v })} placeholder="2016" />
                  <Field label={LABELS[lang].fechaFin} value={edu.fechaFin} onChange={v => updateEdu(edu.id, { fechaFin: v })} placeholder="2020" />
                </div>
                <div>
                  <label className="block font-sans font-[600] text-xs uppercase tracking-wider text-gray-400 mb-1.5">{LABELS[lang].logrosEdu}</label>
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
                        }} className="mt-2 text-gray-300 hover:text-red-400 transition-colors duration-200">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => updateEdu(edu.id, { logros: [...edu.logros, ''] })}
                    className="mt-2 font-sans text-xs text-gray-400 hover:text-teal transition-colors duration-200">
                    {LABELS[lang].addLogro}
                  </button>
                </div>
              </div>
            ))}
            <AddButton label={LABELS[lang].addEdu} onClick={addEdu} />
          </Section>

          {/* Skills */}
          <Section title={LABELS[lang].habilidades}>
            <div className="flex flex-wrap gap-2 min-h-[40px]">
              {cv.habilidades.map((skill, i) => (
                <span key={i}
                  className="flex items-center gap-1.5 font-sans text-sm px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: '#e6f7f7', color: '#0DA1A4' }}>
                  {skill}
                  <button onClick={() => setCv(prev => ({ ...prev, habilidades: prev.habilidades.filter((_, idx) => idx !== i) }))}
                    className="text-teal/50 hover:text-teal transition-colors duration-200">
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
                placeholder={LABELS[lang].skillPlaceholder}
                className="flex-1 font-sans text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30 transition-all"
                style={{ borderColor: '#e5e7eb', color: '#1a2744' }}
              />
              <button onClick={addSkill}
                className="px-4 py-2 rounded-lg font-sans font-[700] text-xs uppercase tracking-wider text-white transition-all hover:opacity-80 duration-200"
                style={{ backgroundColor: '#0DA1A4' }}>
                {LABELS[lang].addSkill}
              </button>
            </div>
          </Section>

          {/* Languages */}
          <Section title={LABELS[lang].idiomas}>
            {cv.idiomas.map((l, idx) => (
              <div key={l.id} className="flex gap-3 items-end">
                <div className="flex-1">
                  <Field label={idx === 0 ? LABELS[lang].idioma : ''} value={l.idioma}
                    onChange={v => updateIdioma(l.id, { idioma: v })} placeholder="Español" />
                </div>
                <div className="flex-1">
                  <Field label={idx === 0 ? LABELS[lang].nivel : ''} value={l.nivel}
                    onChange={v => updateIdioma(l.id, { nivel: v })} placeholder="Nativo / B2 / Avanzado" />
                </div>
                <div className="mb-0.5">
                  <RemoveButton onClick={() => removeIdioma(l.id)} />
                </div>
              </div>
            ))}
            <AddButton label={LABELS[lang].addIdioma} onClick={addIdioma} />
          </Section>

        </div>

        {/* ─── RIGHT: Preview ─── */}
        <div className="hidden lg:block overflow-y-auto py-8" style={{ width: '210mm', flexShrink: 0 }}>
          <p className="font-sans font-[700] text-xs uppercase tracking-widest text-gray-400 mb-3">
            {LABELS[lang].preview}
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
