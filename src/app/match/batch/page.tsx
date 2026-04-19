'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { MatchResult } from '@/types/match'
import { getLang } from '@/components/LanguageSelector'
import Header from '@/components/Header'

interface JdEntry {
  id: string
  label: string
  text: string
}

interface BatchEntry {
  jd: JdEntry
  result: MatchResult
}

function genId() { return Math.random().toString(36).slice(2, 9) }

const MAX_JDS = 8

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? '#0DA1A4' : score >= 50 ? '#f59e0b' : '#ef4444'
  const bg    = score >= 75 ? '#e6f7f7' : score >= 50 ? '#fffbeb' : '#fff1f2'
  const label = score >= 75 ? 'Buen match' : score >= 50 ? 'Match parcial' : 'Match bajo'
  return (
    <div className="flex flex-col items-center flex-shrink-0">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center font-sans font-[900] text-lg"
        style={{ backgroundColor: bg, color }}
      >
        {score}
      </div>
      <span className="font-sans text-[10px] font-[700] mt-1 uppercase tracking-wide" style={{ color }}>
        {label}
      </span>
    </div>
  )
}

export default function BatchMatchPage() {
  const router = useRouter()

  // CV
  const [hasCachedCv, setHasCachedCv] = useState(false)
  const [cachedCvName, setCachedCvName] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)

  // JD list
  const [jds, setJds] = useState<JdEntry[]>([
    { id: genId(), label: '', text: '' },
    { id: genId(), label: '', text: '' },
  ])

  // Progress / results
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [results, setResults] = useState<BatchEntry[] | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const cached = sessionStorage.getItem('atsCvText') || localStorage.getItem('atsCvText')
    if (cached && cached.length > 100) {
      setHasCachedCv(true)
      const raw = sessionStorage.getItem('atsResult')
      if (raw) {
        try { setCachedCvName(JSON.parse(raw).nombre || 'Tu CV') } catch { setCachedCvName('Tu CV') }
      }
    }
  }, [])

  const addJd = () => {
    if (jds.length >= MAX_JDS) return
    setJds(prev => [...prev, { id: genId(), label: '', text: '' }])
  }

  const removeJd = (id: string) => {
    setJds(prev => prev.filter(j => j.id !== id))
  }

  const updateJd = (id: string, patch: Partial<JdEntry>) => {
    setJds(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j))
  }

  const validJds = jds.filter(j => j.text.trim().length >= 50)

  const handleAnalyze = async () => {
    if (!hasCachedCv && !cvFile) { setErrorMsg('Sube tu CV para continuar.'); return }
    if (validJds.length === 0) { setErrorMsg('Añade al menos una oferta con suficiente texto (mín. 50 caracteres).'); return }

    setAnalyzing(true)
    setErrorMsg('')
    setProgress({ done: 0, total: validJds.length })
    setResults(null)

    const cvText = hasCachedCv ? (sessionStorage.getItem('atsCvText') ?? '') : null
    const lang = getLang()
    const collected: BatchEntry[] = []

    for (let i = 0; i < validJds.length; i++) {
      const jd = validJds[i]
      setProgress({ done: i, total: validJds.length })

      try {
        const formData = new FormData()
        if (cvText) {
          formData.append('cvText', cvText)
        } else if (cvFile) {
          formData.append('cvFile', cvFile)
        }
        formData.append('jdText', jd.text.trim())
        formData.append('lang', lang)

        const response = await fetch('/api/match', { method: 'POST', body: formData })
        const ct = response.headers.get('content-type') ?? ''
        if (!ct.includes('application/json')) throw new Error('Servicio no disponible.')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Error al analizar.')
        data.analyzedAt = new Date().toISOString()
        collected.push({ jd, result: data as MatchResult })
      } catch (err) {
        collected.push({
          jd,
          result: {
            matchScore: 0,
            nombre: '',
            puestoBuscado: jd.label || `Oferta ${i + 1}`,
            resumenMatch: err instanceof Error ? err.message : 'Error al analizar esta oferta.',
            keywordsPresentes: [],
            keywordsFaltantes: [],
            sugerencias: [],
            analyzedAt: new Date().toISOString(),
          } as MatchResult,
        })
      }
    }

    // Sort by score descending
    collected.sort((a, b) => b.result.matchScore - a.result.matchScore)
    setResults(collected)
    setProgress({ done: validJds.length, total: validJds.length })
    setAnalyzing(false)
  }

  const handleViewFull = (entry: BatchEntry) => {
    sessionStorage.setItem('matchResult', JSON.stringify(entry.result))
    router.push('/match/results')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0ede8' }}>
      <Header />

      {/* Hero */}
      <section className="bg-navy text-white py-14 px-6">
        <div className="max-w-container mx-auto text-center">
          <p className="font-sans font-[900] uppercase tracking-widest text-neon text-xs mb-5">
            Herramienta Gratuita de Manfred
          </p>
          <h1 className="font-heading font-[900] text-4xl md:text-5xl leading-tight mb-4">
            Match en batch:
            <br />
            <span className="italic" style={{ color: '#01FFC6' }}>varias ofertas a la vez</span>
          </h1>
          <p className="font-sans text-base text-white/70 max-w-xl mx-auto">
            Pega hasta {MAX_JDS} ofertas y obtén un ranking de compatibilidad con tu CV. Ahorra tiempo en tu búsqueda activa.
          </p>
        </div>
      </section>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-5">

        {/* Back link */}
        <button
          onClick={() => router.push('/match')}
          className="flex items-center gap-1.5 font-sans text-sm text-gray-400 hover:text-teal transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver al match individual
        </button>

        {/* Results view */}
        {results && !analyzing && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-sans font-[900] text-lg" style={{ color: '#1a2744' }}>
                  Ranking de compatibilidad
                </h2>
                <p className="font-sans text-xs text-gray-400 mt-0.5">
                  {results.length} {results.length === 1 ? 'oferta analizada' : 'ofertas analizadas'} · ordenadas por puntuación
                </p>
              </div>
              <button
                onClick={() => { setResults(null); setProgress(null) }}
                className="font-sans font-[700] text-xs text-gray-400 hover:text-teal transition-colors underline underline-offset-2"
              >
                Analizar de nuevo
              </button>
            </div>

            <div className="space-y-3">
              {results.map((entry, idx) => {
                const title = entry.jd.label || entry.result.puestoBuscado || `Oferta ${idx + 1}`
                const empresa = entry.result.empresa
                const topMatch = entry.result.keywordsPresentes?.slice(0, 3) ?? []
                const topGap   = entry.result.keywordsFaltantes?.slice(0, 2) ?? []
                const hasError = entry.result.matchScore === 0 && !entry.result.puestoBuscado

                return (
                  <div
                    key={entry.jd.id}
                    className="bg-white rounded-2xl p-5"
                    style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Rank */}
                      <div
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-sans font-[900] text-xs mt-1"
                        style={{ backgroundColor: '#f0ede8', color: '#9ca3af' }}
                      >
                        {idx + 1}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-sans font-[700] text-sm truncate" style={{ color: '#1a2744' }}>
                          {title}
                        </p>
                        {empresa && (
                          <p className="font-sans text-xs text-gray-400">{empresa}</p>
                        )}

                        {hasError ? (
                          <p className="font-sans text-xs text-red-500 mt-2">{entry.result.resumenMatch}</p>
                        ) : (
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                            {topMatch.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {topMatch.slice(0, 3).map((kw, i) => (
                                  <span key={i} className="font-sans text-xs px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            )}
                            {topGap.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {topGap.slice(0, 2).map((kw, i) => (
                                  <span key={i} className="font-sans text-xs px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: '#fff1f2', color: '#e11d48' }}>
                                    -{kw}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Score */}
                      {!hasError && <ScoreBadge score={entry.result.matchScore} />}
                    </div>

                    {!hasError && (
                      <button
                        onClick={() => handleViewFull(entry)}
                        className="mt-4 w-full py-2 rounded-xl font-sans font-[700] text-xs uppercase tracking-wider border-2 transition-colors duration-200"
                        style={{ borderColor: '#e5e7eb', color: '#6b7280' }}
                        onMouseEnter={e => {
                          ;(e.currentTarget as HTMLElement).style.borderColor = '#0DA1A4'
                          ;(e.currentTarget as HTMLElement).style.color = '#0DA1A4'
                        }}
                        onMouseLeave={e => {
                          ;(e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'
                          ;(e.currentTarget as HTMLElement).style.color = '#6b7280'
                        }}
                      >
                        Ver análisis completo →
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Form view */}
        {!results && (
          <>
            {/* CV */}
            <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <p className="font-sans font-[700] text-xs uppercase tracking-widest text-gray-400 mb-4">Tu CV</p>

              {hasCachedCv ? (
                <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: '#e6f7f7' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#0DA1A4' }}>
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-sans font-[700] text-sm" style={{ color: '#0DA1A4' }}>
                        CV de {cachedCvName} cargado
                      </p>
                      <p className="font-sans text-xs text-gray-400">Del análisis anterior</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setHasCachedCv(false)}
                    className="font-sans text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <label
                  className="flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed cursor-pointer transition-colors duration-200"
                  style={{ borderColor: cvFile ? '#0DA1A4' : '#d1d5db', backgroundColor: cvFile ? '#e6f7f7' : 'transparent' }}
                >
                  <input type="file" accept=".pdf,.doc,.docx" className="hidden"
                    onChange={e => setCvFile(e.target.files?.[0] ?? null)} />
                  {cvFile ? (
                    <div className="text-center">
                      <p className="font-sans font-[700] text-sm" style={{ color: '#0DA1A4' }}>{cvFile.name}</p>
                      <p className="font-sans text-xs text-gray-400 mt-1">Haz clic para cambiar</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg className="w-6 h-6 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <p className="font-sans text-sm text-gray-400">Sube tu CV <span className="font-[700] text-gray-500">PDF o DOCX</span></p>
                    </div>
                  )}
                </label>
              )}
            </div>

            {/* JD list */}
            <div className="bg-white rounded-2xl p-6 space-y-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div className="flex items-center justify-between">
                <p className="font-sans font-[700] text-xs uppercase tracking-widest text-gray-400">
                  Ofertas de trabajo ({jds.length}/{MAX_JDS})
                </p>
              </div>

              {jds.map((jd, idx) => (
                <div key={jd.id} className="space-y-2 pt-4 border-t border-gray-100 first:border-0 first:pt-0">
                  <div className="flex items-center justify-between">
                    <p className="font-sans font-[600] text-xs text-gray-400">Oferta {idx + 1}</p>
                    {jds.length > 1 && (
                      <button
                        onClick={() => removeJd(jd.id)}
                        className="font-sans text-xs text-gray-300 hover:text-red-400 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={jd.label}
                    onChange={e => updateJd(jd.id, { label: e.target.value })}
                    placeholder="Etiqueta opcional (ej: Senior Dev en Stripe)"
                    className="w-full font-sans text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30 transition-all"
                    style={{ borderColor: '#e5e7eb', color: '#1a2744' }}
                  />
                  <textarea
                    value={jd.text}
                    onChange={e => updateJd(jd.id, { text: e.target.value })}
                    placeholder="Pega aquí el texto completo de la oferta..."
                    rows={5}
                    className="w-full font-sans text-sm rounded-xl border px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-teal/30 transition-all"
                    style={{ borderColor: jd.text.trim().length > 0 && jd.text.trim().length < 50 ? '#f59e0b' : '#e5e7eb', color: '#1a2744' }}
                    autoComplete="off" autoCorrect="off" spellCheck={false}
                  />
                  {jd.text.trim().length > 0 && jd.text.trim().length < 50 && (
                    <p className="font-sans text-xs text-amber-500">Texto demasiado corto — pega el contenido completo de la oferta.</p>
                  )}
                </div>
              ))}

              {jds.length < MAX_JDS && (
                <button
                  onClick={addJd}
                  className="flex items-center gap-1.5 font-sans font-[700] text-xs uppercase tracking-wider px-3 py-2 rounded-lg border-2 border-dashed transition-colors duration-200"
                  style={{ borderColor: '#0DA1A4', color: '#0DA1A4' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Añadir oferta
                </button>
              )}
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 font-sans text-sm">{errorMsg}</p>
              </div>
            )}

            {/* Progress */}
            {analyzing && progress && (
              <div className="flex flex-col items-center gap-4 p-8 rounded-xl bg-white border border-gray-100" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div className="flex gap-2">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-2.5 h-2.5 rounded-full bg-teal"
                      style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
                <p className="font-sans font-[800] text-center text-base" style={{ color: '#1a2744' }}>
                  Analizando oferta {progress.done + 1} de {progress.total}...
                </p>
                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(progress.done / progress.total) * 100}%`, backgroundColor: '#0DA1A4' }}
                  />
                </div>
                <p className="font-sans text-gray-400 text-xs">La IA compara tu perfil con cada oferta</p>
              </div>
            )}

            {/* CTA */}
            {!analyzing && (
              <button
                onClick={handleAnalyze}
                disabled={validJds.length === 0 || (!hasCachedCv && !cvFile)}
                className="w-full py-3.5 rounded-xl font-sans font-[900] text-sm uppercase tracking-wider transition-all duration-300 hover:opacity-80 disabled:hover:opacity-100"
                style={{
                  backgroundColor: validJds.length > 0 && (hasCachedCv || cvFile) ? '#092c64' : '#e5e7eb',
                  color: validJds.length > 0 && (hasCachedCv || cvFile) ? '#ffffff' : '#9ca3af',
                  cursor: validJds.length > 0 && (hasCachedCv || cvFile) ? 'pointer' : 'not-allowed',
                }}
              >
                Analizar {validJds.length > 0 ? `${validJds.length} ${validJds.length === 1 ? 'oferta' : 'ofertas'}` : 'ofertas'}
              </button>
            )}

            <div className="flex items-center justify-center gap-6 text-xs text-gray-400 font-sans">
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
                Máx. {MAX_JDS} ofertas por análisis
              </div>
            </div>
          </>
        )}
      </main>

      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
