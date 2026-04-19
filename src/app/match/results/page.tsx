'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import type { MatchResult } from '@/types/match'
import { getLang } from '@/components/LanguageSelector'
import Header from '@/components/Header'
import { renderWithTerminos } from '@/lib/renderBold'
import SuggestionCard from '@/components/results/SuggestionCard'

const PRIORITY_ORDER: Record<string, number> = { alta: 0, media: 1, baja: 2 }

function getScoreColor(score: number) {
  if (score >= 75) return { arc: '#0DA1A4', bg: '#e6f7f7', text: '#0DA1A4', label: 'Buen match' }
  if (score >= 50) return { arc: '#f59e0b', bg: '#fffbeb', text: '#d97706', label: 'Match parcial' }
  return               { arc: '#ef4444', bg: '#fff1f2', text: '#e11d48', label: 'Match bajo' }
}

const R = 52
const CIRC = 2 * Math.PI * R

export default function MatchResultsPage() {
  const router = useRouter()
  const [result, setResult] = useState<MatchResult | null>(null)
  const [animated, setAnimated] = useState(false)

  // New-offer state
  const [newJd, setNewJd] = useState('')
  const [newJdFile, setNewJdFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [newJdError, setNewJdError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const newJdIsUrl = /^https?:\/\/\S+$/.test(newJd.trim())

  useEffect(() => {
    const raw = sessionStorage.getItem('matchResult')
    if (!raw) { router.replace('/match'); return }
    try {
      setResult(JSON.parse(raw) as MatchResult)
      setTimeout(() => setAnimated(true), 150)
    } catch {
      router.replace('/match')
    }
  }, [router])

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

  const handleNewOffer = async () => {
    const hasJd = newJd.trim().length > 10 || !!newJdFile
    if (!hasJd) { setNewJdError('Introduce la nueva oferta para continuar.'); return }
    setAnalyzing(true)
    setNewJdError('')
    try {
      const formData = new FormData()
      const cvText = sessionStorage.getItem('atsCvText') ?? ''
      formData.append('cvText', cvText)
      if (newJdIsUrl) {
        formData.append('jdUrl', newJd.trim())
      } else if (newJd.trim()) {
        formData.append('jdText', newJd.trim())
      } else if (newJdFile) {
        formData.append('jdFile', newJdFile)
      }
      formData.append('lang', getLang())
      const response = await fetch('/api/match', { method: 'POST', body: formData })
      const ct = response.headers.get('content-type') ?? ''
      if (!ct.includes('application/json')) {
        throw new Error('El servicio no está disponible en este momento. Inténtalo de nuevo en unos segundos.')
      }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Error al analizar el match.')
      sessionStorage.setItem('matchResult', JSON.stringify(data as MatchResult))
      setResult(data as MatchResult)
      setAnimated(false)
      setTimeout(() => setAnimated(true), 150)
      setNewJd('')
      setNewJdFile(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setNewJdError(err instanceof Error ? err.message : 'Error inesperado.')
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
          <p className="font-sans text-gray-400 text-sm">Cargando resultados...</p>
        </div>
      </div>
    )
  }

  const colors = getScoreColor(result.matchScore)
  const dashOffset = animated ? CIRC * (1 - result.matchScore / 100) : CIRC
  const sorted = [...result.sugerencias].sort(
    (a, b) => (PRIORITY_ORDER[a.prioridad] ?? 1) - (PRIORITY_ORDER[b.prioridad] ?? 1)
  )

  return (
    <div className="min-h-screen bg-bg-light">

      <Header noPrint />

      <div className="bg-bg-light">
        <main className="max-w-3xl mx-auto px-6 py-8 space-y-4">

          {/* Score card */}
          <div className="bg-white rounded-2xl p-6 break-inside-avoid" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
            {/* Top bar */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <span className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400">
                  Match con oferta
                </span>
                {result.puestoBuscado && (
                  <p className="font-sans font-[700] text-sm mt-0.5 text-purple-dark">
                    {result.puestoBuscado}
                    {result.empresa && <span className="font-[400] text-gray-400"> · {result.empresa}</span>}
                  </p>
                )}
              </div>
              <button
                onClick={() => window.print()}
                className="no-print inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] font-sans font-[700] text-xs uppercase tracking-wider bg-navy text-white hover:opacity-80 transition-all duration-300"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descargar PDF
              </button>
            </div>

            {/* Circle + analysis */}
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

            {/* Keywords */}
            {(result.keywordsPresentes.length > 0 || result.keywordsFaltantes.length > 0) && (
              <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-5">
                {result.keywordsPresentes.length > 0 && (
                  <div>
                    <p className="font-sans font-[600] text-xs uppercase tracking-widest mb-2.5" style={{ color: '#059669' }}>
                      ✓ Keywords presentes
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
                      ✗ Keywords faltantes
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

          {/* Suggestions */}
          {sorted.length > 0 && (
            <>
              <div className="pt-3 pb-1">
                <h2 className="font-sans font-[900] text-xl text-purple-dark">
                  Cómo mejorar tu match
                </h2>
              </div>
              {sorted.map((s, i) => (
                <div key={i} className="break-inside-avoid">
                  <SuggestionCard suggestion={s} />
                </div>
              ))}
            </>
          )}

          {/* New offer panel */}
          <div className="no-print bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p className="font-sans font-[700] text-xs uppercase tracking-widest text-gray-400 mb-4">
              Probar con otra oferta
            </p>

            <div className="relative mb-3">
              <textarea
                value={newJd}
                onChange={e => { setNewJd(e.target.value); setNewJdFile(null); setNewJdError('') }}
                placeholder="Pega el texto de la nueva oferta o una URL (https://...)"
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
                  <span className="font-sans font-[700] text-xs text-teal">URL detectada</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="font-sans text-xs text-gray-400">o sube un archivo</span>
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
                  {newJdFile ? newJdFile.name : 'PDF o DOCX'}
                </div>
              </label>
              {newJdFile && (
                <button onClick={() => setNewJdFile(null)} className="font-sans text-xs text-gray-400 hover:text-red-500 underline underline-offset-2">
                  Quitar
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
                    Analizando...
                  </span>
                ) : 'Comparar con esta oferta'}
              </button>
              <button onClick={() => router.push('/')}
                className="font-sans font-[700] text-xs uppercase tracking-wider text-gray-400 hover:text-navy transition-colors px-3">
                Analizar CV
              </button>
            </div>
          </div>

          <div className="pb-6" />
        </main>
      </div>
    </div>
  )
}
