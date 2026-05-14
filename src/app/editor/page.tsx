'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { CVData, ExperienciaEntry, EducacionEntry, IdiomaEntry, ProyectoEntry, SkillCategories } from '@/types/cv'
import type { ATSAnalysisResult, Suggestion } from '@/types/analysis'
import Header from '@/components/Header'
import { DEMO_CV } from '@/types/cv'
import { exportToMarkdown } from '@/lib/export-markdown'
import { getLang, type Lang } from '@/components/LanguageSelector'
import { type CvLang } from '@/lib/cv-labels'
import { calcAtsScore } from '@/lib/ats-score-simple'

const LABELS = {
  es: {
    personalInfo: 'Información personal', nombre: 'Nombre completo', cargo: 'Título profesional',
    email: 'Email', telefono: 'Teléfono', linkedin: 'LinkedIn', ubicacion: 'Ubicación',
    website: 'Web / Portfolio',
    experiencia: 'Experiencia', educacion: 'Educación', habilidades: 'Habilidades', idiomas: 'Idiomas',
    proyectos: 'Proyectos',
    posicion: 'Posición', formacion: 'Formación', cargoField: 'Cargo', empresa: 'Empresa',
    fechaInicio: 'Fecha inicio', fechaFin: 'Fecha fin', actual: 'Trabajo actual',
    logros: 'Logros y responsabilidades', logrosEdu: 'Logros destacados (opcional)',
    institucion: 'Institución', titulo: 'Título', campo: 'Campo de estudio',
    idioma: 'Idioma', nivel: 'Nivel', addExp: 'Añadir experiencia', addEdu: 'Añadir educación',
    addIdioma: 'Añadir idioma', addProyecto: 'Añadir proyecto',
    addSkill: 'Añadir', addBullet: '+ Añadir punto',
    addLogro: '+ Añadir logro', skillPlaceholder: 'Escribe y pulsa Enter',
    preview: 'Vista previa',
    foto: 'Foto de perfil', fotoHint: 'PNG o JPG · máx. 2 MB · formato cuadrado recomendado',
    fotoRemove: 'Eliminar foto',
    proyectoNombre: 'Nombre del proyecto', proyectoDesc: 'Descripción', proyectoUrl: 'URL / GitHub',
    proyecto: 'Proyecto',
    heroTitle: 'Editor de CV',
    heroSubtitle: 'Crea tu CV en el formato más aceptado por los ATS. Exporta a PDF o Markdown.',
    heroAttr: 'Plantilla basada en el CV de',
    palabras: 'palabras', pagina: 'página', paginas: 'páginas',
    descargarPdf: 'Descargar PDF', generandoPdf: 'Generando PDF...',
    guardado: 'Guardado',
    tienesCv: '¿Tienes un CV existente?',
    tienesCvHint: 'Analízalo primero y lo importamos aquí automáticamente con todos los campos rellenos.',
    analizarCv: 'Analizar CV',
    cvDetectadoPre: 'Hemos detectado el CV de',
    cvDetectadoFallback: 'Hemos detectado un CV del análisis anterior',
    cvDetectadoHint: 'Cárgalo automáticamente en el editor con todos los campos rellenados.',
    cargando: 'Cargando...', cargarEditor: 'Cargar en el editor',
    cargandoHint: 'Esto puede tardar un poco, el CV se está formateando...',
    traducindoHint: 'Esto puede tardar un poco, el contenido se está traduciendo...',
    recsAtsSuffix: 'recomendaciones del análisis ATS',
    recsHint: 'La IA optimizará tu perfil profesional, los logros de cada puesto y añadirá las habilidades técnicas que faltan.',
    aplicando: 'Aplicando mejoras...', aplicarRecs: 'Aplicar recomendaciones al CV',
    cvOptimizado: 'CV optimizado — revisa el resultado antes de exportar',
    revisar: 'revisa los cambios antes de exportar',
    mejora: 'mejora aplicada', mejoras: 'mejoras aplicadas',
    vistaPrevia: 'Vista previa', ocultarVista: 'Ocultar',
    traducirContenido: 'Traducir contenido con IA',
    traduciendo: 'Traduciendo...', retraducir: 'Retraducir',
    cvLangLabel: 'Idioma CV',
  },
  en: {
    personalInfo: 'Personal information', nombre: 'Full name', cargo: 'Professional title',
    email: 'Email', telefono: 'Phone', linkedin: 'LinkedIn', ubicacion: 'Location',
    website: 'Website / Portfolio',
    experiencia: 'Experience', educacion: 'Education', habilidades: 'Skills', idiomas: 'Languages',
    proyectos: 'Projects',
    posicion: 'Position', formacion: 'Education entry', cargoField: 'Job title', empresa: 'Company',
    fechaInicio: 'Start date', fechaFin: 'End date', actual: 'Current job',
    logros: 'Achievements and responsibilities', logrosEdu: 'Notable achievements (optional)',
    institucion: 'Institution', titulo: 'Degree', campo: 'Field of study',
    idioma: 'Language', nivel: 'Level', addExp: 'Add experience', addEdu: 'Add education',
    addIdioma: 'Add language', addProyecto: 'Add project',
    addSkill: 'Add', addBullet: '+ Add bullet',
    addLogro: '+ Add achievement', skillPlaceholder: 'Type and press Enter',
    preview: 'Preview',
    foto: 'Profile photo', fotoHint: 'PNG or JPG · max. 2 MB · square format recommended',
    fotoRemove: 'Remove photo',
    proyectoNombre: 'Project name', proyectoDesc: 'Description', proyectoUrl: 'URL / GitHub',
    proyecto: 'Project',
    heroTitle: 'CV Editor',
    heroSubtitle: 'Create your CV in the most ATS-accepted format. Export to PDF or Markdown.',
    heroAttr: 'Template based on the CV by',
    palabras: 'words', pagina: 'page', paginas: 'pages',
    descargarPdf: 'Download PDF', generandoPdf: 'Generating PDF...',
    guardado: 'Saved',
    tienesCv: 'Do you have an existing CV?',
    tienesCvHint: 'Analyse it first and we will automatically import it here with all fields filled in.',
    analizarCv: 'Analyse CV',
    cvDetectadoPre: 'We detected the CV of',
    cvDetectadoFallback: 'We detected a CV from a previous analysis',
    cvDetectadoHint: 'Load it automatically in the editor with all fields filled in.',
    cargando: 'Loading...', cargarEditor: 'Load in editor',
    cargandoHint: 'This may take a moment, the CV is being formatted...',
    traducindoHint: 'This may take a moment, the content is being translated...',
    recsAtsSuffix: 'ATS analysis recommendations',
    recsHint: 'AI will optimise your professional profile, each role\'s achievements and add any missing technical skills.',
    aplicando: 'Applying improvements...', aplicarRecs: 'Apply recommendations to CV',
    cvOptimizado: 'CV optimised — review the result before exporting',
    revisar: 'review changes before exporting',
    mejora: 'improvement applied', mejoras: 'improvements applied',
    vistaPrevia: 'Preview', ocultarVista: 'Hide',
    traducirContenido: 'Translate content with AI',
    traduciendo: 'Translating...', retraducir: 'Retranslate',
    cvLangLabel: 'CV language',
  },
}

