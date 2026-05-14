'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import type { ATSAnalysisResult, Suggestion } from '@/types/analysis'
import Header from '@/components/Header'
import { saveToHistory } from '@/lib/history'
import ScoreHeader from '@/components/results/ScoreHeader'
import SuggestionCard from '@/components/results/SuggestionCard'
import AlertaBanner from '@/components/results/AlertaBanner'
import ExportButton from '@/components/results/ExportButton'
import ManfredOffersSection from '@/components/results/ManfredOffersSection'
import ScrollToTop from '@/components/ScrollToTop'

const PRIORITY_ORDER: Record<string, number> = { alta: 0, media: 1, baja: 2 }

export default function ResultsPage() {
  const router = useRouter()
  const [result, setResult] = useState<ATSAnalysisResult | null>(null)
  const [showMilestone, setShowMilestone] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('atsResult')
    if (!raw) { router.replace('/'); return }
    try {
      const parsed = JSON.parse(raw) as ATSAnalysisResult
      setResult(parsed)
      saveToHistory(parsed)
      if (parsed.milestone) setShowMilestone(true)
    } catch {
      router.replace('/')
    }
  }, [router])

  useEffect(() => {
    if (!showMilestone) return
    const base = {
      particleCount: 120, spread: 80, startVelocity: 50,
      colors: ['#0DA1A4', '#01FFC6', '#092c64', '#ffffff', '#f59e0b'],
    }
    const t = setTimeout(() => {
      confetti({ ...base, origin: { x: 0.2, y: 0.6 } })
      confetti({ ...base, origin: { x: 0.8, y: 0.6 } })
      setTimeout(() => {
        confetti({ ...base, particleCount: 60, origin: { x: 0.5, y: 0.4 } })
      }, 400)
    }, 300)
    return () => clearTimeout(t)
  }, [showMilestone])

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('borja.perez@getmanfred.com')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

  const allSuggestions: Suggestion[] = result.categories
    .flatMap(c => c.suggestions ?? [])
    .sort((a, b) => (PRIORITY_ORDER[a.prioridad] ?? 1) - (PRIORITY_ORDER[b.prioridad] ?? 1))

  return (
    <div className="min-h-screen bg-bg-light">
      <ScrollToTop />

      {/* Milestone 10.000 popup */}
      {showMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Close button */}
            <button
              onClick={() => setShowMilestone(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Cerrar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header strip */}
            <div className="px-8 pt-8 pb-4" style={{ background: 'linear-gradient(135deg, #092c64 0%, #0DA1A4 100%)' }}>
              <div className="text-center">
                <div className="font-sans font-black text-6xl" style={{ color: '#01FFC6', fontVariantNumeric: 'tabular-nums' }}>10.000</div>
                <div className="font-sans font-bold text-white text-xl mt-1">Eres el/la numero 10.000</div>
              </div>
            </div>

            {/* Body */}
            <div className="px-8 py-6">
              <p className="font-sans text-gray-700 text-sm leading-relaxed">
                <strong>Enhorabuena!</strong> Eres la persona numero 10.000 en analizar su CV con ATS Killer.
              </p>
              <p className="font-sans text-gray-700 text-sm leading-relaxed mt-3">
                Te llevarias un coche y un apartamento en Torrevieja, pero la han conquistado los guiris y no nos da el presupuesto.
              </p>
              <p className="font-sans text-gray-700 text-sm leading-relaxed mt-3">
                Pero si me escribes a{' '}
                <span className="font-semibold" style={{ color: '#092c64' }}>borja.perez@getmanfred.com</span>{' '}
                te mandamos un pack de merchandising chulo de Manfred y algún regalillo más.
              </p>
              <p className="font-sans text-sm leading-relaxed mt-3 font-medium" style={{ color: '#0DA1A4' }}>
                P.D. Si lo publicas en Tw y me etiquetas @borjaperfra vas a ser la envidia de todo el mundo ^__^ Gracias por usar la herramienta.
              </p>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCopyEmail}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-sans font-bold text-sm transition-all"
                  style={{ backgroundColor: copied ? '#01FFC6' : '#092c64', color: copied ? '#092c64' : 'white' }}
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Copiado!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copiar email de Borja
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowMilestone(false)}
                  className="px-4 py-2.5 rounded-xl font-sans font-bold text-sm border-2 transition-all"
                  style={{ borderColor: '#e5e7eb', color: '#6b7280' }}
                >
                  Ver mi resultado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

          {/* Methodology link */}
          <div className="no-print text-center">
            <Link
              href="/como-funciona"
              className="font-sans text-xs transition-opacity hover:opacity-70"
              style={{ color: '#0DA1A4' }}
            >
              ¿Cómo se calcula esta puntuación? →
            </Link>
          </div>

          {/* Critical alerts banner */}
          {result.alertasCriticas && result.alertasCriticas.length > 0 && (
            <div className="break-inside-avoid">
              <AlertaBanner alertas={result.alertasCriticas} />
            </div>
          )}

          {/* Career gaps — informational, not critical */}
          {result.gapsCarrera && result.gapsCarrera.length > 0 && (
            <div className="break-inside-avoid rounded-2xl p-5" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5" style={{ backgroundColor: '#fef3c7' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#d97706' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-sans font-[700] text-xs uppercase tracking-widest mb-2" style={{ color: '#d97706' }}>
                    Huecos en el historial laboral
                  </p>
                  <ul className="space-y-1">
                    {result.gapsCarrera.map((gap, i) => (
                      <li key={i} className="font-sans text-sm" style={{ color: '#92400e' }}>{gap}</li>
                    ))}
                  </ul>
                  <p className="font-sans text-xs mt-2" style={{ color: '#b45309' }}>
                    Algunos ATS filtran gaps de más de 6 meses. Considera añadir una breve nota explicativa en tu CV.
                  </p>
                </div>
              </div>
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

          {/* Manfred offers — hidden on print */}
          {result.skillsDetectadas && result.skillsDetectadas.length > 0 && (
            <ManfredOffersSection skillsDetectadas={result.skillsDetectadas} />
          )}

          {/* More tools discovery — hidden on print */}
          <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { href: '/editor', icon: '✏️', label: 'Editor Harvard', desc: 'Crea tu CV en el formato más aceptado' },
            ].map(tool => (
              <button key={tool.href} onClick={() => router.push(tool.href)}
                className="text-left p-4 rounded-xl bg-white border border-gray-100 hover:border-teal hover:shadow-md transition-all duration-200"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <p className="text-lg mb-1">{tool.icon}</p>
                <p className="font-sans font-[700] text-sm text-purple-dark">{tool.label}</p>
                <p className="font-sans text-xs text-gray-400 mt-0.5">{tool.desc}</p>
              </button>
            ))}
          </div>

          <div className="no-print pb-4 text-center">
            <button
              onClick={() => router.push('/')}
              className="font-sans font-[800] text-sm text-gray-400 hover:text-teal hover:opacity-80 transition-all duration-200 uppercase tracking-wider"
            >
              ← Analizar otro CV
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
