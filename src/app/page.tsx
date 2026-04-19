'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DropZone from '@/components/upload/DropZone'
import FilePreview from '@/components/upload/FilePreview'
import Button from '@/components/ui/Button'
import type { ATSAnalysisResult } from '@/types/analysis'
import { getLang } from '@/components/LanguageSelector'
import { getHistory, clearHistory, type HistoryEntry } from '@/lib/history'
import Header from '@/components/Header'

type UploadState = 'idle' | 'uploading' | 'error'

const LOADING_MESSAGES = [
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
]

const ERROR_MESSAGES = [
  'Gemini se ha tomado un café. Inténtalo de nuevo.',
  'La IA está en modo siesta. Vuelve a intentarlo.',
  'Algo ha fallado, pero no es culpa de tu CV. Inténtalo de nuevo.',
  'El robot reclutador ha petado. Un momento.',
  'Error inesperado. El equipo ya está en ello (o debería).',
  'Houston, tenemos un problema. Inténtalo de nuevo.',
]

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (mins  <  1) return 'ahora mismo'
  if (mins  < 60) return `hace ${mins} min`
  if (hours < 24) return `hace ${hours}h`
  if (days  ===1) return 'ayer'
  if (days  <  7) return `hace ${days} días`
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

const FEATURES = [
  {
    title: 'Análisis instantáneo',
    desc: 'PDF o DOCX — la IA extrae todos los datos estructurados en segundos, sin formularios.',
  },
  {
    title: 'Optimización ATS',
    desc: 'Detecta si tu CV supera los filtros automáticos que usan el 98% de las empresas.',
  },
  {
    title: 'Puntos de mejora',
    desc: 'Recomendaciones concretas para aumentar tus posibilidades de entrevista.',
  },
]