const SKILL_KEYS: (keyof SkillCategories)[] = ['languages', 'frameworks', 'databases', 'tools', 'practices']
const SKILL_LABELS: Record<keyof SkillCategories, string> = {
  languages: 'Languages', frameworks: 'Frameworks', databases: 'Databases',
  tools: 'Technologies / Tools', practices: 'Practices',
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
const TRANSLATED_KEY = 'cv-editor-translated'

function wordCount(cv: CVData): number {
  const skillWords = [
    ...cv.habilidades.languages,
    ...cv.habilidades.frameworks,
    ...cv.habilidades.databases,
    ...cv.habilidades.tools,
    ...cv.habilidades.practices,
  ]
  return [
    ...cv.experiencia.map(e => `${e.cargo} ${e.empresa} ${e.bullets.join(' ')}`),
    ...cv.proyectos.map(p => `${p.nombre} ${p.descripcion}`),
    ...cv.educacion.map(e => `${e.titulo} ${e.institucion} ${e.logros.join(' ')}`),
    ...skillWords,
    ...cv.idiomas.map(l => l.idioma),
  ].join(' ').split(/\s+/).filter(Boolean).length
}

export default function EditorPage() {
  const [cv, setCv] = useState<CVData>(DEMO_CV)
  const [showPreview, setShowPreview] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [lang, setLang] = useState<'es' | 'en'>('es')
  const [cvLang, setCvLang] = useState<CvLang>('en')
  const [translatedCv, setTranslatedCv] = useState<Partial<Record<CvLang, CVData>>>({})
  const [translating, setTranslating] = useState(false)

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

    const draft = localStorage.getItem(DRAFT_KEY)
    if (draft) {
      try {
        const parsed = JSON.parse(draft) as CVData
        // Migrate legacy flat habilidades array → SkillCategories (put all in tools as catch-all)
        if (Array.isArray(parsed.habilidades)) {
          const flat = parsed.habilidades as unknown as string[]
          parsed.habilidades = { languages: [], frameworks: [], databases: [], tools: flat, practices: [] }
        }
        if (!parsed.proyectos) parsed.proyectos = []
        setCv(parsed)
        setSavedAt(new Date())
      } catch { /* ignore */ }
    }

    const translated = localStorage.getItem(TRANSLATED_KEY)
    if (translated) {
      try { setTranslatedCv(JSON.parse(translated) as Partial<Record<CvLang, CVData>>) } catch { /* ignore */ }
    }

    const cvText = sessionStorage.getItem('atsCvText') || localStorage.getItem('atsCvText')
    const resultRaw = sessionStorage.getItem('atsResult')
    if (cvText && cvText.length > 100) {
      setDetectedCvText(cvText)
      if (resultRaw) {
        try { setDetectedResult(JSON.parse(resultRaw) as ATSAnalysisResult) } catch { /* ignore */ }
      }
    }
  }, [])

  // Sync lang when user changes it from the header selector
  useEffect(() => {
    const handler = (e: Event) => setLang((e as CustomEvent<Lang>).detail)
    window.addEventListener('langchange', handler)
    return () => window.removeEventListener('langchange', handler)
  }, [])

  // Autosave draft on every change (debounced 800ms)
  useEffect(() => {
    const t = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(cv))
      setSavedAt(new Date())
    }, 800)
    return () => clearTimeout(t)
  }, [cv])

  // Persist translated versions
  useEffect(() => {
    localStorage.setItem(TRANSLATED_KEY, JSON.stringify(translatedCv))
  }, [translatedCv])

  const allSuggestions: Suggestion[] = detectedResult
    ? (() => {
        const all = detectedResult.categories.flatMap(c => c.suggestions ?? [])
        const alta  = all.filter(s => s.prioridad === 'alta')
        const media = all.filter(s => s.prioridad === 'media')
        const combined = [...alta, ...media]
        return combined.length >= 4 ? combined.slice(0, 8) : all.slice(0, 8)
      })()
    : []

  const handleLoadCv = async () => {
    if (!detectedCvText) return
    setLoadingCv(true)
    setLoadError('')
    try {
      const ctrl = new AbortController()
      const tid = setTimeout(() => ctrl.abort(), 90_000)
      const res = await fetch('/api/editor/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'parse', cvText: detectedCvText }),
        signal: ctrl.signal,
      })
      clearTimeout(tid)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cargar el CV.')
      setCv(data as CVData)
      setCvLoaded(true)
      setDetectedCvText(null)
      sessionStorage.removeItem('atsCvText')
    } catch (err) {
      const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'))
      setLoadError(isAbort
        ? 'La operación tardó demasiado. Inténtalo de nuevo.'
        : err instanceof Error ? err.message : 'Error inesperado.')
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
      const ctrl = new AbortController()
      const tid = setTimeout(() => ctrl.abort(), 90_000)
      const res = await fetch('/api/editor/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'improve', cvData: cv, suggestions: allSuggestions }),
        signal: ctrl.signal,
      })
      clearTimeout(tid)
      const data = await res.json() as CVData
      if (!res.ok) throw new Error((data as unknown as { error: string }).error || 'Error al aplicar las recomendaciones.')
      const bulletChanges = prevCv.experiencia.reduce((sum, exp, i) => {
        const newExp = data.experiencia[i]
        if (!newExp) return sum
        return sum + exp.bullets.filter((b, bi) => b !== (newExp.bullets[bi] ?? '')).length
      }, 0)
      setChangesApplied(bulletChanges)
      setCv(data)
      setDetectedResult(null)
    } catch (err) {
      const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'))
      setLoadError(isAbort
        ? 'La operación tardó demasiado. Inténtalo de nuevo.'
        : err instanceof Error ? err.message : 'Error inesperado.')
    } finally {
      setLoadingRecs(false)
    }
  }

  const handleTranslate = async () => {
    const targetLang = cvLang
    setTranslating(true)
    setLoadError('')
    try {
      const ctrl = new AbortController()
      const tid = setTimeout(() => ctrl.abort(), 90_000)
      const res = await fetch('/api/editor/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'translate', cvData: cv, targetLang }),
        signal: ctrl.signal,
      })
      clearTimeout(tid)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al traducir el CV.')
      setTranslatedCv(prev => ({ ...prev, [targetLang]: data as CVData }))
    } catch (err) {
      const isAbort = err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'))
      setLoadError(isAbort
        ? 'La operación tardó demasiado. Inténtalo de nuevo.'
        : err instanceof Error ? err.message : 'Error inesperado.')
    } finally {
      setTranslating(false)
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

  // ─ Projects ─
  const addProyecto = () => setCv(prev => ({
    ...prev,
    proyectos: [...prev.proyectos, { id: genId(), nombre: '', descripcion: '', url: '' }],
  }))
  const updateProyecto = (id: string, patch: Partial<ProyectoEntry>) => setCv(prev => ({
    ...prev,
    proyectos: prev.proyectos.map(p => p.id === id ? { ...p, ...patch } : p),
  }))
  const removeProyecto = (id: string) => setCv(prev => ({ ...prev, proyectos: prev.proyectos.filter(p => p.id !== id) }))

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
  const [skillInputs, setSkillInputs] = useState<Record<keyof SkillCategories, string>>({
    languages: '', frameworks: '', databases: '', tools: '', practices: '',
  })
  const addSkill = (cat: keyof SkillCategories) => {
    const trimmed = skillInputs[cat].trim()
    if (!trimmed) return
    setCv(prev => ({ ...prev, habilidades: { ...prev.habilidades, [cat]: [...prev.habilidades[cat], trimmed] } }))
    setSkillInputs(prev => ({ ...prev, [cat]: '' }))
  }
  const removeSkill = (cat: keyof SkillCategories, idx: number) => {
    setCv(prev => ({ ...prev, habilidades: { ...prev.habilidades, [cat]: prev.habilidades[cat].filter((_, i) => i !== idx) } }))
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

  // ─ PDF Export ─
  const handlePdfExport = async () => {
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      document.body.classList.add('editor-print')
      const cleanup = () => document.body.classList.remove('editor-print')
      window.addEventListener('afterprint', cleanup, { once: true })
      setTimeout(cleanup, 30000)
      window.print()
      return
    }

    setExportingPdf(true)
    setLoadError('')
    const cvToExport = translatedCv[cvLang] ?? cv
    const nombre = cvToExport.personalInfo.nombre || 'cv'
    try {
      const res = await fetch('/api/editor/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvData: cvToExport,
          lang: cvLang,
          filename: nombre.replace(/\s+/g, '_').toLowerCase(),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error || 'Error al generar el PDF.')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${nombre.replace(/\s+/g, '_').toLowerCase()}_cv.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al generar el PDF.'
      setLoadError(msg)
    } finally {
      setExportingPdf(false)
    }
  }

  const liveAtsScore = useMemo(() => calcAtsScore(cv), [cv])

  const prevScoreRef = useRef(liveAtsScore.score)
  const [scoreDelta, setScoreDelta] = useState(0)
  const [justChanged, setJustChanged] = useState(false)

  useEffect(() => {
    if (liveAtsScore.score !== prevScoreRef.current) {
      setScoreDelta(liveAtsScore.score - prevScoreRef.current)
      setJustChanged(true)
      prevScoreRef.current = liveAtsScore.score
      const t = setTimeout(() => { setJustChanged(false); setScoreDelta(0) }, 2200)
      return () => clearTimeout(t)
    }
  }, [liveAtsScore.score])

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: '#f0ede8' }}>

      <Header />

      {/* Hero */}
      <section className="bg-navy text-white py-3 px-6 flex-shrink-0">
        <div className="max-w-container mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="flex items-center gap-3">
            <h1 className="font-heading font-[900] text-xl leading-tight">
              {LABELS[lang].heroTitle}
            </h1>
            {/* Live ATS score chip */}
            <div
              key={liveAtsScore.score}
              title="Estimación ATS en tiempo real (client-side)"
              className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-colors duration-300${justChanged ? ' score-flash' : ''}`}
              style={{
                backgroundColor: liveAtsScore.level === 'high' ? 'rgba(1,255,198,0.12)' : liveAtsScore.level === 'mid' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.12)',
                border: `1.5px solid ${liveAtsScore.level === 'high' ? 'rgba(1,255,198,0.35)' : liveAtsScore.level === 'mid' ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.35)'}`,
                minWidth: 52,
              }}
            >
              <div className="flex items-baseline gap-1">
                <span className="font-display font-[900] leading-none" style={{ fontSize: 22, color: liveAtsScore.level === 'high' ? '#01FFC6' : liveAtsScore.level === 'mid' ? '#fbbf24' : '#f87171' }}>
                  {liveAtsScore.score}
                </span>
                {justChanged && scoreDelta !== 0 && (
                  <span className="font-sans font-[800] text-[10px] leading-none" style={{ color: scoreDelta > 0 ? '#01FFC6' : '#f87171' }}>
                    {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta}
                  </span>
                )}
              </div>
              <span className="font-sans font-[700] text-[9px] uppercase tracking-widest leading-none mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                ATS
              </span>
            </div>
          </div>
          <p className="font-sans text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {LABELS[lang].heroAttr}{' '}
            <a href="https://newsletter.danielblanco.dev/p/17-como-llevar-tu-cv-al-siguiente"
               target="_blank" rel="noopener noreferrer"
               className="underline hover:text-white/60 transition-colors">
              Daniel Blanco
            </a>
            {' · '}
            <a href="https://github.com/danielblanco96/resume-public"
               target="_blank" rel="noopener noreferrer"
               className="underline hover:text-white/60 transition-colors">
              GitHub
            </a>
          </p>
        </div>
      </section>

      {/* Two-column layout */}
      <div className="flex-1 overflow-hidden w-full max-w-[1400px] mx-auto px-6 flex flex-col lg:flex-row gap-4 lg:gap-8">

        {/* ─── LEFT: Form ─── */}
        <div className="flex-1 min-w-0 overflow-y-auto py-8 pr-2 space-y-4">

          {/* ─ Empty state nudge ─ */}
          {!detectedCvText && !cvLoaded && !savedAt && (
            <div className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <div className="flex-1 min-w-0">
                <p className="font-sans font-[800] text-sm" style={{ color: '#1a2744' }}>
                  {LABELS[lang].tienesCv}
                </p>
                <p className="font-sans text-xs text-gray-400 mt-0.5">
                  {LABELS[lang].tienesCvHint}
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
                {LABELS[lang].analizarCv}
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
                      ? `${LABELS[lang].cvDetectadoPre} ${detectedResult.nombre}`
                      : LABELS[lang].cvDetectadoFallback}
                  </p>
                  <p className="font-sans text-xs mt-0.5" style={{ color: '#0a7a7c' }}>
                    {loadingCv ? LABELS[lang].cargandoHint : LABELS[lang].cvDetectadoHint}
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
                      {LABELS[lang].cargando}
                    </>
                  ) : LABELS[lang].cargarEditor}
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
                      {allSuggestions.length} {LABELS[lang].recsAtsSuffix}
                    </p>
                    <p className="font-sans text-xs mt-0.5" style={{ color: '#b45309' }}>
                      {LABELS[lang].recsHint}
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
                    {LABELS[lang].aplicando}
                  </>
                ) : LABELS[lang].aplicarRecs}
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
                    ? `${changesApplied} ${changesApplied === 1 ? LABELS[lang].mejora : LABELS[lang].mejoras} — ${LABELS[lang].revisar}`
                    : LABELS[lang].cvOptimizado}
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
              <span className="font-[700]" style={{ color: '#1a2744' }}>{wordCount(cv).toLocaleString('es-ES')}</span> {LABELS[lang].palabras}
              {' · '}
              <span className="font-[700]" style={{ color: '#1a2744' }}>~{Math.max(1, Math.ceil(wordCount(cv) / 350))}</span>{' '}
              {Math.max(1, Math.ceil(wordCount(cv) / 350)) === 1 ? LABELS[lang].pagina : LABELS[lang].paginas}
            </span>
            {savedAt && (
              <span className="flex items-center gap-1" style={{ color: '#10b981' }}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {LABELS[lang].guardado}
              </span>
            )}
          </div>

          {/* Language + Export card */}
          <div className="rounded-2xl p-4 space-y-3 bg-white" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

            {/* CV language row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-sans text-xs font-[600] uppercase tracking-wider text-gray-400">
                {LABELS[lang].cvLangLabel}
              </span>
              {(['en', 'es'] as CvLang[]).map(l => (
                <button
                  key={l}
                  onClick={() => setCvLang(l)}
                  className="px-3 py-1.5 rounded-lg font-sans font-[700] text-xs uppercase tracking-wider transition-all duration-200"
                  style={cvLang === l
                    ? { backgroundColor: '#092c64', color: '#fff' }
                    : { backgroundColor: '#f9fafb', color: '#9ca3af', border: '1px solid #e5e7eb' }}
                >
                  {l === 'en' ? 'English' : 'Español'}
                </button>
              ))}
              {translatedCv[cvLang] && (
                <button
                  onClick={() => {
                    setTranslatedCv(prev => { const n = { ...prev }; delete n[cvLang]; return n })
                  }}
                  title={LABELS[lang].retraducir}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-sans font-[600] text-xs transition-all duration-200"
                  style={{ color: '#10b981', border: '1px solid #d1fae5', backgroundColor: '#f0fdf4' }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {LABELS[lang].retraducir}
                </button>
              )}
            </div>

            {/* Translate content button */}
            {!translatedCv[cvLang] && (
              <div className="space-y-1">
                <button
                  onClick={handleTranslate}
                  disabled={translating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-sans font-[700] text-xs uppercase tracking-wider transition-all duration-200 disabled:opacity-60"
                  style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}
                >
                  {translating ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      {LABELS[lang].traduciendo}
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                      {LABELS[lang].traducirContenido}
                    </>
                  )}
                </button>
                {translating && (
                  <p className="font-sans text-xs text-center" style={{ color: '#6b7280' }}>
                    {LABELS[lang].traducindoHint}
                  </p>
                )}
              </div>
            )}

            {/* Divider */}
            <div style={{ borderTop: '1px solid #f3f4f6' }} />

            {/* Export buttons */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => handlePdfExport()}
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
                    {LABELS[lang].generandoPdf}
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {LABELS[lang].descargarPdf}
                  </>
                )}
              </button>
              <button
                onClick={() => exportToMarkdown(translatedCv[cvLang] ?? cv, cvLang)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans font-[900] text-xs uppercase tracking-wider border-2 transition-all duration-300"
                style={{ borderColor: '#e5e7eb', color: '#9ca3af' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Markdown
              </button>
            </div>
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

              {/* Photo upload */}
              <div className="col-span-2">
                <label className="block font-sans font-[600] text-xs uppercase tracking-wider text-gray-400 mb-2">
                  {LABELS[lang].foto}
                </label>
                {cv.personalInfo.foto ? (
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cv.personalInfo.foto}
                      alt="Foto de perfil"
                      className="w-16 h-16 rounded-full object-cover border-2"
                      style={{ borderColor: '#e5e7eb' }}
                    />
                    <button
                      onClick={() => setP('foto', '')}
                      className="font-sans text-xs text-gray-400 hover:text-red-400 transition-colors underline underline-offset-2"
                    >
                      {LABELS[lang].fotoRemove}
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed cursor-pointer transition-colors duration-200 hover:border-teal hover:bg-teal/5"
                    style={{ borderColor: '#d1d5db' }}>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > 2 * 1024 * 1024) return
                        const reader = new FileReader()
                        reader.onload = ev => setP('foto', ev.target?.result as string)
                        reader.readAsDataURL(file)
                      }}
                    />
                    <svg className="w-5 h-5 text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="font-sans text-xs text-gray-400">{LABELS[lang].fotoHint}</p>
                  </label>
                )}
              </div>
            </div>
          </Section>

          {/* Skills */}
          <Section title={LABELS[lang].habilidades}>
            <div className="space-y-4">
              {SKILL_KEYS.map(cat => (
                <div key={cat}>
                  <p className="font-sans font-[700] text-xs uppercase tracking-wider mb-1.5" style={{ color: '#374151' }}>
                    {SKILL_LABELS[cat]}
                  </p>
                  <div className="flex flex-wrap gap-1.5 min-h-[32px] mb-2">
                    {cv.habilidades[cat].map((skill, i) => (
                      <span key={i}
                        className="flex items-center gap-1 font-sans text-sm px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: '#e6f7f7', color: '#0DA1A4' }}>
                        {skill}
                        <button onClick={() => removeSkill(cat, i)}
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
                      type="text"
                      value={skillInputs[cat]}
                      onChange={e => setSkillInputs(prev => ({ ...prev, [cat]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(cat) } }}
                      placeholder={LABELS[lang].skillPlaceholder}
                      className="flex-1 font-sans text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30 transition-all"
                      style={{ borderColor: '#e5e7eb', color: '#1a2744' }}
                    />
                    <button onClick={() => addSkill(cat)}
                      className="px-3 py-2 rounded-lg font-sans font-[700] text-xs uppercase tracking-wider text-white transition-all hover:opacity-80 duration-200"
                      style={{ backgroundColor: '#0DA1A4' }}>
                      {LABELS[lang].addSkill}
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
                  <Field label={LABELS[lang].empresa} value={exp.empresa} onChange={v => updateExp(exp.id, { empresa: v })} placeholder="Acme Corp" />
                  <Field label={LABELS[lang].cargoField} value={exp.cargo} onChange={v => updateExp(exp.id, { cargo: v })} placeholder="Software Engineer" />
                  <Field label={LABELS[lang].fechaInicio} value={exp.fechaInicio} onChange={v => updateExp(exp.id, { fechaInicio: v })} placeholder="Jan 2022" />
                  <Field label={LABELS[lang].fechaFin} value={exp.fechaFin} onChange={v => updateExp(exp.id, { fechaFin: v })} placeholder="Dec 2024" />
                  <div className="col-span-2">
                    <Field label={LABELS[lang].ubicacion} value={exp.ubicacion} onChange={v => updateExp(exp.id, { ubicacion: v })} placeholder="Madrid, Spain" />
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

          {/* Projects */}
          <Section title={LABELS[lang].proyectos}>
            {cv.proyectos.map((proj, idx) => (
              <div key={proj.id} className="space-y-3 pt-3 border-t border-gray-100 first:border-0 first:pt-0">
                <div className="flex items-center justify-between">
                  <p className="font-sans font-[700] text-xs text-gray-500">{LABELS[lang].proyecto} {idx + 1}</p>
                  <RemoveButton onClick={() => removeProyecto(proj.id)} />
                </div>
                <Field label={LABELS[lang].proyectoNombre} value={proj.nombre} onChange={v => updateProyecto(proj.id, { nombre: v })} placeholder="Open Toponym" />
                <Field label={LABELS[lang].proyectoDesc} value={proj.descripcion} onChange={v => updateProyecto(proj.id, { descripcion: v })}
                  placeholder="Brief description of what you built and the impact..." multiline rows={3} />
                <Field label={LABELS[lang].proyectoUrl} value={proj.url} onChange={v => updateProyecto(proj.id, { url: v })} placeholder="github.com/user/project" />
              </div>
            ))}
            <AddButton label={LABELS[lang].addProyecto} onClick={addProyecto} />
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
                  <Field label={LABELS[lang].titulo} value={edu.titulo} onChange={v => updateEdu(edu.id, { titulo: v })} placeholder="B.Sc. Computer Science" />
                  <Field label={LABELS[lang].campo} value={edu.campo} onChange={v => updateEdu(edu.id, { campo: v })} placeholder="Software Engineering" />
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
                          placeholder="GPA, awards, thesis..."
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

          {/* Languages */}
          <Section title={LABELS[lang].idiomas}>
            {cv.idiomas.map((l, idx) => (
              <div key={l.id} className="flex gap-3 items-end">
                <div className="flex-1">
                  <Field label={idx === 0 ? LABELS[lang].idioma : ''} value={l.idioma}
                    onChange={v => updateIdioma(l.id, { idioma: v })} placeholder="English" />
                </div>
                <div className="flex-1">
                  <Field label={idx === 0 ? LABELS[lang].nivel : ''} value={l.nivel}
                    onChange={v => updateIdioma(l.id, { nivel: v })} placeholder="Native / B2 / Advanced" />
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
            <HarvardTemplate data={translatedCv[cvLang] ?? cv} lang={cvLang} />
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
          {showPreview ? LABELS[lang].ocultarVista : LABELS[lang].vistaPrevia}
        </button>
      </div>

      {/* Mobile preview modal */}
      {showPreview && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/50 overflow-auto p-4"
          onClick={() => setShowPreview(false)}>
          <div onClick={e => e.stopPropagation()} className="max-w-full overflow-x-auto">
            <HarvardTemplate data={translatedCv[cvLang] ?? cv} lang={cvLang} />
          </div>
        </div>
      )}

      {/* Off-screen template — always rendered, used as html2canvas capture source */}
      <div aria-hidden="true" style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, pointerEvents: 'none', width: '210mm' }}>
        <HarvardTemplate id="harvard-pdf-source" data={translatedCv[cvLang] ?? cv} lang={cvLang} />
      </div>


    </div>
  )
}
