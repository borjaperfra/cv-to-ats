'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { MatchResult } from '@/types/match'
import { getLang } from '@/components/LanguageSelector'
import Header from '@/components/Header'

type State = 'idle' | 'analyzing' | 'error'

const LOADING_MESSAGES = [
  'Comparando perfiles...',
  'Buscando keywords en común...',
  'Midiendo el gap de experiencia...',
  'Analizando requisitos de la oferta...',
  'Calculando el match...',
  'Revisando habilidades técnicas...',
  'Contando cuántos requisitos cumples...',
  'Preparando recomendaciones personalizadas...',
  'Consultando con el reclutador virtual...',
  'Casi listo, generando tu informe...',
]

export default function MatchPage() {
  const router = useRouter()
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0])

  // CV state
  const [hasCachedCv, setHasCachedCv] = useState(false)
  const [cachedCvName, setCachedCvName] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [hasCachedResult, setHasCachedResult] = useState(false)

  // JD state
  const [jdText, setJdText] = useState('')
  const [jdFile, setJdFile] = useState<File | null>(null)
  const jdInputRef = useRef<HTMLInputElement>(null)

  // Auto-detect if jdText is a URL (single line, starts with http/https)
  const jdIsUrl = /^https?:\/\/\S+$/.test(jdText.trim())

  useEffect(() => {
    const cached = sessionStorage.getItem('atsCvText') || localStorage.getItem('atsCvText')
    const result = sessionStorage.getItem('atsResult')
    if (cached && cached.length > 100) {
      setHasCachedCv(true)
      if (result) {
        try {
          const r = JSON.parse(result)
          setCachedCvName(r.nombre || 'Tu CV')
        } catch { setCachedCvName('Tu CV') }
      }
    }
    setHasCachedResult(!!sessionStorage.getItem('matchResult'))
  }, [])

  useEffect(() => {
    if (state !== 'analyzing') return
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length
      setLoadingMsg(LOADING_MESSAGES[i])
    }, 2200)
    return () => clearInterval(interval)
  }, [state])

  const handleAnalyze = async () => {
    const hasJd = jdText.trim().length > 10 || !!jdFile
    if (!hasJd) { setErrorMsg('Pega el texto, una URL o sube la oferta de trabajo para continuar.'); return }
    if (!jdIsUrl && jdText.trim().length > 0 && jdText.trim().length < 50) {
      setErrorMsg('El texto de la oferta parece demasiado corto. Pega el contenido completo.'); return
    }
    if (!hasCachedCv && !cvFile) { setErrorMsg('Sube tu CV para continuar.'); return }

    setState('analyzing')
    setErrorMsg('')
    setLoadingMsg(LOADING_MESSAGES[0])

    try {
      const formData = new FormData()

      if (hasCachedCv) {
        formData.append('cvText', sessionStorage.getItem('atsCvText') ?? '')
      } else if (cvFile) {
        formData.append('cvFile', cvFile)
      }

      if (jdIsUrl) {
        formData.append('jdUrl', jdText.trim())
      } else if (jdText.trim()) {
        formData.append('jdText', jdText.trim())
      } else if (jdFile) {
        formData.append('jdFile', jdFile)
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
      router.push('/match/results')
    } catch (error) {
      setState('error')
      setErrorMsg(error instanceof Error ? error.message : 'Error inesperado. Por favor, inténtalo de nuevo.')
    }
  }

  const isAnalyzing = state === 'analyzing'
  const hasJd = jdText.trim().length > 10 || !!jdFile
  const canSubmit = hasJd && (hasCachedCv || !!cvFile)

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
            ¿Tu CV encaja con
            <br />
            <span className="italic" style={{ color: '#01FFC6' }}>esta oferta?</span>
          </h1>
          <p className="font-sans text-base text-white/70 max-w-xl mx-auto">
            Compara tu CV con una oferta concreta y descubre qué keywords faltan, qué cambiar y cómo mejorar tu match.
          </p>
        </div>
      </section>

      {/* Form */}
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-5">

        {/* Cached result banner */}
        {hasCachedResult && (
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: '#e6f7f7' }}>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#0DA1A4' }}>
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-sans text-sm font-[600]" style={{ color: '#0DA1A4' }}>
                Tienes un análisis de match anterior guardado
              </p>
            </div>
            <button
              onClick={() => router.push('/match/results')}
              className="font-sans font-[700] text-xs uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors duration-200"
              style={{ backgroundColor: '#0DA1A4', color: '#ffffff' }}
            >
              Ver análisis →
            </button>
          </div>
        )}

        {/* CV section */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p className="font-sans font-[700] text-xs uppercase tracking-widest text-gray-400 mb-4">Tu CV</p>

          {hasCachedCv ? (
            <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: '#e6f7f7' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0DA1A4' }}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-sans font-[700] text-sm" style={{ color: '#0DA1A4' }}>
                    CV de {cachedCvName} cargado
                  </p>
                  <p className="font-sans text-xs text-gray-400">Del análisis anterior · no necesitas subirlo de nuevo</p>
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
            <div>
              <label
                className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed cursor-pointer transition-colors duration-200"
                style={{ borderColor: cvFile ? '#0DA1A4' : '#d1d5db', backgroundColor: cvFile ? '#e6f7f7' : 'transparent' }}
              >
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={e => setCvFile(e.target.files?.[0] ?? null)}
                />
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
            </div>
          )}
        </div>

        {/* JD section */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p className="font-sans font-[700] text-xs uppercase tracking-widest text-gray-400 mb-4">Oferta de trabajo</p>

          {/* Unified text / URL field */}
          <div className="relative">
            <textarea
              value={jdText}
              onChange={e => { setJdText(e.target.value); setJdFile(null) }}
              placeholder="Pega el texto de la oferta o una URL (https://...)"
              rows={jdIsUrl ? 2 : 8}
              className="w-full font-sans text-sm rounded-xl border px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-teal/30 transition-all"
              style={{
                borderColor: jdIsUrl ? '#0DA1A4' : '#e5e7eb',
                color: '#1a2744',
                transition: 'border-color 0.2s, height 0.2s',
              }}
            />
            {/* URL detected badge */}
            {jdIsUrl && (
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ backgroundColor: '#e6f7f7' }}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#0DA1A4' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="font-sans font-[700] text-xs" style={{ color: '#0DA1A4' }}>URL detectada</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="font-sans text-xs text-gray-400">o sube un archivo</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <label className="flex items-center gap-2 mt-3 cursor-pointer"
            style={{ opacity: jdText.trim() ? 0.4 : 1, pointerEvents: jdText.trim() ? 'none' : 'auto' }}>
            <input
              ref={jdInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={e => { setJdFile(e.target.files?.[0] ?? null); setJdText('') }}
            />
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-lg border font-sans font-[700] text-xs uppercase tracking-wider transition-colors duration-200"
              style={{
                borderColor: jdFile ? '#0DA1A4' : '#e5e7eb',
                color: jdFile ? '#0DA1A4' : '#9ca3af',
                backgroundColor: jdFile ? '#e6f7f7' : 'transparent',
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {jdFile ? jdFile.name : 'Subir PDF o DOCX'}
            </div>
            {jdFile && (
              <button
                onClick={e => { e.preventDefault(); setJdFile(null) }}
                className="font-sans text-xs text-gray-400 hover:text-red-500 underline underline-offset-2"
              >
                Quitar
              </button>
            )}
          </label>
        </div>

        {/* Error */}
        {(state === 'error' || errorMsg) && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700 font-sans text-sm">{errorMsg}</p>
          </div>
        )}

        {/* Loading */}
        {isAnalyzing && (
          <div className="flex flex-col items-center gap-4 p-8 rounded-xl bg-white border border-gray-light">
            <div className="flex gap-2">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-teal"
                  style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
            <p
              key={loadingMsg}
              className="font-sans font-[800] text-center text-base"
              style={{ color: '#1a2744', animation: 'fadeIn 0.4s ease-in' }}
            >
              {loadingMsg}
            </p>
            <p className="font-sans text-gray-400 text-xs">La IA está comparando tu perfil con la oferta</p>
          </div>
        )}

        {/* Submit */}
        {!isAnalyzing && (
          <button
            onClick={handleAnalyze}
            disabled={!canSubmit}
            className="w-full py-3.5 rounded-xl font-sans font-[900] text-sm uppercase tracking-wider transition-all duration-300 hover:opacity-80 disabled:hover:opacity-100"
            style={{
              backgroundColor: canSubmit ? '#092c64' : '#e5e7eb',
              color: canSubmit ? '#ffffff' : '#9ca3af',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            Comprobar match
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
            Análisis en segundos
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-8px); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
