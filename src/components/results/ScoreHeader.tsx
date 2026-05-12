'use client'

import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { renderWithTerminos } from '@/lib/renderBold'
import ExportButton from '@/components/results/ExportButton'
import type { Metricas } from '@/types/analysis'

interface ScoreHeaderProps {
  score:             number
  saludo:            string
  saludoTerminos?:   string[]
  skillsDetectadas?: string[]
  metricas?:         Metricas
}

function getArcColor(score: number): string {
  if (score >= 75) return '#0DA1A4'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function getScoreLabel(score: number): { label: string; bg: string; text: string } {
  if (score >= 75) return { label: 'Bueno',     bg: '#e6f7f7', text: '#0DA1A4' }
  if (score >= 50) return { label: 'Mejorable', bg: '#fffbeb', text: '#d97706' }
  return              { label: 'Crítico',    bg: '#fff1f2', text: '#e11d48' }
}

function densidadColor(d: number): string {
  if (d >= 50) return '#10b981'
  if (d >= 25) return '#f59e0b'
  return '#ef4444'
}

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function ScoreHeader({
  score, saludo, saludoTerminos, skillsDetectadas, metricas,
}: ScoreHeaderProps) {
  const [animated, setAnimated]       = useState(false)
  const [displayScore, setDisplayScore] = useState(0)

  // Arc animation
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 150)
    return () => clearTimeout(t)
  }, [])

  // Count-up animation
  useEffect(() => {
    const duration = 1200
    const start    = performance.now()
    const frame    = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased    = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplayScore(Math.round(eased * score))
      if (progress < 1) requestAnimationFrame(frame)
    }
    const raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [score])

  // Confetti when score > 80 — fires just after count-up finishes (1200ms).
  // Uses confetti.create() with a custom canvas at z-index 9999 so it is
  // never hidden behind fixed headers or other stacking-context elements.
  useEffect(() => {
    if (score <= 80) return
    const t = setTimeout(() => {
      try {
        const canvas = document.createElement('canvas')
        Object.assign(canvas.style, {
          position: 'fixed', top: '0', left: '0',
          width: '100%', height: '100%',
          pointerEvents: 'none', zIndex: '9999',
        })
        document.body.appendChild(canvas)
        const fire = confetti.create(canvas, { resize: true, useWorker: false })
        const base = {
          particleCount: 100,
          spread: 70,
          startVelocity: 50,
          colors: ['#0DA1A4', '#01FFC6', '#092c64', '#ffffff', '#f59e0b'],
        }
        fire({ ...base, origin: { x: 0.25, y: 0.65 } })
        fire({ ...base, origin: { x: 0.75, y: 0.65 } })
        // Clean up canvas after animation ends (~4 s)
        setTimeout(() => { document.body.removeChild(canvas) }, 4000)
      } catch { /* fail silently */ }
    }, 1300)
    return () => clearTimeout(t)
  }, [score])

  const dashOffset = animated ? CIRCUMFERENCE * (1 - score / 100) : CIRCUMFERENCE
  const arcColor = getArcColor(score)
  const { label, bg, text } = getScoreLabel(score)

  const hasSkills  = skillsDetectadas && skillsDetectadas.length > 0
  const hasMetrics = metricas != null

  return (
    <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <span className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400">
          Compatibilidad ATS
        </span>
        <div className="no-print">
          <ExportButton variant="solid" />
        </div>
      </div>

      {/* Score circle + analysis text */}
      <div className="flex flex-col sm:flex-row items-start gap-6">
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="relative" style={{ width: 130, height: 130 }}>
            <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90">
              <circle cx="65" cy="65" r={RADIUS} fill="none" stroke="#eef0f2" strokeWidth="8" />
              <circle
                cx="65" cy="65" r={RADIUS}
                fill="none"
                stroke={arcColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 1.2s ease-in-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-sans font-[900] leading-none" style={{ fontSize: '2.5rem', color: arcColor }}>
                {displayScore}
              </span>
              <span className="font-sans text-gray-400 text-xs mt-0.5">/ 100</span>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <span
            className="inline-block font-sans font-[600] text-sm px-3 py-1 rounded-full mb-3"
            style={{ backgroundColor: bg, color: text }}
          >
            {label}
          </span>
          <p className="font-sans text-sm leading-relaxed text-purple-dark">
            {renderWithTerminos(saludo, saludoTerminos)}
          </p>
        </div>
      </div>

      {/* Metrics row */}
      {hasMetrics && (
        <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-3 gap-2 sm:gap-4">
          <div className="text-center">
            <p className="font-sans font-[700] text-lg text-purple-dark">
              {metricas!.palabras.toLocaleString('es-ES')}
            </p>
            <p className="font-sans text-xs text-gray-400 mt-0.5">palabras</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="font-sans font-[700] text-lg text-purple-dark">
              ~{metricas!.paginasEstimadas}
            </p>
            <p className="font-sans text-xs text-gray-400 mt-0.5">
              {metricas!.paginasEstimadas === 1 ? 'página' : 'páginas'}
            </p>
          </div>
          <div className="text-center">
            <p className="font-sans font-[700] text-lg" style={{ color: densidadColor(metricas!.densidadKeywords) }}>
              {metricas!.densidadKeywords}%
            </p>
            <p className="font-sans text-xs text-gray-400 mt-0.5">densidad keywords</p>
          </div>
        </div>
      )}

      {/* Skills tags */}
      {hasSkills && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400 mb-3">
            Skills detectadas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {skillsDetectadas!.map(skill => (
              <span
                key={skill}
                className="font-sans text-xs px-2.5 py-1 rounded-full text-teal"
                style={{ backgroundColor: '#e6f7f7', border: '1px solid #b2e8e8' }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
