'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import type { MatchResult, MatchSuggestion } from '@/types/match'
import { getLang, type Lang } from '@/components/LanguageSelector'
import Header from '@/components/Header'
import { renderWithTerminos } from '@/lib/renderBold'

const LABELS = {
  es: {
    loading: 'Cargando resultados...',
    matchWith: 'Match con oferta',
    downloadPdf: 'Descargar PDF',
    scoreLabels: { good: 'Buen match', partial: 'Match parcial', low: 'Match bajo' },
    keywordsPresent: '✓ Keywords presentes',
    keywordsMissing: '✗ Keywords faltantes',
    requisitosExcluyentes: '⚠ Requisitos imprescindibles que faltan',
    howToImprove: 'Qué necesitas para mejorar el match',
    youDecide: 'Acciones concretas para cerrar la brecha con esta oferta.',
    tipoLabels: { formacion: 'Formación', proyecto: 'Proyecto', experiencia: 'Experiencia' },
    impactoLabels: { alto: 'Impacto alto', medio: 'Impacto medio', bajo: 'Impacto bajo' },
    recursosLabel: 'Recursos',
    applyOffer: 'Aplica a esta oferta →',
    viewOffer: 'Ver oferta →',
    tryNewOffer: 'Probar con otra oferta',
    newOfferPlaceholder: 'Pega el texto de la nueva oferta o una URL (https://...)',
    orUpload: 'o sube un archivo',
    urlDetected: 'URL detectada',
    uploadFile: 'PDF o DOCX',
    remove: 'Quitar',
    analyzing: 'Analizando...',
    compareOffer: 'Comparar con esta oferta',
    analyzeCV: 'Analizar CV',
    errNoJd: 'Introduce la nueva oferta para continuar.',
    errService: 'El servicio no está disponible en este momento. Inténtalo de nuevo en unos segundos.',
    errMatch: 'Error al analizar el match.',
    errUnknown: 'Error inesperado.',
  },
  en: {
    loading: 'Loading results...',
    matchWith: 'Match with offer',
    downloadPdf: 'Download PDF',
    scoreLabels: { good: 'Good match', partial: 'Partial match', low: 'Low match' },
    keywordsPresent: '✓ Keywords present',
    keywordsMissing: '✗ Missing keywords',
    requisitosExcluyentes: '⚠ Knockout requirements missing',
    howToImprove: 'What you need to improve your match',
    youDecide: 'Concrete actions to close the gap with this offer.',
    tipoLabels: { formacion: 'Training', proyecto: 'Project', experiencia: 'Experience' },
    impactoLabels: { alto: 'High impact', medio: 'Medium impact', bajo: 'Low impact' },
    recursosLabel: 'Resources',
    applyOffer: 'Apply to this offer →',
    viewOffer: 'View offer →',
    tryNewOffer: 'Try with another offer',
    newOfferPlaceholder: 'Paste the new job description or a URL (https://...)',
    orUpload: 'or upload a file',
    urlDetected: 'URL detected',
    uploadFile: 'PDF or DOCX',
    remove: 'Remove',
    analyzing: 'Analysing...',
    compareOffer: 'Compare with this offer',
    analyzeCV: 'Analyse CV',
    errNoJd: 'Enter the new job offer to continue.',
    errService: 'The service is not available right now. Please try again in a few seconds.',
    errMatch: 'Error analysing the match.',
    errUnknown: 'Unexpected error.',
  },
}

type ScoreLabels = { good: string; partial: string; low: string }

const TIPO_ICONS = {
  formacion: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  proyecto: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  experiencia: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
}

const TIPO_COLORS = {
  formacion:   { bg: '#eff6ff', border: '#bfdbfe', icon: '#2563eb', text: '#1e40af' },
  proyecto:    { bg: '#f0fdf4', border: '#bbf7d0', icon: '#16a34a', text: '#15803d' },
  experiencia: { bg: '#faf5ff', border: '#e9d5ff', icon: '#7c3aed', text: '#6d28d9' },
}

