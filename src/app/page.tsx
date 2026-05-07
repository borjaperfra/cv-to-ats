'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DropZone from '@/components/upload/DropZone'
import FilePreview from '@/components/upload/FilePreview'
import Button from '@/components/ui/Button'
import type { ATSAnalysisResult } from '@/types/analysis'
import { getLang, type Lang } from '@/components/LanguageSelector'
import { getHistory, clearHistory, type HistoryEntry } from '@/lib/history'
import Header from '@/components/Header'

type UploadState = 'idle' | 'uploading' | 'error'

// ─── Bilingual content ───────────────────────────────────────────────────────

const LOADING_MESSAGES = {
  es: [
    'Revisando el alfabeto...',
    'Extrayendo entidades nombradas del texto...',
    'Leyendo tu experiencia...',
    'Asimilando esa pedazo de trayectoria...',
    'Consultando con los dioses de RRHH...',
    'Tokenizando el contenido del CV...',
    'Buscando palabras clave con lupa...',
    'Calculando densidad de keywords ATS...',
    'Descifrando tu letra de médico...',
    'Evaluando coherencia temporal del historial...',
    'Calculando cuántos ATS has sobrevivido...',
    'Desempolvando el diccionario de buzzwords...',
    'Analizando estructura semántica del documento...',
    'Preparando el veredicto del robot reclutador...',
    'Analizando si usas Comic Sans (esperemos que no)...',
    'Clasificando secciones por relevancia ATS...',
    'Buscando el botón de "contratar ya"...',
    'Comparando perfil con patrones de mercado...',
    'Traduciendo tus logros al idioma corporativo...',
    'Generando recomendaciones accionables...',
  ],
  en: [
    'Reviewing the alphabet...',
    'Extracting named entities from the text...',
    'Reading your experience...',
    'Processing that impressive career path...',
    'Consulting the HR gods...',
    'Tokenising CV content...',
    'Searching for keywords with a magnifying glass...',
    'Calculating ATS keyword density...',
    'Deciphering your handwriting...',
    'Evaluating temporal consistency of your history...',
    'Counting how many ATS systems you have survived...',
    'Dusting off the buzzword dictionary...',
    'Analysing the semantic structure of the document...',
    'Preparing the recruiter robot\'s verdict...',
    'Checking if you use Comic Sans (let\'s hope not)...',
    'Classifying sections by ATS relevance...',
    'Looking for the "hire now" button...',
    'Comparing profile with market patterns...',
    'Translating your achievements into corporate language...',
    'Generating actionable recommendations...',
  ],
}

const ERROR_MESSAGES = {
  es: [
    'Gemini se ha tomado un café. Inténtalo de nuevo.',
    'La IA está en modo siesta. Vuelve a intentarlo.',
    'Algo ha fallado, pero no es culpa de tu CV. Inténtalo de nuevo.',
    'El robot reclutador ha petado. Un momento.',
    'Error inesperado. El equipo ya está en ello (o debería).',
    'Houston, tenemos un problema. Inténtalo de nuevo.',
  ],
  en: [
    'Gemini took a coffee break. Try again.',
    'The AI is in nap mode. Give it another go.',
    'Something broke, but it is not your CV\'s fault. Try again.',
    'The recruiter robot crashed. One moment.',
    'Unexpected error. The team is on it (hopefully).',
    'Houston, we have a problem. Try again.',
  ],
}

