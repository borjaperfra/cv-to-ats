'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ATSAnalysisResult, Suggestion } from '@/types/analysis'
import Header from '@/components/Header'
import { saveToHistory } from '@/lib/history'
import ScoreHeader from '@/components/results/ScoreHeader'
import SuggestionCard from '@/components/results/SuggestionCard'
import AlertaBanner from '@/components/results/AlertaBanner'
import ExportButton from '@/components/results/ExportButton'
import ScrollToTop from '@/components/ScrollToTop'

const PRIORITY_ORDER: Record<string, number> = { alta: 0, media: 1, baja: 2 }

export default function ResultsPage() {
  const router = useRouter()
  const [result, setResult] = useState<ATSAnalysisResult | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('atsResult')
    if (!raw) { router.replace('/'); return }
    try {
      const parsed = JSON.parse(raw) as ATSAnalysisResult
      setResult(parsed)
      saveToHistory(parsed)
    } catch {
      router.replace('/')
    }
  }, [router])

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

  const allSuggestions: Suggestion[] = result.categories
    .flatMap(c => c.suggestions ?? [])
    .sort((a, b) => (PRIORITY_ORDER[a.prioridad] ?? 1) - (PRIORITY_ORDER[b.prioridad] ?? 1))

  return (
    <div className="min-h-screen bg-bg-light">
      <ScrollToTop />
      {/* Header — hidden on print */}
      <Header noPrint />

      {/* Printable content */}
      <div id="results-content" className="bg-bg-light">

        {/* Print-only header — hidden on screen, visible in PDF */}
        <div
          className="print-only items-center justify-between px-8 py-5 border-b bg-navy"
          style={{ borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-manfred.svg" alt="Manfred" style={{ height: 24, width: 'auto', filter: 'brightness(0) invert(1)' }} />
            <span style={{ width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.2)', display: 'inline-block', margin: '0 8px' }} />
            <span style={{ fontFamily: 'sans-serif', fontWeight: 900, color: '#ffffff', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              ATS Killer
            </span>
          </div>
          <p style={{ fontFamily: 'sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: 0 }}>
            Tu análisis de CV optimizado para ATS
          </p>
        </div>
        <main className="max-w-3xl mx-auto px-6 py-8 space-y-4">

          {/* Score header */}
          <div className="break-inside-avoid">
            <ScoreHeader
              score={result.overallScore}
              saludo={result.saludo ?? result.headline}
              saludoTerminos={result.saludoTerminos}
              skillsDetectadas={result.skillsDetectadas}
              metricas={result.metricas}
            />
          </div>

          {/* Critical alerts banner */}
          {result.alertasCriticas && result.alertasCriticas.length > 0 && (
            <div className="break-inside-avoid">
              <AlertaBanner alertas={result.alertasCriticas} />
            </div>
          )}

          {/* Section title */}
          <div className="pt-3 pb-1">
            <h2 className="font-sans font-[900] text-xl text-purple-dark">
              Mejoras recomendadas
            </h2>
            <p className="font-sans text-xs text-gray-400 mt-1">
              Cada análisis es independiente — al mejorar el CV pueden aparecer puntos nuevos. La puntuación puede subir o bajar entre iteraciones.
            </p>
          </div>

          {/* Suggestion cards */}
          {allSuggestions.map((s, i) => (
            <div key={i} className="break-inside-avoid">
              <SuggestionCard suggestion={s} />
            </div>
          ))}

          {/* Before/after CTA */}
          <div className="no-print flex items-center justify-center">
            <button
              onClick={() => router.push('/results/compare')}
              className="inline-flex items-center gap-2 font-sans font-[700] text-sm px-5 py-2.5 rounded-xl border-2 transition-colors duration-200 border-teal text-teal"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#e6f7f7' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              ¿Has mejorado tu CV? Compara versiones
            </button>
          </div>

          {/* Bottom CTA — hidden on print */}
          <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl mt-2 bg-navy">
            <div>
              <p className="font-sans font-[900] uppercase tracking-widest text-xs mb-1 text-neon">
                ¿Empezamos a mejorar tu CV?
              </p>
              <p className="font-sans font-[800] text-base leading-snug text-white">
                Descarga tu informe completo
              </p>
            </div>
            <div className="flex-shrink-0">
              <ExportButton variant="outline" />
            </div>
          </div>

          <div className="no-print pb-4 text-center">
            <button
              onClick={() => router.push('/')}
              className="font-sans font-[800] text-sm text-gray-400 hover:text-teal transition-colors duration-200 uppercase tracking-wider"
            >
              ← Analizar otro CV
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