const STEPS = [
  {
    title: 'Sube tu CV',
    desc: 'Arrastra o selecciona tu PDF o DOCX. Sin registro.',
    icon: (
      <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    title: 'Lo analizamos con IA',
    desc: 'Usamos Gemini para procesar el CV: extraemos datos, evaluamos keywords y detectamos puntos débiles.',
    icon: (
      <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Revisa el informe',
    desc: 'Puntuación ATS, skills detectadas y recomendaciones accionables.',
    icon: (
      <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

const ANALYSIS_AREAS = [
  { title: 'Palabras clave ATS',       desc: 'Detecta si tu CV incluye los términos exactos que buscan los sistemas automáticos.' },
  { title: 'Formato y estructura',     desc: 'Evalúa si el diseño es legible por máquinas: columnas, tablas, headers problemáticos.' },
  { title: 'Experiencia y logros',     desc: 'Analiza la coherencia del historial, logros cuantificados y brechas temporales.' },
  { title: 'Stack tecnológico',        desc: 'Extrae y categoriza automáticamente todas las tecnologías y herramientas.' },
  { title: 'Nivel de seniority',       desc: 'Estima tu nivel a partir de años de experiencia, responsabilidades y vocabulario.' },
  { title: 'Idiomas y certificaciones',desc: 'Identifica idiomas con nivel, certificaciones y formación académica relevante.' },
]

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
      category: 'Keywords y habilidades',
      score: 65,
      status: 'needs-work',
      summary: 'La sección de habilidades tiene las herramientas principales pero le faltan keywords ATS habituales en diseño de producto senior.',
      suggestions: [
        {
          titulo: 'Ampliar keywords en la sección de habilidades',
          prioridad: 'alta',
          pasos: [
            { texto: "Añade 'Design Thinking', 'Wireframing' y 'Usability Testing' como habilidades explícitas — son las tres keywords más buscadas en ATS para roles de diseño senior y no aparecen en tu CV actual.", terminos: ['Design Thinking', 'Wireframing', 'Usability Testing'] },
            { texto: "Incluye 'Design Systems' como habilidad independiente en la sección de skills y no solo mencionada en los bullets de experiencia, para que el parser ATS la detecte correctamente.", terminos: ['Design Systems'] },
          ],
        },
      ],
    },
    {
      category: 'Formato y legibilidad ATS',
      score: 88,
      status: 'good',
      summary: 'El formato es limpio, con una sola columna y sin tablas ni elementos gráficos que dificulten el parsing.',
      suggestions: [
        {
          titulo: 'Ajuste menor en el título de sección',
          prioridad: 'baja',
          pasos: [
            { texto: "La sección 'Sobre mí' puede renombrarse a 'Resumen Profesional' para mejorar la compatibilidad con ATS anglosajones que buscan el término 'Summary' o 'Professional Summary'.", terminos: ["Sobre mí", 'Resumen Profesional'] },
          ],
        },
      ],
    },
    {
      category: 'Experiencia laboral',
      score: 68,
      status: 'needs-work',
      summary: 'El historial cronológico es claro, pero los bullets de impacto en los roles más recientes son genéricos y no incluyen métricas.',
      suggestions: [
        {
          titulo: 'Cuantificar logros en Empresa X',
          prioridad: 'alta',
          pasos: [
            { texto: "En tu rol de Senior Product Designer en Empresa X, el bullet 'mejoré la experiencia del usuario' no aporta valor ATS ni humano — sustitúyelo por el dato real, por ejemplo '↑ 34% en tasa de conversión en el flujo de onboarding tras rediseño en Q3 2023'.", terminos: ['mejoré la experiencia del usuario', 'tasa de conversión'] },
            { texto: "Para el proyecto del Design System en Empresa X, añade el alcance: número de componentes creados, equipos que lo usan o tiempo de diseño ahorrado — ese tipo de dato diferencia a candidatos senior en los ATS y en la criba humana.", terminos: ['Design System', 'número de componentes'] },
          ],
        },
      ],
    },
    {
      category: 'Educación y certificaciones',
      score: 78,
      status: 'good',
      summary: 'La formación está bien estructurada, aunque el nivel de inglés podría estar más explícito.',
      suggestions: [
        {
          titulo: 'Precisar nivel de idioma',
          prioridad: 'media',
          pasos: [
            { texto: "El inglés aparece sin nivel declarado — añade el nivel (B2, C1) y si tienes certificación (TOEIC, IELTS, Cambridge) inclúyela con año, ya que muchos ATS filtran candidatos por nivel mínimo de idioma.", terminos: ['nivel de inglés', 'certificación'] },
          ],
        },
      ],
    },
    {
      category: 'Información de contacto',
      score: 90,
      status: 'good',
      summary: 'Email, LinkedIn y ubicación presentes y bien formateados.',
      suggestions: [
        {
          titulo: 'Añadir portfolio',
          prioridad: 'baja',
          pasos: [
            { texto: "Para roles de diseño, un link al portfolio (Behance, portfolio web propio) en la cabecera aumenta significativamente la ratio de respuesta — si ya tienes portfolio activo, inclúyelo junto al LinkedIn.", terminos: ['portfolio', 'Behance'] },
          ],
        },
      ],
    },
    {
      category: 'Longitud y optimización',
      score: 82,
      status: 'good',
      summary: '2 páginas bien aprovechadas, sin contenido redundante.',
      suggestions: [
        {
          titulo: 'Condensar experiencia anterior a 2015',
          prioridad: 'baja',
          pasos: [
            { texto: "Los roles anteriores a 2015 ocupan casi el mismo espacio que los más recientes — considera condensarlos a una línea por empresa (nombre, cargo y fechas) para dejar más espacio visible a tu experiencia actual.", terminos: ['roles anteriores a 2015'] },
          ],
        },
      ],
    },
  ],
}

const MOCK_BARS = [
  { label: 'Palabras clave ATS',   pct: 85, color: '#10b981' },
  { label: 'Formato y legibilidad',pct: 90, color: '#10b981' },
  { label: 'Experiencia y logros', pct: 72, color: '#f59e0b' },
  { label: 'Stack tecnológico',    pct: 65, color: '#f59e0b' },
]

const MOCK_SKILLS = ['Figma', 'UX Research', 'Prototyping', 'Design Systems', 'User Testing', 'Sketch', 'Notion', 'Jira']

const MOCK_IMPROVEMENTS = [
  { type: 'warn', text: 'Añade métricas cuantificadas en tus logros — los ATS priorizan resultados medibles.' },
  { type: 'warn', text: 'Incluye más keywords de producto: "OKRs", "roadmap", "discovery", "go-to-market".' },
  { type: 'warn', text: 'La sección de habilidades no tiene suficiente densidad de keywords para tu seniority.' },
  { type: 'ok',   text: 'Buen uso de verbos de acción al inicio de cada bullet point.' },
  { type: 'ok',   text: 'Formato limpio y sin elementos que confundan a los parsers ATS.' },
]

export default function UploadPage() {
  const router = useRouter()
  const [state, setState] = useState<UploadState>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [compareFromId, setCompareFromId] = useState<string | null>(null)

  // Load history from localStorage (client-side only)
  useEffect(() => {
    setHistory(getHistory())
  }, [])

  useEffect(() => {
    if (state !== 'uploading') return
    let index = 0
    const interval = setInterval(() => {
      index = (index + 1) % LOADING_MESSAGES.length
      setLoadingMsg(LOADING_MESSAGES[index])
    }, 2200)
    return () => clearInterval(interval)
  }, [state])

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
    setLoadingMsg(LOADING_MESSAGES[0])
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
        try { localStorage.setItem('atsCvText', data._cvText) } catch { /* storage full */ }
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _cvText, ...result } = data
      sessionStorage.setItem('atsResult', JSON.stringify(result as ATSAnalysisResult))
      router.push('/results')
    } catch (error) {
      setState('error')
      const generic = ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)]
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
    if (!compareFromId) {
      setCompareFromId(entry.id)
      return
    }
    if (compareFromId === entry.id) {
      setCompareFromId(null)
      return
    }
    const fromEntry = history.find(e => e.id === compareFromId)
    if (!fromEntry) { setCompareFromId(null); return }
    sessionStorage.setItem('atsResult', JSON.stringify(fromEntry.result))
    sessionStorage.setItem('compareAfterResult', JSON.stringify(entry.result))
    router.push('/results/compare')
  }

  const isUploading = state === 'uploading'

  return (
    <div className="min-h-screen bg-bg-light">

      <Header />

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="bg-navy text-white py-16 px-6">
        <div className="max-w-container mx-auto text-center">
          <p className="font-sans font-[900] uppercase tracking-widest text-neon text-xs mb-5">
            Herramienta Gratuita de Manfred
          </p>
          <h1 className="font-heading font-[900] text-4xl md:text-5xl leading-tight mb-4">
            Analiza tu CV en segundos,
            <br />
            <span className="italic text-neon">descubre tus puntos débiles</span>
          </h1>
          <p className="font-sans text-base text-white/70 max-w-xl mx-auto">
            Sube un CV, detecta con IA si está optimizado para los ATS y revisa los puntos de mejora.
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
                <p className="font-sans text-gray-400 text-xs">La IA está haciendo su magia</p>
              </div>
            </div>
          )}

          {!isUploading && (
            <div className="mt-6 space-y-3">
              <Button variant="primary" size="lg" disabled={!file} onClick={handleAnalyze} className="w-full">
                Analizar mi CV
              </Button>
              <div className="flex items-center justify-center">
                <button
                  onClick={handleDemo}
                  className="font-sans text-sm text-gray-400 hover:text-teal transition-colors duration-200"
                >
                  ¿No tienes un CV a mano? <span className="font-[700] underline underline-offset-2">Ver ejemplo de análisis →</span>
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-400 font-sans">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-teal" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Tu CV no se almacena
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-teal" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Análisis en segundos
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-teal" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Exporta a PDF
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
                  Tus análisis recientes
                </h2>
                <p className="font-sans text-xs text-gray-400 mt-0.5">
                  Guardados solo en este dispositivo · se borran al limpiar el navegador
                </p>
              </div>
              <button
                onClick={handleClearHistory}
                className="font-sans text-xs text-gray-400 hover:text-red-500 transition-colors duration-200 underline underline-offset-2"
              >
                Borrar historial
              </button>
            </div>

            {compareFromId && (
              <div className="mb-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-sans" style={{ backgroundColor: '#e6f7f7', color: '#0a7c7f' }}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-[700]">1 análisis seleccionado.</span> Selecciona otro para comparar, o haz clic de nuevo para cancelar.
              </div>
            )}
            <div className="space-y-2">
              {history.map(entry => {
                const scoreColor = entry.score >= 75 ? '#0DA1A4' : entry.score >= 50 ? '#f59e0b' : '#ef4444'
                const scoreBg    = entry.score >= 75 ? '#e6f7f7' : entry.score >= 50 ? '#fffbeb' : '#fff1f2'
                const date = timeAgo(entry.analyzedAt)
                const isSelected = compareFromId === entry.id
                return (
                  <div
                    key={entry.id}
                    className="bg-white rounded-xl px-5 py-4 flex items-center gap-4 transition-shadow duration-200"
                    style={{
                      boxShadow: isSelected ? '0 0 0 2px #0DA1A4' : '0 1px 6px rgba(0,0,0,0.06)',
                    }}
                  >
                    {/* Score badge */}
                    <div
                      className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-sans font-[900] text-sm"
                      style={{ backgroundColor: scoreBg, color: scoreColor }}
                    >
                      {entry.score}
                    </div>

                    {/* Info — clickable to view */}
                    <button
                      onClick={() => handleViewHistory(entry)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="font-sans font-[700] text-sm text-purple-dark">
                        {entry.nombre || 'CV sin nombre'}
                      </p>
                      <p className="font-sans text-xs text-gray-400 truncate">{entry.headline}</p>
                    </button>

                    {/* Date */}
                    <p className="font-sans text-xs text-gray-400 flex-shrink-0">{date}</p>

                    {/* Compare button */}
                    <button
                      onClick={() => handleCompareSelect(entry)}
                      title={compareFromId && !isSelected ? 'Comparar con este análisis' : isSelected ? 'Cancelar selección' : 'Seleccionar para comparar'}
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

      {/* ── Features 01/02/03 ──────────────────────────────────────────────── */}
      <section className="bg-bg-light px-6 pb-16">
        <div className="max-w-4xl mx-auto border-t border-gray-300/60">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-300/60">
            {FEATURES.map((f, i) => (
              <div key={i} className="py-8 md:px-8 first:pl-0 last:pr-0">
                <p className="font-sans text-xs text-gray-400 mb-2">0{i + 1}</p>
                <h3 className="font-heading font-[700] text-navy text-lg mb-2">{f.title}</h3>
                <p className="font-sans text-sm leading-relaxed" style={{ color: '#6b7280' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tres pasos (navy) ──────────────────────────────────────────────── */}
      <section className="bg-navy py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <p className="font-sans font-[600] text-xs uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Proceso
            </p>
            <h2 className="font-heading font-[900] text-white leading-tight" style={{ fontSize: '2.8rem' }}>
              Tres pasos,
              <br />
              <span className="italic text-neon">un informe completo</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            {STEPS.map((step, i) => (
              <div key={i} className="py-8 md:px-8 first:pl-0 last:pr-0">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  {step.icon}
                </div>
                <h3 className="font-heading font-[700] text-white text-lg mb-2">{step.title}</h3>
                <p className="font-sans text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Qué analiza la IA ──────────────────────────────────────────────── */}
      <section className="bg-bg-light py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <p className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400 mb-3">Análisis</p>
              <h2 className="font-heading font-[900] leading-tight text-navy" style={{ fontSize: '2.8rem' }}>
                Qué analiza
                <br />
                <span className="italic text-teal">la IA</span>
              </h2>
            </div>
            <p className="font-sans text-sm text-gray-500 md:text-right leading-relaxed md:max-w-xs">
              Todos los factores que determinan si tu CV llega a una persona o se queda en el filtro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border-t border-gray-300/60">
            {ANALYSIS_AREAS.map((area, i) => (
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

      {/* ── Así es tu informe (mockup) ─────────────────────────────────────── */}
      <section className="bg-bg-light pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <p className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400 mb-3">Ejemplo real</p>
              <h2 className="font-heading font-[900] leading-tight text-navy" style={{ fontSize: '2.8rem' }}>
                Así es
                <br />
                <span className="italic text-teal">tu informe</span>
              </h2>
            </div>
            <p className="font-sans text-sm text-gray-500 md:text-right leading-relaxed md:max-w-xs">
              Un vistazo a lo que recibirás. Datos reales, recomendaciones concretas.
            </p>
          </div>

          {/* Mock report card */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            {/* Card header */}
            <div className="flex items-center justify-between px-6 py-4 bg-navy">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-sans font-[900] text-white text-sm"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                >
                  M
                </div>
                <div>
                  <p className="font-sans font-[700] text-white text-sm">María González</p>
                  <p className="font-sans text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Senior Product Designer · 7 años</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-sans text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Puntuación ATS</p>
                  <p className="font-sans font-[900] text-white text-2xl leading-none">78%</p>
                </div>
                <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#0DA1A4" strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 14}`}
                    strokeDashoffset={`${2 * Math.PI * 14 * (1 - 0.78)}`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {/* Card body */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              {/* Left: breakdown + skills */}
              <div className="p-6">
                <p className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400 mb-4">Desglose</p>
                <div className="space-y-3 mb-6">
                  {MOCK_BARS.map((bar, i) => (
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
                <p className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400 mb-3">Skills detectadas</p>
                <div className="flex flex-wrap gap-1.5">
                  {MOCK_SKILLS.map(skill => (
                    <span
                      key={skill}
                      className="font-sans text-xs px-2.5 py-1 rounded-full border"
                      style={{ borderColor: '#e5e7eb', color: '#374151' }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right: improvement points */}
              <div className="p-6">
                <p className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400 mb-4">Puntos de mejora</p>
                <div className="space-y-2">
                  {MOCK_IMPROVEMENTS.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-3 rounded-lg text-sm font-sans leading-snug"
                      style={{
                        backgroundColor: item.type === 'warn' ? '#fffbeb' : '#f0fdf4',
                        color: item.type === 'warn' ? '#92400e' : '#166534',
                      }}
                    >
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
            <div
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 gap-2"
              style={{ borderTop: '1px solid #f3f4f6' }}
            >
              <p className="font-sans text-xs text-gray-400">
                Este es un ejemplo. Tu informe se genera a partir de tu CV real.
              </p>
              <a
                href="#upload"
                className="font-sans font-[700] text-xs whitespace-nowrap hover:opacity-70 transition-opacity text-teal"
              >
                Sube tu CV arriba para empezar ↑
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