const LABELS = {
  es: {
    tagline: 'Herramienta Gratuita de Manfred',
    h1a: 'Analiza tu CV en segundos,',
    h1b: 'descubre tus puntos débiles',
    subtitle: 'Sube un CV, detecta con IA si está optimizado para los ATS y revisa los puntos de mejora.',
    analyzeBtn: 'Analizar mi CV',
    demoLinkPre: '¿No tienes un CV a mano?',
    demoLinkCta: 'Ver ejemplo de análisis →',
    noStorage: 'Tu CV no se almacena',
    fastAnalysis: 'Análisis en segundos',
    exportPdf: 'Exporta a PDF',
    loadingFooter: 'La IA está haciendo su magia',
    historyTitle: 'Tus análisis recientes',
    historySubtitle: 'Guardados solo en este dispositivo · se borran al limpiar el navegador',
    clearHistory: 'Borrar historial',
    compareHint1: '1 análisis seleccionado.',
    compareHint2: 'Selecciona otro para comparar, o haz clic de nuevo para cancelar.',
    unnamed: 'CV sin nombre',
    processLabel: 'Proceso',
    processH2a: 'Tres pasos,',
    processH2b: 'un informe completo',
    analysisLabel: 'Análisis',
    analysisH2a: 'Qué analiza',
    analysisH2b: 'la IA',
    analysisSubtitle: 'Todos los factores que determinan si tu CV llega a una persona o se queda en el filtro.',
    mockLabel: 'Ejemplo real',
    mockH2a: 'Así es',
    mockH2b: 'tu informe',
    mockSubtitle: 'Un vistazo a lo que recibirás. Datos reales, recomendaciones concretas.',
    mockBreakdown: 'Desglose',
    mockSkills: 'Skills detectadas',
    mockPoints: 'Puntos de mejora',
    mockAtsScore: 'Puntuación ATS',
    mockFooter: 'Este es un ejemplo. Tu informe se genera a partir de tu CV real.',
    mockCta: 'Sube tu CV arriba para empezar ↑',
    features: [
      { title: 'Análisis instantáneo', desc: 'PDF o DOCX — la IA extrae todos los datos estructurados en segundos, sin formularios.' },
      { title: 'Optimización ATS', desc: 'Detecta si tu CV supera los filtros automáticos que usan el 98% de las empresas.' },
      { title: 'Puntos de mejora', desc: 'Recomendaciones concretas para aumentar tus posibilidades de entrevista.' },
    ],
    steps: [
      { title: 'Sube tu CV', desc: 'Arrastra o selecciona tu PDF o DOCX. Sin registro.' },
      { title: 'Lo analizamos con IA', desc: 'Usamos Gemini para procesar el CV: extraemos datos, evaluamos keywords y detectamos puntos débiles.' },
      { title: 'Revisa el informe', desc: 'Puntuación ATS, skills detectadas y recomendaciones accionables.' },
    ],
    analysisAreas: [
      { title: 'Palabras clave ATS', desc: 'Detecta si tu CV incluye los términos exactos que buscan los sistemas automáticos.' },
      { title: 'Formato y estructura', desc: 'Evalúa si el diseño es legible por máquinas: columnas, tablas, headers problemáticos.' },
      { title: 'Experiencia y logros', desc: 'Analiza la coherencia del historial, logros cuantificados y brechas temporales.' },
      { title: 'Stack tecnológico', desc: 'Extrae y categoriza automáticamente todas las tecnologías y herramientas.' },
      { title: 'Nivel de seniority', desc: 'Estima tu nivel a partir de años de experiencia, responsabilidades y vocabulario.' },
      { title: 'Idiomas y certificaciones', desc: 'Identifica idiomas con nivel, certificaciones y formación académica relevante.' },
    ],
    mockBars: [
      { label: 'Palabras clave ATS',    pct: 85, color: '#10b981' },
      { label: 'Formato y legibilidad', pct: 90, color: '#10b981' },
      { label: 'Experiencia y logros',  pct: 72, color: '#f59e0b' },
      { label: 'Stack tecnológico',     pct: 65, color: '#f59e0b' },
    ],
    mockImprovements: [
      { type: 'warn', text: 'Añade métricas cuantificadas en tus logros — los ATS priorizan resultados medibles.' },
      { type: 'warn', text: 'Incluye más keywords de producto: "OKRs", "roadmap", "discovery", "go-to-market".' },
      { type: 'warn', text: 'La sección de habilidades no tiene suficiente densidad de keywords para tu seniority.' },
      { type: 'ok',   text: 'Buen uso de verbos de acción al inicio de cada bullet point.' },
      { type: 'ok',   text: 'Formato limpio y sin elementos que confundan a los parsers ATS.' },
    ],
  },
  en: {
    tagline: 'Free Manfred Tool',
    h1a: 'Analyse your CV in seconds,',
    h1b: 'discover your weak points',
    subtitle: 'Upload a CV, detect with AI whether it is optimised for ATS, and review your improvement points.',
    analyzeBtn: 'Analyse my CV',
    demoLinkPre: 'No CV handy?',
    demoLinkCta: 'See an analysis example →',
    noStorage: 'Your CV is not stored',
    fastAnalysis: 'Analysis in seconds',
    exportPdf: 'Export to PDF',
    loadingFooter: 'AI is doing its magic',
    historyTitle: 'Your recent analyses',
    historySubtitle: 'Saved on this device only · cleared when you clear the browser',
    clearHistory: 'Clear history',
    compareHint1: '1 analysis selected.',
    compareHint2: 'Select another to compare, or click again to cancel.',
    unnamed: 'Unnamed CV',
    processLabel: 'Process',
    processH2a: 'Three steps,',
    processH2b: 'one complete report',
    analysisLabel: 'Analysis',
    analysisH2a: 'What the AI',
    analysisH2b: 'analyses',
    analysisSubtitle: 'All the factors that determine whether your CV reaches a human or stays in the filter.',
    mockLabel: 'Real example',
    mockH2a: 'This is',
    mockH2b: 'your report',
    mockSubtitle: 'A preview of what you will receive. Real data, concrete recommendations.',
    mockBreakdown: 'Breakdown',
    mockSkills: 'Detected skills',
    mockPoints: 'Improvement points',
    mockAtsScore: 'ATS Score',
    mockFooter: 'This is an example. Your report is generated from your real CV.',
    mockCta: 'Upload your CV above to start ↑',
    features: [
      { title: 'Instant analysis', desc: 'PDF or DOCX — AI extracts all structured data in seconds, no forms required.' },
      { title: 'ATS optimisation', desc: 'Detects whether your CV passes the automatic filters used by 98% of companies.' },
      { title: 'Improvement points', desc: 'Concrete recommendations to increase your chances of getting an interview.' },
    ],
    steps: [
      { title: 'Upload your CV', desc: 'Drag or select your PDF or DOCX. No registration required.' },
      { title: 'We analyse it with AI', desc: 'We use Gemini to process the CV: extract data, evaluate keywords and detect weak points.' },
      { title: 'Review the report', desc: 'ATS score, detected skills and actionable recommendations.' },
    ],
    analysisAreas: [
      { title: 'ATS keywords', desc: 'Detects whether your CV includes the exact terms that automatic systems look for.' },
      { title: 'Format and structure', desc: 'Evaluates whether the design is machine-readable: columns, tables, problematic headers.' },
      { title: 'Experience and achievements', desc: 'Analyses history consistency, quantified achievements and employment gaps.' },
      { title: 'Tech stack', desc: 'Automatically extracts and categorises all technologies and tools.' },
      { title: 'Seniority level', desc: 'Estimates your level based on years of experience, responsibilities and vocabulary.' },
      { title: 'Languages and certifications', desc: 'Identifies languages with level, certifications and relevant academic background.' },
    ],
    mockBars: [
      { label: 'ATS keywords',           pct: 85, color: '#10b981' },
      { label: 'Format and readability',  pct: 90, color: '#10b981' },
      { label: 'Experience and achievements', pct: 72, color: '#f59e0b' },
      { label: 'Tech stack',             pct: 65, color: '#f59e0b' },
    ],
    mockImprovements: [
      { type: 'warn', text: 'Add quantified metrics to your achievements — ATS prioritises measurable results.' },
      { type: 'warn', text: 'Include more product keywords: "OKRs", "roadmap", "discovery", "go-to-market".' },
      { type: 'warn', text: 'The skills section does not have enough keyword density for your seniority level.' },
      { type: 'ok',   text: 'Good use of action verbs at the start of each bullet point.' },
      { type: 'ok',   text: 'Clean format with no elements that confuse ATS parsers.' },
    ],
  },
}

