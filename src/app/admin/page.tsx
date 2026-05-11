'use client'

import { useState, useRef, DragEvent, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { CVData } from '@/types/cv'
import {
  getAnonHistory,
  saveToAnonHistory,
  deleteFromAnonHistory,
  type AnonHistoryEntry,
} from '@/lib/anon-history'

const HarvardTemplate = dynamic(
  () => import('@/components/editor/HarvardTemplate'),
  { ssr: false }
)

const REDACT_OPTIONS = [
  { key: 'nombre',     label: 'Nombre completo' },
  { key: 'email',      label: 'Email' },
  { key: 'telefono',   label: 'Teléfono' },
  { key: 'direccion',  label: 'Dirección postal' },
  { key: 'linkedin',   label: 'LinkedIn / URLs personales' },
  { key: 'nacimiento', label: 'Fecha de nacimiento' },
  { key: 'dni',        label: 'DNI / Identificación' },
  { key: 'foto',       label: 'Referencia a foto' },
  { key: 'empresa',    label: 'Empresas (experiencia)' },
]

const ALL_KEYS = new Set(REDACT_OPTIONS.map(o => o.key))

export default function AnonymizePage() {
  const [file,     setFile]     = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set(ALL_KEYS))
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [cvData,   setCvData]   = useState<CVData | null>(null)
  const [history,  setHistory]  = useState<AnonHistoryEntry[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setHistory(getAnonHistory())
  }, [])

  function handleFile(f: File) {
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setError('Solo se aceptan archivos PDF.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('El archivo no puede superar los 5 MB.')
      return
    }
    setError('')
    setCvData(null)
    setFile(f)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  function toggleOption(key: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleAnonymize() {
    if (!file || selected.size === 0) return
    setLoading(true)
    setError('')

    try {
      const form = new FormData()
      form.append('pdf', file)
      form.append('fields', JSON.stringify(Array.from(selected)))

      const res = await fetch('/api/anonymize', { method: 'POST', body: form })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Error al procesar el CV.')
      }

      const { cvData: result } = await res.json()
      setCvData(result)

      saveToAnonHistory({ fileName: file.name, fieldsRedacted: Array.from(selected), cvData: result })
      setHistory(getAnonHistory())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.')
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    const style = document.createElement('style')
    style.textContent = `
      @media print {
        @page { size: A4; margin: 0; }
        body * { visibility: hidden !important; }
        #cv-print-area, #cv-print-area * { visibility: visible !important; }
        #cv-print-area { position: absolute !important; left: 0 !important; top: 0 !important; }
      }
    `
    document.head.appendChild(style)
    window.print()
    document.head.removeChild(style)
  }

  function handleReset() {
    setFile(null)
    setCvData(null)
    setError('')
  }

  function handleDelete(id: string) {
    deleteFromAnonHistory(id)
    setHistory(getAnonHistory())
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0ede8' }}>

      {/* Hidden print area — only visible during window.print() */}
      {cvData && (
        <div
          id="cv-print-area"
          style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }}
        >
          <HarvardTemplate data={cvData} />
        </div>
      )}

      {/* ── Input state ─────────────────────────────────────────────────────── */}
      {!cvData && (
        <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">

          <div>
            <h1 className="font-sans font-[900] text-2xl uppercase tracking-widest" style={{ color: '#092c64' }}>
              Anonimizador de CVs
            </h1>
            <p className="font-sans text-sm text-gray-500 mt-1">
              Sube un CV en PDF, elige qué datos eliminar y descarga la versión limpia para compartir con empresas.
            </p>
          </div>

          {/* Upload zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            className="cursor-pointer rounded-2xl p-10 text-center transition-all"
            style={{
              border: `2px dashed ${dragging ? '#0DA1A4' : '#c8c3ba'}`,
              backgroundColor: dragging ? '#e8f7f7' : '#ffffff',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />

            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e6f7f7' }}>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="#0DA1A4" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="font-sans font-[700] text-sm" style={{ color: '#092c64' }}>{file.name}</p>
                <p className="font-sans text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB · Haz clic para cambiar</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f0ede8' }}>
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <p className="font-sans font-[700] text-sm" style={{ color: '#092c64' }}>Arrastra el CV aquí</p>
                  <p className="font-sans text-xs text-gray-400 mt-0.5">o haz clic para seleccionar · Solo PDF · Máx. 5 MB</p>
                </div>
              </div>
            )}
          </div>

          {/* Options */}
          {file && (
            <div className="bg-white rounded-2xl p-6 space-y-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <p className="font-sans font-[700] text-xs uppercase tracking-widest" style={{ color: '#092c64' }}>
                Datos a eliminar
              </p>
              <div className="grid grid-cols-2 gap-3">
                {REDACT_OPTIONS.map(opt => (
                  <label
                    key={opt.key}
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => toggleOption(opt.key)}
                  >
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{
                        backgroundColor: selected.has(opt.key) ? '#092c64' : '#f3f4f6',
                        border: `2px solid ${selected.has(opt.key) ? '#092c64' : '#e5e0d8'}`,
                      }}
                    >
                      {selected.has(opt.key) && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="font-sans text-sm select-none" style={{ color: selected.has(opt.key) ? '#1a2744' : '#9ca3af' }}>
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3' }}>
              <p className="font-sans text-sm" style={{ color: '#e11d48' }}>{error}</p>
            </div>
          )}

          {/* Submit */}
          {file && (
            <button
              onClick={handleAnonymize}
              disabled={loading || selected.size === 0}
              className="w-full flex items-center justify-center gap-3 font-sans font-[700] text-sm uppercase tracking-widest py-4 rounded-2xl transition-all"
              style={{
                backgroundColor: loading || selected.size === 0 ? '#c8c3ba' : '#092c64',
                color: '#ffffff',
                cursor: loading || selected.size === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                  <path fill="currentColor" d="M12 2a10 10 0 0110 10h-3a7 7 0 00-7-7V2z" />
                </svg>
              )}
              {loading ? 'Procesando con IA...' : 'Anonimizar CV'}
            </button>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <p className="font-sans font-[700] text-xs uppercase tracking-widest flex-shrink-0" style={{ color: '#9ca3af' }}>
                  CVs recientes
                </p>
                <div className="flex-1 h-px" style={{ backgroundColor: '#e5e0d8' }} />
              </div>
              <div className="space-y-2">
                {history.map(entry => (
                  <div
                    key={entry.id}
                    className="bg-white rounded-xl px-4 py-3 flex items-center justify-between gap-4"
                    style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
                  >
                    <div className="min-w-0">
                      <p className="font-sans font-[700] text-sm truncate" style={{ color: '#1a2744' }}>
                        {entry.cvData.personalInfo.nombre || entry.fileName}
                      </p>
                      <p className="font-sans text-xs text-gray-400 mt-0.5">
                        {new Date(entry.anonymizedAt).toLocaleString('es-ES', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setCvData(entry.cvData)}
                        className="font-sans font-[700] text-xs uppercase tracking-widest px-3 py-1.5 rounded-full transition-colors"
                        style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
                      >
                        Cargar
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                        style={{ backgroundColor: '#f3f4f6', color: '#9ca3af' }}
                        title="Eliminar del historial"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      )}

      {/* ── Result state ─────────────────────────────────────────────────────── */}
      {cvData && (
        <>
          {/* Action bar */}
          <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#d1fae5' }}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-sans font-[700] text-sm" style={{ color: '#1a2744' }}>
                CV anonimizado — revisa y descarga
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="font-sans font-[700] text-xs uppercase tracking-widest px-4 py-2 rounded-full"
                style={{ backgroundColor: '#ffffff', color: '#6b7280', border: '1px solid #e5e0d8' }}
              >
                Nuevo CV
              </button>
              <button
                onClick={handlePrint}
                className="font-sans font-[700] text-xs uppercase tracking-widest px-5 py-2 rounded-full flex items-center gap-2"
                style={{ backgroundColor: '#092c64', color: '#ffffff' }}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descargar PDF
              </button>
            </div>
          </div>

          {/* Preview — full width, scrollable */}
          <div style={{ overflowX: 'auto', backgroundColor: '#dcd8d1', padding: '24px 0', minHeight: '60vh' }}>
            <div style={{
              width: '210mm',
              margin: '0 auto',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            }}>
              <HarvardTemplate data={cvData} />
            </div>
          </div>

          {/* History below preview */}
          {history.length > 0 && (
            <div className="max-w-5xl mx-auto px-6 py-8 space-y-3">
              <div className="flex items-center gap-3">
                <p className="font-sans font-[700] text-xs uppercase tracking-widest flex-shrink-0" style={{ color: '#9ca3af' }}>
                  CVs recientes
                </p>
                <div className="flex-1 h-px" style={{ backgroundColor: '#e5e0d8' }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {history.map(entry => (
                  <div
                    key={entry.id}
                    className="bg-white rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                    style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
                  >
                    <div className="min-w-0">
                      <p className="font-sans font-[700] text-sm truncate" style={{ color: '#1a2744' }}>
                        {entry.cvData.personalInfo.nombre || entry.fileName}
                      </p>
                      <p className="font-sans text-xs text-gray-400 mt-0.5">
                        {new Date(entry.anonymizedAt).toLocaleString('es-ES', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => setCvData(entry.cvData)}
                        className="font-sans font-[700] text-xs uppercase tracking-widest px-3 py-1.5 rounded-full"
                        style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
                      >
                        Cargar
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#f3f4f6', color: '#9ca3af' }}
                        title="Eliminar"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

    </div>
  )
}
