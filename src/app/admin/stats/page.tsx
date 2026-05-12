'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Stats {
  cvs_analyzed:     number
  match:            number
  linkedin:         number
  editor_parse:     number
  editor_improve:   number
  editor_translate: number
  anonymize:        number
}

const ACTIONS = [
  {
    key: 'cvs_analyzed' as keyof Stats,
    label: 'Analizar CV',
    description: 'Análisis ATS completo del CV',
    gemini: true,
    color: '#0DA1A4',
    bg: '#e6f7f7',
  },
  {
    key: 'match' as keyof Stats,
    label: 'CV vs Oferta',
    description: 'Comparación CV con una oferta de empleo',
    gemini: true,
    color: '#092c64',
    bg: '#e8ecf5',
  },
  {
    key: 'linkedin' as keyof Stats,
    label: 'Análisis LinkedIn',
    description: 'Revisión de perfil de LinkedIn',
    gemini: true,
    color: '#2563eb',
    bg: '#eff6ff',
  },
  {
    key: 'editor_parse' as keyof Stats,
    label: 'Cargar CV en editor',
    description: 'Parseo del CV para el editor Harvard',
    gemini: true,
    color: '#7c3aed',
    bg: '#f5f3ff',
  },
  {
    key: 'editor_improve' as keyof Stats,
    label: 'Mejorar CV con IA',
    description: 'Aplicar sugerencias ATS al editor',
    gemini: true,
    color: '#d97706',
    bg: '#fffbeb',
  },
  {
    key: 'editor_translate' as keyof Stats,
    label: 'Traducir CV',
    description: 'Traducción del CV a otro idioma',
    gemini: true,
    color: '#059669',
    bg: '#f0fdf4',
  },
  {
    key: 'anonymize' as keyof Stats,
    label: 'Anonimizar CV',
    description: 'Eliminación de datos personales del CV',
    gemini: true,
    color: '#dc2626',
    bg: '#fff1f2',
  },
]

const PDF_ACTION = {
  label: 'Generar PDF',
  description: 'Exportación del CV a PDF (generación local en el navegador)',
  gemini: false,
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState('')

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then((data: Stats) => {
        setStats(data)
        setUpdatedAt(new Date().toLocaleTimeString('es-ES'))
      })
      .finally(() => setLoading(false))
  }, [])

  const totalCalls = stats
    ? ACTIONS.reduce((sum, a) => sum + stats[a.key], 0)
    : 0

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0ede8' }}>
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10" style={{ borderColor: '#e5e0d8' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/feedback"
              className="font-sans text-xs text-gray-400 hover:text-gray-600 transition-colors">
              ← Feedback
            </Link>
            <span className="font-sans font-[900] text-sm uppercase tracking-widest" style={{ color: '#092c64' }}>
              Uso de la API
            </span>
          </div>
          <div className="flex items-center gap-4">
            {updatedAt && (
              <span className="font-sans text-xs text-gray-400">Actualizado a las {updatedAt}</span>
            )}
            <button
              onClick={() => { setLoading(true); fetch('/api/stats').then(r => r.json()).then((data: Stats) => { setStats(data); setUpdatedAt(new Date().toLocaleTimeString('es-ES')) }).finally(() => setLoading(false)) }}
              className="font-sans font-[700] text-xs px-3 py-1.5 rounded-lg border transition-colors hover:border-teal hover:text-teal"
              style={{ borderColor: '#e5e7eb', color: '#6b7280' }}
            >
              Actualizar
            </button>
            <a
              href="https://aistudio.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans font-[700] text-xs px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#0DA1A4' }}
            >
              Ver facturación →
            </a>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 col-span-2 sm:col-span-1" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <p className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400 mb-1">CVs analizados</p>
            <p className="font-sans font-[900] text-4xl" style={{ color: '#0DA1A4' }}>
              {loading ? '—' : (stats?.cvs_analyzed ?? 0).toLocaleString('es-ES')}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <p className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400 mb-1">Total llamadas API</p>
            <p className="font-sans font-[900] text-4xl" style={{ color: '#092c64' }}>
              {loading ? '—' : totalCalls.toLocaleString('es-ES')}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <p className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400 mb-1">Acciones sin coste</p>
            <p className="font-sans font-[900] text-2xl mt-1" style={{ color: '#6b7280' }}>PDF</p>
            <p className="font-sans text-xs text-gray-400 mt-0.5">Generación local en navegador</p>
          </div>
        </div>

        {/* Action breakdown */}
        <div>
          <p className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400 mb-3">
            Desglose por acción
          </p>
          <div className="space-y-2">
            {ACTIONS.map(action => {
              const count = stats?.[action.key] ?? 0
              const pct = totalCalls > 0 ? Math.round((count / totalCalls) * 100) : 0
              return (
                <div
                  key={action.key}
                  className="bg-white rounded-xl px-5 py-4 flex items-center gap-4"
                  style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: action.bg }}
                  >
                    <span className="font-sans font-[900] text-xs" style={{ color: action.color }}>
                      AI
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-sans font-[700] text-sm" style={{ color: '#1a2744' }}>
                        {action.label}
                      </p>
                      <p className="font-sans font-[900] text-sm flex-shrink-0 ml-4" style={{ color: action.color }}>
                        {loading ? '—' : count.toLocaleString('es-ES')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: loading ? '0%' : `${pct}%`, backgroundColor: action.color }}
                        />
                      </div>
                      <span className="font-sans text-xs text-gray-400 flex-shrink-0 w-8 text-right">
                        {loading ? '' : `${pct}%`}
                      </span>
                    </div>
                    <p className="font-sans text-xs text-gray-400 mt-0.5">{action.description}</p>
                  </div>
                </div>
              )
            })}

            {/* PDF — no API cost */}
            <div
              className="bg-white rounded-xl px-5 py-4 flex items-center gap-4 opacity-50"
              style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}
            >
              <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-gray-100">
                <span className="font-sans font-[900] text-xs text-gray-400">PDF</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-sans font-[700] text-sm" style={{ color: '#1a2744' }}>{PDF_ACTION.label}</p>
                  <span className="font-sans text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 ml-4">Sin coste</span>
                </div>
                <p className="font-sans text-xs text-gray-400">{PDF_ACTION.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Billing note */}
        <div className="rounded-xl border border-dashed p-5 flex flex-col sm:flex-row sm:items-center gap-4"
          style={{ borderColor: '#d1d5db' }}>
          <div className="flex-1">
            <p className="font-sans font-[700] text-sm" style={{ color: '#1a2744' }}>
              Facturación detallada
            </p>
            <p className="font-sans text-xs text-gray-400 mt-1">
              Los contadores de arriba miden llamadas exitosas. Para ver tokens consumidos, coste exacto
              y límites de cuota, accede a Google AI Studio con la cuenta de Manfred.
            </p>
          </div>
          <a
            href="https://aistudio.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 font-sans font-[700] text-xs px-4 py-2.5 rounded-xl text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#092c64' }}
          >
            Abrir Google AI Studio →
          </a>
        </div>

      </main>
    </div>
  )
}