// ─── Step icons (lang-independent) ──────────────────────────────────────────

const STEP_ICONS = [
  <svg key={0} className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>,
  <svg key={1} className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>,
  <svg key={2} className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>,
]

// ─── Demo result (Spanish — sample content, not UI chrome) ───────────────────

const DEMO_RESULT: ATSAnalysisResult = {
  nombre: 'María',
  overallScore: 72,
  analyzedAt: '2026-01-15T10:00:00.000Z',
  saludo: 'Hola María, tu CV alcanza un 72 sobre 100 en compatibilidad ATS. Tienes una estructura cronológica clara y las herramientas principales bien listadas. Sin embargo, la sección de habilidades carece de keywords ATS habituales en diseño de producto, y los bullets de experiencia en Empresa X no incluyen métricas de impacto cuantificadas que diferencian a candidatos senior.',
  saludoTerminos: ['keywords ATS habituales en diseño de producto', 'métricas de impacto cuantificadas'],
  headline: 'CV sólido con margen de mejora en keywords y logros cuantificados',
  skillsDetectadas: ['Figma', 'UX Research', 'Design Systems', 'Prototyping', 'User Testing', 'Sketch', 'Jira', 'Notion', 'Adobe XD'],
  metricas: { palabras: 650, paginasEstimadas: 2, densidadKeywords: 14 },
  alertasCriticas: [],
  topPriorities: [
    "Añadir métricas de impacto a los proyectos de diseño en Empresa X (tasa de conversión, NPS, alcance del Design System)",
    "Ampliar la sección de habilidades con keywords ATS como 'Design Thinking', 'Wireframing' y 'Usability Testing'",
    "Incluir el nivel de inglés con certificación si la tienes — muchos ATS filtran por nivel mínimo de idioma",
  ],
  categories: [
    {
      category: 'Keywords y habilidades', score: 65, status: 'needs-work',
      summary: 'La sección de habilidades tiene las herramientas principales pero le faltan keywords ATS habituales en diseño de producto senior.',
      suggestions: [{
        titulo: 'Ampliar keywords en la sección de habilidades', prioridad: 'alta',
        pasos: [
          { texto: "Añade 'Design Thinking', 'Wireframing' y 'Usability Testing' como habilidades explícitas.", terminos: ['Design Thinking', 'Wireframing', 'Usability Testing'] },
          { texto: "Incluye 'Design Systems' como habilidad independiente en la sección de skills.", terminos: ['Design Systems'] },
        ],
      }],
    },
    {
      category: 'Formato y legibilidad ATS', score: 88, status: 'good',
      summary: 'El formato es limpio, con una sola columna y sin tablas ni elementos gráficos que dificulten el parsing.',
      suggestions: [{
        titulo: 'Ajuste menor en el título de sección', prioridad: 'baja',
        pasos: [{ texto: "La sección 'Sobre mí' puede renombrarse a 'Resumen Profesional'.", terminos: ["Sobre mí", 'Resumen Profesional'] }],
      }],
    },
    {
      category: 'Experiencia laboral', score: 68, status: 'needs-work',
      summary: 'El historial cronológico es claro, pero los bullets de impacto en los roles más recientes son genéricos.',
      suggestions: [{
        titulo: 'Cuantificar logros en Empresa X', prioridad: 'alta',
        pasos: [
          { texto: "En tu rol de Senior Product Designer en Empresa X, el bullet 'mejoré la experiencia del usuario' no aporta valor ATS.", terminos: ['mejoré la experiencia del usuario', 'tasa de conversión'] },
          { texto: "Para el proyecto del Design System en Empresa X, añade el alcance: número de componentes creados.", terminos: ['Design System', 'número de componentes'] },
        ],
      }],
    },
    {
      category: 'Educación y certificaciones', score: 78, status: 'good',
      summary: 'La formación está bien estructurada, aunque el nivel de inglés podría estar más explícito.',
      suggestions: [{
        titulo: 'Precisar nivel de idioma', prioridad: 'media',
        pasos: [{ texto: "El inglés aparece sin nivel declarado — añade el nivel (B2, C1) y si tienes certificación.", terminos: ['nivel de inglés', 'certificación'] }],
      }],
    },
    {
      category: 'Información de contacto', score: 90, status: 'good',
      summary: 'Email, LinkedIn y ubicación presentes y bien formateados.',
      suggestions: [{
        titulo: 'Añadir portfolio', prioridad: 'baja',
        pasos: [{ texto: "Para roles de diseño, un link al portfolio (Behance, portfolio web propio) en la cabecera aumenta la ratio de respuesta.", terminos: ['portfolio', 'Behance'] }],
      }],
    },
    {
      category: 'Longitud y optimización', score: 82, status: 'good',
      summary: '2 páginas bien aprovechadas, sin contenido redundante.',
      suggestions: [{
        titulo: 'Condensar experiencia anterior a 2015', prioridad: 'baja',
        pasos: [{ texto: "Los roles anteriores a 2015 ocupan casi el mismo espacio que los más recientes.", terminos: ['roles anteriores a 2015'] }],
      }],
    },
  ],
}

