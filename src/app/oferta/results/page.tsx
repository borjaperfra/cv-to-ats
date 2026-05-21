'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { JobAnalysisResult } from '@/types/job'
import Header from '@/components/Header'
import { getLang, type Lang } from '@/components/LanguageSelector'

const LABELS = {
  es: {
    loading: 'Cargando resultados...',
    offerAnalysis: 'Análisis de oferta',
    by: 'en',
    positiveSignals: 'Lo que habla bien de esta oferta',
    alertSignals: 'Señales de alerta',
    notSaid: 'Lo que no dice la oferta',
    analyzeAnother: 'Analizar otra oferta',
    backToAnalysis: 'Volver al análisis',
  },
  en: {
    loading: 'Loading results...',
    offerAnalysis: 'Offer analysis',
    by: 'at',
    positiveSignals: 'What speaks well of this offer',
    alertSignals: 'Red flags',
    notSaid: 'What the offer doesn\'t say',
    analyzeAnother: 'Analyse another offer',
    backToAnalysis: 'Back to analysis',
  },
}

function getScoreColor(score: number): string {
  if (score >= 75) return '#0DA1A4'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function getScoreBadge(score: number): { label: string; bg: string; text: string } {
  if (score >= 75) return { label: 'Buena oferta',  bg: '#e6f7f7', text: '#0DA1A4' }
  if (score >= 50) return { label: 'Con matices',   bg: '#fffbeb', text: '#d97706' }
  return              { label: 'Muchas dudas',   bg: '#fff1f2', text: '#e11d48' }
}

function getJobEtiqueta(score: number): string {
  if (score >= 90) return 'Aplica ya antes de que desaparezca'
  if (score >= 70) return 'Merece una llamada'
  if (score >= 50) return 'Léela dos veces'
  if (score >= 30) return 'Aquí hay algo raro'
  if (score >= 10) return 'Pide mucho, ofrece poco'
  return 'Guardar como ejemplo de lo que no hacer'
}

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function ScoreCircle({ score }: { score: number }) {
  const [animated, setAnimated] = useState(false)
  const [displayScore, setDisplayScore] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 150)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const duration = 1200
    const start = performance.now()
    const frame = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(eased * score))
      if (progress < 1) requestAnimationFrame(frame)
    }
    const raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [score])

  const color = getScoreColor(score)
  const dashOffset = animated ? CIRCUMFERENCE * (1 - score / 100) : CIRCUMFERENCE

  return (
    <div className="relative flex-shrink-0" style={{ width: 130, height: 130 }}>
      <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90">
        <circle cx="65" cy="65" r={RADIUS} fill="none" stroke="#eef0f2" strokeWidth="8" />
        <circle
          cx="65" cy="65" r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1.2s ease-in-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-sans font-[900] leading-none" style={{ fontSize: '2.5rem', color }}>
          {displayScore}
        </span>
        <span className="font-sans text-gray-400 text-xs mt-0.5">/ 100</span>
      </div>
    </div>
  )
}

export default function JobResultsPage() {
  const router = useRouter()
  const [result, setResult] = useState<JobAnalysisResult | null>(null)
  const [lang, setLang] = useState<Lang>('es')

  useEffect(() => {
    setLang(getLang())
    const handler = (e: Event) => setLang((e as CustomEvent<Lang>).detail)
    window.addEventListener('langchange', handler)
    return () => window.removeEventListener('langchange', handler)
  }, [])

  useEffect(() => {
    const raw = sessionStorage.getItem('jobResult')
    if (!raw) { router.replace('/oferta'); return }
    try {
      setResult(JSON.parse(raw) as JobAnalysisResult)
    } catch {
      router.replace('/oferta')
    }
  }, [router])

  const L = LABELS[lang]

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

  const { label: badgeLabel, bg: badgeBg, text: badgeText } = getScoreBadge(result.score)
  const etiqueta = getJobEtiqueta(result.score)

  return (
    <div className="min-h-screen bg-bg-light">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-5">

        {/* Score card */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
          <div className="flex items-center justify-between mb-5">
            <span className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400">
              {L.offerAnalysis}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            <ScoreCircle score={result.score} />

            <div className="flex-1 min-w-0">
              <span
                className="inline-block font-sans font-[600] text-sm px-3 py-1 rounded-full mb-2"
                style={{ backgroundColor: badgeBg, color: badgeText }}
              >
                {badgeLabel}
              </span>

              {(result.puesto || result.empresa) && (
                <p className="font-sans text-xs text-gray-400 mb-2">
                  {result.puesto}
                  {result.puesto && result.empresa ? ` ${L.by} ` : ''}
                  {result.empresa && (
                    <span className="font-[600] text-gray-500">{result.empresa}</span>
                  )}
                </p>
              )}

              <p className="font-sans font-[700] text-base text-navy mb-3 leading-snug">
                {result.veredicto}
              </p>

              <p className="font-sans text-sm leading-relaxed text-purple-dark">
                {result.resumen}
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="font-sans text-xs text-gray-400 italic">{etiqueta}</p>
          </div>
        </div>

        {/* Positive signals */}
        {result.senalesPositivas.length > 0 && (
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
            <h2 className="font-sans font-[700] text-sm uppercase tracking-widest mb-4"
              style={{ color: '#0DA1A4' }}>
              {L.positiveSignals}
            </h2>
            <div className="space-y-3">
              {result.senalesPositivas.map((signal, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: '#e6f7f7' }}>
                    <svg className="w-3 h-3" fill="none" stroke="#0DA1A4" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-sans font-[600] text-sm text-purple-dark">{signal.titulo}</p>
                    <p className="font-sans text-sm text-gray-500 leading-relaxed mt-0.5">{signal.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alert signals */}
        {result.senalesAlerta.length > 0 && (
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
            <h2 className="font-sans font-[700] text-sm uppercase tracking-widest mb-4"
              style={{ color: '#d97706' }}>
              {L.alertSignals}
            </h2>
            <div className="space-y-3">
              {result.senalesAlerta.map((signal, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: '#fffbeb' }}>
                    <svg className="w-3 h-3" fill="none" stroke="#d97706" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-sans font-[600] text-sm text-purple-dark">{signal.titulo}</p>
                    <p className="font-sans text-sm text-gray-500 leading-relaxed mt-0.5">{signal.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lo que no dice */}
        {result.loQueNoDice.length > 0 && (
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
            <h2 className="font-sans font-[700] text-sm uppercase tracking-widest mb-4 text-gray-400">
              {L.notSaid}
            </h2>
            <ul className="space-y-2">
              {result.loQueNoDice.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="font-sans text-gray-300 text-sm mt-0.5 flex-shrink-0">—</span>
                  <span className="font-sans text-sm text-gray-500">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <a
            href="/oferta"
            className="flex-1 font-sans font-[700] text-sm uppercase tracking-wider py-3 rounded-xl text-center transition-colors"
            style={{ backgroundColor: '#092c64', color: '#ffffff' }}
          >
            {L.analyzeAnother}
          </a>
        </div>

      </main>
    </div>
  )
}
