'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import type { LinkedInResult } from '@/types/linkedin'
import type { Suggestion } from '@/types/analysis'
import Header from '@/components/Header'
import { renderWithTerminos } from '@/lib/renderBold'
import SuggestionCard from '@/components/results/SuggestionCard'
import ExportButton from '@/components/results/ExportButton'

const PRIORITY_ORDER: Record<string, number> = { alta: 0, media: 1, baja: 2 }

function getArcColor(score: number) {
  if (score >= 75) return '#0DA1A4'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function getScoreLabel(score: number) {
  if (score >= 75) return { label: 'Buen perfil',   bg: '#e6f7f7', text: '#0DA1A4' }
  if (score >= 50) return { label: 'Mejorable',     bg: '#fffbeb', text: '#d97706' }
  return              { label: 'Necesita trabajo', bg: '#fff1f2', text: '#e11d48' }
}

const R = 52
const CIRC = 2 * Math.PI * R

export default function LinkedInResultsPage() {
  const router = useRouter()
  const [result, setResult] = useState<LinkedInResult | null>(null)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('linkedinResult')
    if (!raw) { router.replace('/linkedin'); return }
    try {
      setResult(JSON.parse(raw) as LinkedInResult)
      setTimeout(() => setAnimated(true), 150)
    } catch {
      router.replace('/linkedin')
    }
  }, [router])

  useEffect(() => {
    if (!result || result.overallScore <= 80) return
    const base = { particleCount: 90, spread: 65, startVelocity: 45,
      colors: ['#0DA1A4', '#01FFC6', '#092c64', '#ffffff', '#f59e0b'] }
    const t = setTimeout(() => {
      confetti({ ...base, origin: { x: 0.25, y: 0.65 } })
      confetti({ ...base, origin: { x: 0.75, y: 0.65 } })
    }, 1300)
    return () => clearTimeout(t)
  }, [result])

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0ede8' }}>
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

  const dashOffset = animated ? CIRC * (1 - result.overallScore / 100) : CIRC
  const arcColor = getArcColor(result.overallScore)
  const { label, bg, text } = getScoreLabel(result.overallScore)

  const allSuggestions: Suggestion[] = result.categories
    .flatMap(c => c.suggestions ?? [])
    .sort((a, b) => (PRIORITY_ORDER[a.prioridad] ?? 1) - (PRIORITY_ORDER[b.prioridad] ?? 1))

  const hasSkills = result.skillsDetectadas && result.skillsDetectadas.length > 0

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0ede8' }}>

      <Header noPrint />

      {/* Print header */}
      <div
        className="print-only items-center justify-between px-8 py-5 border-b"
        style={{ backgroundColor: '#092c64', borderColor: 'rgba(255,255,255,0.1)' }}
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
          Análisis de perfil LinkedIn
        </p>
      </div>

      <div style={{ backgroundColor: '#f0ede8' }}>
        <main className="max-w-3xl mx-auto px-6 py-8 space-y-4">

          {/* Score card */}
          <div className="bg-white rounded-2xl p-6 break-inside-avoid" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
            {/* Top bar */}
            <div className="flex items-center justify-between mb-5">
              <span className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400">
                Puntuación LinkedIn
              </span>
              <div className="no-print">
                <ExportButton variant="solid" />
              </div>
            </div>

            {/* Circle + analysis */}
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="relative" style={{ width: 130, height: 130 }}>
                  <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90">
                    <circle cx="65" cy="65" r={R} fill="none" stroke="#eef0f2" strokeWidth="8" />
                    <circle cx="65" cy="65" r={R} fill="none" stroke={arcColor} strokeWidth="8"
                      strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={dashOffset}
                      style={{ transition: 'stroke-dashoffset 1.2s ease-in-out' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-sans font-[900] leading-none" style={{ fontSize: '2.5rem', color: arcColor }}>
                      {result.overallScore}
                    </span>
                    <span className="font-sans text-gray-400 text-xs mt-0.5">/ 100</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <span className="inline-block font-sans font-[600] text-sm px-3 py-1 rounded-full mb-3"
                  style={{ backgroundColor: bg, color: text }}>
                  {label}
                </span>
                <p className="font-sans text-sm leading-relaxed" style={{ color: '#1a2744' }}>
                  {renderWithTerminos(result.saludo, result.saludoTerminos)}
                </p>
              </div>
            </div>

            {/* Completitud + skills */}
            <div className="mt-5 pt-5 border-t border-gray-100">
              {/* Completitud bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400">
                    Completitud del perfil
                  </span>
                  <span className="font-sans font-[700] text-sm" style={{ color: result.completitud >= 75 ? '#10b981' : result.completitud >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {result.completitud}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: animated ? `${result.completitud}%` : '0%',
                      backgroundColor: result.completitud >= 75 ? '#10b981' : result.completitud >= 50 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
              </div>

              {/* Skills */}
              {hasSkills && (
                <div>
                  <p className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400 mb-3">
                    Skills detectadas
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.skillsDetectadas!.map(skill => (
                      <span key={skill} className="font-sans text-xs px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: '#e6f7f7', color: '#0DA1A4', border: '1px solid #b2e8e8' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>


          {/* Section title */}
          <div className="pt-3 pb-1">
            <h2 className="font-sans font-[900] text-xl" style={{ color: '#1a2744' }}>
              Mejoras recomendadas
            </h2>
          </div>

          {/* Suggestion cards */}
          {allSuggestions.map((s, i) => (
            <div key={i} className="break-inside-avoid">
              <SuggestionCard suggestion={s} />
            </div>
          ))}

          {/* Bottom actions */}
          <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl mt-2" style={{ backgroundColor: '#092c64' }}>
            <div>
              <p className="font-sans font-[900] uppercase tracking-widest text-xs mb-1" style={{ color: '#01FFC6' }}>
                ¿También quieres mejorar tu CV?
              </p>
              <p className="font-sans font-[800] text-base leading-snug text-white">
                Analiza y optimiza tu CV para ATS
              </p>
            </div>
            <a href="/"
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] border-2 border-teal text-teal font-sans font-[900] text-xs uppercase tracking-wider hover:bg-teal hover:text-white transition-all duration-300">
              Analizar mi CV
            </a>
          </div>

          <div className="no-print pb-4 text-center">
            <a href="/linkedin" className="font-sans font-[800] text-sm text-gray-400 hover:text-teal transition-colors duration-200 uppercase tracking-wider">
              ← Analizar otro perfil
            </a>
          </div>
        </main>
      </div>
    </div>
  )
}
