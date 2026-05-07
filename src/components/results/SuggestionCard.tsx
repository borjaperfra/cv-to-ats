'use client'

import { useState } from 'react'
import type { Suggestion } from '@/types/analysis'
import { renderWithTerminos } from '@/lib/renderBold'

interface SuggestionCardProps {
  suggestion: Suggestion
}

const priorityConfig = {
  alta:  { label: 'alta',  dot: '#ef4444', text: '#9ca3af' },
  media: { label: 'media', dot: '#f59e0b', text: '#9ca3af' },
  baja:  { label: 'baja',  dot: '#10b981', text: '#9ca3af' },
}

function buildCopyText(titulo: string, pasos: Suggestion['pasos'], priorityLabel: string): string {
  const lines = [`[${priorityLabel}] ${titulo}`, '']
  pasos.forEach(paso => lines.push(`• ${paso.texto}`))
  return lines.join('\n')
}

export default function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const [copied, setCopied] = useState(false)
  const [copiedStep, setCopiedStep] = useState<number | null>(null)

  const handleCopyStep = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedStep(index)
      setTimeout(() => setCopiedStep(null), 2000)
    })
  }

  const p = priorityConfig[suggestion.prioridad] ?? priorityConfig.media
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const titulo = suggestion.titulo ?? (suggestion as any).texto ?? ''
  const pasos  = suggestion.pasos ?? []

  const handleCopy = () => {
    const text = buildCopyText(titulo, pasos, p.label)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      className="bg-white rounded-2xl p-6 group"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      {/* Header row: dot + priority label + title + copy button */}
      <div className="flex items-start gap-2 mb-4">
        <span
          className="flex-shrink-0 rounded-full mt-[7px]"
          style={{ width: 8, height: 8, backgroundColor: p.dot }}
        />
        <span
          className="font-sans font-[700] text-xs uppercase tracking-wide flex-shrink-0 mt-[3px]"
          style={{ color: p.text }}
        >
          {p.label}
        </span>
        <h3
          className="font-sans font-[700] text-base leading-snug flex-1"
          style={{ color: '#1a2744' }}
        >
          {titulo}
        </h3>

        {/* Copy button — visible on hover (or always on touch devices) */}
        <button
          onClick={handleCopy}
          title="Copiar sugerencia"
          className="no-print flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-1"
          style={{
            backgroundColor: copied ? '#e6f7f7' : '#f9fafb',
            color: copied ? '#0DA1A4' : '#9ca3af',
            border: '1px solid',
            borderColor: copied ? '#b2e8e8' : '#e5e7eb',
          }}
        >
          {copied ? (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-sans font-[700] text-xs">Copiado</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="font-sans font-[700] text-xs">Copiar</span>
            </>
          )}
        </button>
      </div>

      {/* Bullet steps */}
      <ul className="space-y-2.5">
        {pasos.map((paso, i) => (
          <li key={i} className="group/step flex items-start gap-2.5">
            <span
              className="flex-shrink-0 rounded-full bg-gray-300"
              style={{ width: 5, height: 5, marginTop: 9 }}
            />
            <p className="font-sans text-sm leading-relaxed flex-1" style={{ color: '#374151' }}>
              {renderWithTerminos(paso.texto, paso.terminos)}
            </p>
            <button
              onClick={() => handleCopyStep(paso.texto, i)}
              title="Copiar paso"
              className="no-print flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-md opacity-0 group-hover/step:opacity-100 transition-opacity duration-200 mt-0.5"
              style={{
                backgroundColor: copiedStep === i ? '#e6f7f7' : '#f9fafb',
                color: copiedStep === i ? '#0DA1A4' : '#9ca3af',
                border: '1px solid',
                borderColor: copiedStep === i ? '#b2e8e8' : '#e5e7eb',
              }}
            >
              {copiedStep === i ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