const MOCK_SKILLS = ['Figma', 'UX Research', 'Prototyping', 'Design Systems', 'User Testing', 'Sketch', 'Notion', 'Jira']

// ─── timeAgo ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string, lang: Lang): string {
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (lang === 'en') {
    if (mins  <  1) return 'just now'
    if (mins  < 60) return `${mins} min ago`
    if (hours < 24) return `${hours}h ago`
    if (days  === 1) return 'yesterday'
    if (days  <  7) return `${days} days ago`
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }
  if (mins  <  1) return 'ahora mismo'
  if (mins  < 60) return `hace ${mins} min`
  if (hours < 24) return `hace ${hours}h`
  if (days  === 1) return 'ayer'
  if (days  <  7) return `hace ${days} días`
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const router = useRouter()
  const [state, setState] = useState<UploadState>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [lang, setLang] = useState<Lang>('es')
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES.es[0])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [compareFromId, setCompareFromId] = useState<string | null>(null)

  useEffect(() => {
    const l = getLang()
    setLang(l)
    setLoadingMsg(LOADING_MESSAGES[l][0])
    setHistory(getHistory())
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const l = (e as CustomEvent<Lang>).detail
      setLang(l)
      setLoadingMsg(LOADING_MESSAGES[l][0])
    }
    window.addEventListener('langchange', handler)
    return () => window.removeEventListener('langchange', handler)
  }, [])

  useEffect(() => {
    if (state !== 'uploading') return
    let index = 0
    const msgs = LOADING_MESSAGES[lang]
    const interval = setInterval(() => {
      index = (index + 1) % msgs.length
      setLoadingMsg(msgs[index])
    }, 2200)
    return () => clearInterval(interval)
  }, [state, lang])

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile)
    setErrorMsg('')
    setState('idle')
  }, [])

  const handleClear = useCallback(() => {
    setFile(null)
    setErrorMsg('')
    setState('idle')
  }, [])

  const handleAnalyze = async () => {
    if (!file) return
    setState('uploading')
    setLoadingMsg(LOADING_MESSAGES[lang][0])
    setErrorMsg('')
    try {
      const formData = new FormData()
      formData.append('cv', file)
      formData.append('lang', getLang())
      const response = await fetch('/api/analyze', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Error al analizar el CV.')
      if (data._cvText) {
        sessionStorage.setItem('atsCvText', data._cvText)
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _cvText, ...result } = data
      sessionStorage.setItem('atsResult', JSON.stringify(result as ATSAnalysisResult))
      router.push('/results')
    } catch (error) {
      setState('error')
      const msgs = ERROR_MESSAGES[lang]
      const generic = msgs[Math.floor(Math.random() * msgs.length)]
      setErrorMsg(error instanceof Error && error.message !== 'Failed to fetch' ? error.message : generic)
    }
  }

  const handleDemo = () => {
    sessionStorage.setItem('atsResult', JSON.stringify(DEMO_RESULT))
    router.push('/results')
  }

  const handleViewHistory = (entry: HistoryEntry) => {
    sessionStorage.setItem('atsResult', JSON.stringify(entry.result))
    router.push('/results')
  }

  const handleClearHistory = () => {
    clearHistory()
    setHistory([])
    setCompareFromId(null)
  }

  const handleCompareSelect = (entry: HistoryEntry) => {
    if (!compareFromId) { setCompareFromId(entry.id); return }
    if (compareFromId === entry.id) { setCompareFromId(null); return }
    const fromEntry = history.find(e => e.id === compareFromId)
    if (!fromEntry) { setCompareFromId(null); return }
    sessionStorage.setItem('atsResult', JSON.stringify(fromEntry.result))
    sessionStorage.setItem('compareAfterResult', JSON.stringify(entry.result))
    router.push('/results/compare')
  }

  const isUploading = state === 'uploading'
  const L = LABELS[lang]

  return (
    <div className="min-h-screen bg-bg-light">

      <Header />

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="bg-navy text-white py-16 px-6">
        <div className="max-w-container mx-auto text-center">
          <p className="font-sans font-[900] uppercase tracking-widest text-neon text-xs mb-5">
            {L.tagline}
          </p>
          <h1 className="font-heading font-[900] text-4xl md:text-5xl leading-tight mb-4">
            {L.h1a}
            <br />
            <span className="italic text-neon">{L.h1b}</span>
          </h1>
          <p className="font-sans text-base text-white/70 max-w-xl mx-auto">
            {L.subtitle}
          </p>
        </div>
      </section>

      {/* ── Upload area ────────────────────────────────────────────────────── */}
      <section id="upload" className="bg-bg-light px-6 py-12">
        <main className="max-w-2xl mx-auto">

          <DropZone onFileSelect={handleFileSelect} disabled={isUploading} />

          {file && !isUploading && (
            <div className="mt-4">
              <FilePreview file={file} onClear={handleClear} />
            </div>
          )}

          {state === 'error' && errorMsg && (
            <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 font-sans text-sm">{errorMsg}</p>
            </div>
          )}

          {isUploading && (
            <div className="mt-6">
              <div className="flex flex-col items-center gap-4 p-8 rounded-xl bg-white border border-gray-light">
                <div className="flex gap-2">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-2.5 h-2.5 rounded-full bg-teal"
                      style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                    />
                  ))}
                </div>
                <p
                  key={loadingMsg}
                  className="font-sans font-[800] text-center text-base text-purple-dark"
                  style={{ animation: 'fadeIn 0.4s ease-in' }}
                >
                  {loadingMsg}
                </p>
                <p className="font-sans text-gray-400 text-xs">{L.loadingFooter}</p>
              </div>
            </div>
          )}

          {!isUploading && (
            <div className="mt-6 space-y-3">
              <Button variant="primary" size="lg" disabled={!file} onClick={handleAnalyze} className="w-full">
                {L.analyzeBtn}
              </Button>
              <div className="flex items-center justify-center">
                <button
                  onClick={handleDemo}
                  className="font-sans text-sm text-gray-400 hover:text-teal transition-colors duration-200"
                >
                  {L.demoLinkPre} <span className="font-[700] underline underline-offset-2">{L.demoLinkCta}</span>
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-400 font-sans">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-teal" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              {L.noStorage}
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-teal" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {L.fastAnalysis}
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-teal" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {L.exportPdf}
            </div>
          </div>
        </main>
      </section>

      {/* ── Recent history ─────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <section className="bg-bg-light px-6 pb-10">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-sans font-[800] text-sm uppercase tracking-widest text-purple-dark">
                  {L.historyTitle}
                </h2>
                <p className="font-sans text-xs text-gray-400 mt-0.5">{L.historySubtitle}</p>
              </div>
              <button
                onClick={handleClearHistory}
                className="font-sans text-xs text-gray-400 hover:text-red-500 transition-colors duration-200 underline underline-offset-2"
              >
                {L.clearHistory}
              </button>
            </div>

            {compareFromId && (
              <div className="mb-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-sans" style={{ backgroundColor: '#e6f7f7', color: '#0a7c7f' }}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-[700]">{L.compareHint1}</span> {L.compareHint2}
              </div>
            )}
            <div className="space-y-2">
              {history.map(entry => {
                const scoreColor = entry.score >= 75 ? '#0DA1A4' : entry.score >= 50 ? '#f59e0b' : '#ef4444'
                const scoreBg    = entry.score >= 75 ? '#e6f7f7' : entry.score >= 50 ? '#fffbeb' : '#fff1f2'
                const date = timeAgo(entry.analyzedAt, lang)
                const isSelected = compareFromId === entry.id
                return (
                  <div
                    key={entry.id}
                    className="bg-white rounded-xl px-5 py-4 flex items-center gap-4 transition-shadow duration-200"
                    style={{ boxShadow: isSelected ? '0 0 0 2px #0DA1A4' : '0 1px 6px rgba(0,0,0,0.06)' }}
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-sans font-[900] text-sm"
                      style={{ backgroundColor: scoreBg, color: scoreColor }}>
                      {entry.score}
                    </div>
                    <button onClick={() => handleViewHistory(entry)} className="flex-1 min-w-0 text-left">
                      <p className="font-sans font-[700] text-sm text-purple-dark">
                        {entry.nombre || L.unnamed}
                      </p>
                      <p className="font-sans text-xs text-gray-400 truncate">{entry.headline}</p>
                    </button>
                    <p className="font-sans text-xs text-gray-400 flex-shrink-0">{date}</p>
                    <button
                      onClick={() => handleCompareSelect(entry)}
                      className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border-2 transition-all duration-150"
                      style={{
                        borderColor: isSelected ? '#0DA1A4' : compareFromId && !isSelected ? '#0DA1A4' : '#e5e7eb',
                        backgroundColor: isSelected ? '#0DA1A4' : compareFromId && !isSelected ? '#e6f7f7' : 'transparent',
                        color: isSelected ? '#ffffff' : compareFromId && !isSelected ? '#0DA1A4' : '#9ca3af',
                      }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section className="bg-bg-light px-6 pb-16">
        <div className="max-w-4xl mx-auto border-t border-gray-300/60">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-300/60">
            {L.features.map((f, i) => (
              <div key={i} className="py-8 md:px-8 first:pl-0 last:pr-0">
                <p className="font-sans text-xs text-gray-400 mb-2">0{i + 1}</p>
                <h3 className="font-heading font-[700] text-navy text-lg mb-2">{f.title}</h3>
                <p className="font-sans text-sm leading-relaxed" style={{ color: '#6b7280' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Three steps (navy) ─────────────────────────────────────────────── */}
      <section className="bg-navy py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <p className="font-sans font-[600] text-xs uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {L.processLabel}
            </p>
            <h2 className="font-heading font-[900] text-white leading-tight" style={{ fontSize: '2.8rem' }}>
              {L.processH2a}
              <br />
              <span className="italic text-neon">{L.processH2b}</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            {L.steps.map((step, i) => (
              <div key={i} className="py-8 md:px-8 first:pl-0 last:pr-0">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
                  {STEP_ICONS[i]}
                </div>
                <h3 className="font-heading font-[700] text-white text-lg mb-2">{step.title}</h3>
                <p className="font-sans text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What the AI analyses ───────────────────────────────────────────── */}
      <section className="bg-bg-light py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <p className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400 mb-3">{L.analysisLabel}</p>
              <h2 className="font-heading font-[900] leading-tight text-navy" style={{ fontSize: '2.8rem' }}>
                {L.analysisH2a}
                <br />
                <span className="italic text-teal">{L.analysisH2b}</span>
              </h2>
            </div>
            <p className="font-sans text-sm text-gray-500 md:text-right leading-relaxed md:max-w-xs">
              {L.analysisSubtitle}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 border-t border-gray-300/60">
            {L.analysisAreas.map((area, i) => (
              <div
                key={i}
                className="py-8 md:px-8"
                style={{
                  borderRight: i % 3 !== 2 ? '1px solid rgba(0,0,0,0.1)' : undefined,
                  borderBottom: i < 3 ? '1px solid rgba(0,0,0,0.1)' : undefined,
                  paddingLeft: i % 3 === 0 ? 0 : undefined,
                  paddingRight: i % 3 === 2 ? 0 : undefined,
                }}
              >
                <p className="font-sans text-xs text-gray-400 mb-2">0{i + 1}</p>
                <h3 className="font-heading font-[700] text-base mb-2 text-teal">{area.title}</h3>
                <p className="font-sans text-sm leading-relaxed" style={{ color: '#6b7280' }}>{area.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Report mockup ──────────────────────────────────────────────────── */}
      <section className="bg-bg-light pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <p className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400 mb-3">{L.mockLabel}</p>
              <h2 className="font-heading font-[900] leading-tight text-navy" style={{ fontSize: '2.8rem' }}>
                {L.mockH2a}
                <br />
                <span className="italic text-teal">{L.mockH2b}</span>
              </h2>
            </div>
            <p className="font-sans text-sm text-gray-500 md:text-right leading-relaxed md:max-w-xs">
              {L.mockSubtitle}
            </p>
          </div>

          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            {/* Card header */}
            <div className="flex items-center justify-between px-6 py-4 bg-navy">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center font-sans font-[900] text-white text-sm"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                  M
                </div>
                <div>
                  <p className="font-sans font-[700] text-white text-sm">María González</p>
                  <p className="font-sans text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Senior Product Designer · 7 años</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-sans text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{L.mockAtsScore}</p>
                  <p className="font-sans font-[900] text-white text-2xl leading-none">78%</p>
                </div>
                <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#0DA1A4" strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 14}`}
                    strokeDashoffset={`${2 * Math.PI * 14 * (1 - 0.78)}`}
                    strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Card body */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              <div className="p-6">
                <p className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400 mb-4">{L.mockBreakdown}</p>
                <div className="space-y-3 mb-6">
                  {L.mockBars.map((bar, i) => (
                    <div key={i}>
                      <div className="flex justify-between mb-1">
                        <span className="font-sans text-xs" style={{ color: '#374151' }}>{bar.label}</span>
                        <span className="font-sans font-[600] text-xs" style={{ color: bar.color }}>{bar.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${bar.pct}%`, backgroundColor: bar.color }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400 mb-3">{L.mockSkills}</p>
                <div className="flex flex-wrap gap-1.5">
                  {MOCK_SKILLS.map(skill => (
                    <span key={skill} className="font-sans text-xs px-2.5 py-1 rounded-full border"
                      style={{ borderColor: '#e5e7eb', color: '#374151' }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-6">
                <p className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400 mb-4">{L.mockPoints}</p>
                <div className="space-y-2">
                  {L.mockImprovements.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg text-sm font-sans leading-snug"
                      style={{
                        backgroundColor: item.type === 'warn' ? '#fffbeb' : '#f0fdf4',
                        color: item.type === 'warn' ? '#92400e' : '#166534',
                      }}>
                      {item.type === 'warn' ? (
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#d97706' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#16a34a' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card footer */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 gap-2"
              style={{ borderTop: '1px solid #f3f4f6' }}>
              <p className="font-sans text-xs text-gray-400">{L.mockFooter}</p>
              <a href="#upload" className="font-sans font-[700] text-xs whitespace-nowrap hover:opacity-70 transition-opacity text-teal">
                {L.mockCta}
              </a>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-8px); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