const IMPACTO_COLORS = {
  alto:  { bg: '#fff1f2', text: '#be123c', border: '#fda4af' },
  medio: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  bajo:  { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
}

function MatchSuggestionCard({ s, tipoLabels, impactoLabels, recursosLabel }: {
  s: MatchSuggestion
  tipoLabels: Record<string, string>
  impactoLabels: Record<string, string>
  recursosLabel: string
}) {
  const tc = TIPO_COLORS[s.tipo] ?? TIPO_COLORS.formacion
  const ic = IMPACTO_COLORS[s.impacto] ?? IMPACTO_COLORS.medio
  return (
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5"
          style={{ backgroundColor: tc.bg, border: `1px solid ${tc.border}`, color: tc.icon }}>
          {TIPO_ICONS[s.tipo] ?? TIPO_ICONS.formacion}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-sans font-[700] text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ backgroundColor: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>
              {tipoLabels[s.tipo] ?? s.tipo}
            </span>
            <span className="font-sans font-[700] text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ backgroundColor: ic.bg, color: ic.text, border: `1px solid ${ic.border}` }}>
              {impactoLabels[s.impacto] ?? s.impacto}
            </span>
          </div>
          <p className="font-sans font-[700] text-sm text-purple-dark mb-1.5">{s.titulo}</p>
          <p className="font-sans text-sm leading-relaxed text-gray-600">
            {renderWithTerminos(s.descripcion, s.terminos)}
          </p>
          {s.recursos && s.recursos.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="font-sans font-[700] text-[10px] uppercase tracking-widest text-gray-400 mb-1.5">
                {recursosLabel}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {s.recursos.map((r, i) => {
                  const nombre = typeof r === 'string' ? r : r.nombre
                  const url = typeof r === 'string' ? undefined : r.url
                  const hasUrl = url && url.trim().length > 0
                  const inner = (
                    <span className="flex items-center gap-1 font-sans text-xs px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: '#f8fafc', color: hasUrl ? '#0DA1A4' : '#475569', border: `1px solid ${hasUrl ? '#b2e8e8' : '#e2e8f0'}` }}>
                      {nombre}
                      {hasUrl && (
                        <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      )}
                    </span>
                  )
                  return hasUrl
                    ? <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">{inner}</a>
                    : <span key={i}>{inner}</span>
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getScoreColor(score: number, labels: ScoreLabels) {
  if (score >= 75) return { arc: '#0DA1A4', bg: '#e6f7f7', text: '#0DA1A4', label: labels.good }
  if (score >= 50) return { arc: '#f59e0b', bg: '#fffbeb', text: '#d97706', label: labels.partial }
  return               { arc: '#ef4444', bg: '#fff1f2', text: '#e11d48', label: labels.low }
}

const R = 52
const CIRC = 2 * Math.PI * R

export default function MatchResultsPage() {
  const router = useRouter()
  const [result, setResult] = useState<MatchResult | null>(null)
  const [animated, setAnimated] = useState(false)
  const [lang, setLang] = useState<Lang>('es')

  const [offerUrl, setOfferUrl] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
  }, [])

  const [newJd, setNewJd] = useState('')
  const [newJdFile, setNewJdFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [newJdError, setNewJdError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const newJdIsUrl = /^https?:\/\/\S+$/.test(newJd.trim())

  useEffect(() => {
    setLang(getLang())
    const raw = sessionStorage.getItem('matchResult')
    if (!raw) { router.replace('/match'); return }
    try {
      setResult(JSON.parse(raw) as MatchResult)
      setTimeout(() => setAnimated(true), 150)
    } catch {
      router.replace('/match')
    }
    const jdUrl = sessionStorage.getItem('matchJdUrl')
    if (jdUrl && jdUrl.includes('getmanfred.com')) setOfferUrl(jdUrl)
  }, [router])

  useEffect(() => {
    const handler = (e: Event) => setLang((e as CustomEvent<Lang>).detail)
    window.addEventListener('langchange', handler)
    return () => window.removeEventListener('langchange', handler)
  }, [])

  useEffect(() => {
    if (!result || result.matchScore <= 80) return
    const base = { particleCount: 90, spread: 65, startVelocity: 45,
      colors: ['#0DA1A4', '#01FFC6', '#092c64', '#ffffff', '#f59e0b'] }
    const t = setTimeout(() => {
      confetti({ ...base, origin: { x: 0.25, y: 0.65 } })
      confetti({ ...base, origin: { x: 0.75, y: 0.65 } })
    }, 1300)
    return () => clearTimeout(t)
  }, [result])

  const L = LABELS[lang]

  const handleNewOffer = async () => {
    const hasJd = newJd.trim().length > 10 || !!newJdFile
    if (!hasJd) { setNewJdError(L.errNoJd); return }
    setAnalyzing(true)
    setNewJdError('')
    try {
      const formData = new FormData()
      const cvText = sessionStorage.getItem('atsCvText') || localStorage.getItem('atsCvText') || ''
      formData.append('cvText', cvText)
      if (newJdIsUrl) {
        formData.append('jdUrl', newJd.trim())
      } else if (newJd.trim()) {
        formData.append('jdText', newJd.trim())
      } else if (newJdFile) {
        formData.append('jdFile', newJdFile)
      }
      formData.append('lang', lang)
      const response = await fetch('/api/match', { method: 'POST', body: formData })
      const ct = response.headers.get('content-type') ?? ''
      if (!ct.includes('application/json')) throw new Error(L.errService)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || L.errMatch)
      sessionStorage.setItem('matchResult', JSON.stringify(data as MatchResult))
      if (newJdIsUrl && newJd.includes('getmanfred.com')) {
        sessionStorage.setItem('matchJdUrl', newJd.trim())
        setOfferUrl(newJd.trim())
      } else {
        sessionStorage.removeItem('matchJdUrl')
        setOfferUrl(null)
      }
      setResult(data as MatchResult)
      setAnimated(false)
      setTimeout(() => setAnimated(true), 150)
      setNewJd('')
      setNewJdFile(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setNewJdError(err instanceof Error ? err.message : L.errUnknown)
    } finally {
      setAnalyzing(false)
    }
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-light">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-7 w-7 text-teal" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="font-sans text-gray-400 text-sm">{L.loading}</p>
        </div>
      </div>
    )
  }

  const colors = getScoreColor(result.matchScore, L.scoreLabels)
  const dashOffset = animated ? CIRC * (1 - result.matchScore / 100) : CIRC
  const sorted = [...result.sugerencias]

  return (
    <div className="min-h-screen bg-bg-light">

      <Header noPrint />

      <div className="bg-bg-light">
        <main className="max-w-3xl mx-auto px-6 py-8 space-y-4">

          {/* Score card */}
          <div className="bg-white rounded-2xl p-6 break-inside-avoid" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <span className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400">
                  {L.matchWith}
                </span>
                {result.puestoBuscado && (
                  <p className="font-sans font-[700] text-sm mt-0.5 text-purple-dark">
                    {result.puestoBuscado}
                    {result.empresa && <span className="font-[400] text-gray-400"> · {result.empresa}</span>}
                  </p>
                )}
              </div>
              <div className="no-print flex items-center gap-2 flex-shrink-0">
                {offerUrl && result.matchScore > 75 && (
                  <a
                    href={offerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] font-sans font-[700] text-xs uppercase tracking-wider transition-all duration-300 hover:opacity-80"
                    style={{ backgroundColor: '#01FFC6', color: '#092c64' }}
                  >
                    {L.applyOffer}
                  </a>
                )}
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] font-sans font-[700] text-xs uppercase tracking-wider bg-navy text-white hover:opacity-80 transition-all duration-300"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {L.downloadPdf}
                  </button>
                  {isMobile && (
                    <p className="font-sans text-[10px] text-gray-400 leading-tight text-right">
                      {lang === 'es' ? <>Selecciona &ldquo;Guardar como PDF&rdquo;</> : <>Select &ldquo;Save as PDF&rdquo;</>}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="relative" style={{ width: 130, height: 130 }}>
                  <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90">
                    <circle cx="65" cy="65" r={R} fill="none" stroke="#eef0f2" strokeWidth="8" />
                    <circle cx="65" cy="65" r={R} fill="none" stroke={colors.arc} strokeWidth="8"
                      strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={dashOffset}
                      style={{ transition: 'stroke-dashoffset 1.2s ease-in-out' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-sans font-[900] leading-none" style={{ fontSize: '2.5rem', color: colors.arc }}>
                      {result.matchScore}
                    </span>
                    <span className="font-sans text-gray-400 text-xs mt-0.5">/ 100</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <span className="inline-block font-sans font-[600] text-sm px-3 py-1 rounded-full mb-3"
                  style={{ backgroundColor: colors.bg, color: colors.text }}>
                  {colors.label}
                </span>
                <p className="font-sans text-sm leading-relaxed text-purple-dark">
                  {renderWithTerminos(result.resumenMatch, result.resumenMatchTerminos)}
                </p>
              </div>
            </div>

            {(result.keywordsPresentes.length > 0 || result.keywordsFaltantes.length > 0) && (
              <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-5">
                {result.keywordsPresentes.length > 0 && (
                  <div>
                    <p className="font-sans font-[600] text-xs uppercase tracking-widest mb-2.5" style={{ color: '#059669' }}>
                      {L.keywordsPresent}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywordsPresentes.map(kw => (
                        <span key={kw} className="font-sans text-xs px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.keywordsFaltantes.length > 0 && (
                  <div>
                    <p className="font-sans font-[600] text-xs uppercase tracking-widest mb-2.5" style={{ color: '#d97706' }}>
                      {L.keywordsMissing}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywordsFaltantes.map(kw => (
                        <span key={kw} className="font-sans text-xs px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Knockout requirements */}
          {result.requisitosExcluyentes && result.requisitosExcluyentes.length > 0 && (
            <div className="rounded-2xl p-5" style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3' }}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5" style={{ backgroundColor: '#fee2e2' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#dc2626' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-sans font-[700] text-xs uppercase tracking-widest mb-2.5" style={{ color: '#dc2626' }}>
                    {L.requisitosExcluyentes}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.requisitosExcluyentes.map(req => (
                      <span key={req} className="font-sans text-xs font-[700] px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>
                        {req}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {sorted.length > 0 && (
            <>
              <div className="pt-3 pb-1">
                <h2 className="font-sans font-[900] text-xl text-purple-dark">{L.howToImprove}</h2>
                <p className="font-sans text-xs text-gray-400 mt-1">{L.youDecide}</p>
              </div>
              {sorted.map((s, i) => (
                <div key={i} className="break-inside-avoid">
                  <MatchSuggestionCard
                    s={s}
                    tipoLabels={L.tipoLabels}
                    impactoLabels={L.impactoLabels}
                    recursosLabel={L.recursosLabel}
                  />
                </div>
              ))}
            </>
          )}

          {/* New offer panel */}
          <div className="no-print bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p className="font-sans font-[700] text-xs uppercase tracking-widest text-gray-400 mb-4">
              {L.tryNewOffer}
            </p>

            <div className="relative mb-3">
              <textarea
                value={newJd}
                onChange={e => { setNewJd(e.target.value); setNewJdFile(null); setNewJdError('') }}
                placeholder={L.newOfferPlaceholder}
                rows={newJdIsUrl ? 2 : 4}
                disabled={analyzing}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full font-sans text-sm rounded-xl border px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-teal/30 transition-all disabled:opacity-50 text-purple-dark"
                style={{ borderColor: newJdIsUrl ? '#0DA1A4' : '#e5e7eb' }}
              />
              {newJdIsUrl && (
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: '#e6f7f7' }}>
                  <svg className="w-3 h-3 text-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span className="font-sans font-[700] text-xs text-teal">{L.urlDetected}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="font-sans text-xs text-gray-400">{L.orUpload}</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <div className="flex items-center gap-3 mb-4">
              <label className="cursor-pointer" style={{ opacity: newJd.trim() ? 0.4 : 1, pointerEvents: newJd.trim() ? 'none' : 'auto' }}>
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
                  onChange={e => { setNewJdFile(e.target.files?.[0] ?? null); setNewJd('') }} />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border font-sans font-[700] text-xs uppercase tracking-wider transition-colors duration-200"
                  style={{ borderColor: newJdFile ? '#0DA1A4' : '#e5e7eb', color: newJdFile ? '#0DA1A4' : '#9ca3af', backgroundColor: newJdFile ? '#e6f7f7' : 'transparent' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  {newJdFile ? newJdFile.name : L.uploadFile}
                </div>
              </label>
              {newJdFile && (
                <button onClick={() => setNewJdFile(null)} className="font-sans text-xs text-gray-400 hover:text-red-500 underline underline-offset-2">
                  {L.remove}
                </button>
              )}
            </div>

            {newJdError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="font-sans text-sm text-red-700">{newJdError}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleNewOffer}
                disabled={analyzing || (!newJd.trim() && !newJdFile)}
                className="flex-1 py-3 rounded-xl font-sans font-[900] text-sm uppercase tracking-wider transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-navy text-white"
              >
                {analyzing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    {L.analyzing}
                  </span>
                ) : L.compareOffer}
              </button>
              <button onClick={() => router.push('/')}
                className="font-sans font-[700] text-xs uppercase tracking-wider text-gray-400 hover:text-navy transition-colors px-3">
                {L.analyzeCV}
              </button>
            </div>
          </div>

          <div className="pb-6" />
        </main>
      </div>
    </div>
  )
}
