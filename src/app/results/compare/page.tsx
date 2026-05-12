'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import type { ATSAnalysisResult } from '@/types/analysis'
import { getLang } from '@/components/LanguageSelector'
import Header from '@/components/Header'

type State = 'idle' | 'analyzing' | 'done' | 'error'

function ScoreDiff({ label, before, after }: { label: string; before: number; after: number }) {
  const diff = after - before
  const diffColor = diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : '#9ca3af'
  const barColor = after >= 75 ? '#10b981' : after >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between mb-2">
        <span className="font-sans text-sm" style={{ color: '#1a2744' }}>{label}</span>
        <div className="flex items-center gap-3">
          <span className="font-sans text-sm text-gray-400">{before}</span>
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-sans font-[700] text-sm" style={{ color: '#1a2744' }}>{after}</span>
          <span
            className="font-sans font-[700] text-xs px-2 py-0.5 rounded-full min-w-[48px] text-center"
            style={{
              backgroundColor: diff > 0 ? '#f0fdf4' : diff < 0 ? '#fff1f2' : '#f9fafb',
              color: diffColor,
            }}
          >
            {diff > 0 ? `+${diff}` : diff === 0 ? '=' : diff}
          </span>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${after}%`, backgroundColor: barColor }} />
      </div>
    </div>
  )
}

export default function ComparePage() {
  const router = useRouter()
  const [before, setBefore] = useState<ATSAnalysisResult | null>(null)
  const [after, setAfter] = useState<ATSAnalysisResult | null>(null)
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('atsResult')
    if (!raw) { router.replace('/'); return }
    try {
      setBefore(JSON.parse(raw))
    } catch {
      router.replace('/')
      return
    }
    // If compareAfterResult is set (comparison launched from history), skip upload
    const rawAfter = sessionStorage.getItem('compareAfterResult')
    if (rawAfter) {
      try {
        setAfter(JSON.parse(rawAfter))
        setState('done')
      } catch { /* ignore, let user upload manually */ }
      sessionStorage.removeItem('compareAfterResult')
    }
  }, [router])

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) setFile(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    maxFiles: 1,
    disabled: state === 'analyzing',
  })

  const handleAnalyze = async () => {
    if (!file) return
    setState('analyzing')
    setErrorMsg('')
    try {
      const formData = new FormData()
      formData.append('cv', file)
      formData.append('lang', getLang())
      const response = await fetch('/api/analyze', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Error al analizar el CV.')
      if (data._cvText) sessionStorage.setItem('atsCvText', data._cvText)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _cvText, ...result } = data
      result.analyzedAt = new Date().toISOString()
      setAfter(result as ATSAnalysisResult)
      setState('done')
    } catch (error) {
      setState('error')
      setErrorMsg(error instanceof Error ? error.message : 'Error inesperado.')
    }
  }

  const handleApplyNew = () => {
    if (!after) return
    sessionStorage.setItem('atsResult', JSON.stringify(after))
    router.push('/results')
  }

  if (!before) return null

  const overallDiff = after ? after.overallScore - before.overallScore : null

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0ede8' }}>
      <Header />

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-5">

        {/* Page title */}
        <div>
          <p className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400 mb-1">Comparativa</p>
          <h1 className="font-heading font-[900] text-2xl" style={{ color: '#1a2744' }}>
            Antes y después
          </h1>
          <p className="font-sans text-sm text-gray-400 mt-1">
            Sube la versión mejorada de tu CV y compara los cambios.
          </p>
        </div>

        {state !== 'done' && (
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p className="font-sans font-[700] text-xs uppercase tracking-widest text-gray-400 mb-4">
              CV mejorado
            </p>
            <div
              {...getRootProps()}
              className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed cursor-pointer transition-colors duration-200"
              style={{
                borderColor: isDragReject ? '#ef4444' : isDragActive ? '#0DA1A4' : file ? '#0DA1A4' : '#d1d5db',
                backgroundColor: isDragReject ? '#fff1f2' : isDragActive ? '#e6f7f7' : file ? '#e6f7f7' : 'transparent',
              }}
            >
              <input {...getInputProps()} />
              {isDragReject ? (
                <p className="font-sans font-[700] text-sm text-red-500">Formato no admitido</p>
              ) : isDragActive ? (
                <p className="font-sans font-[700] text-sm" style={{ color: '#0DA1A4' }}>Suelta aquí tu CV mejorado</p>
              ) : file ? (
                <div className="text-center">
                  <p className="font-sans font-[700] text-sm" style={{ color: '#0DA1A4' }}>{file.name}</p>
                  <p className="font-sans text-xs text-gray-400 mt-1">Haz clic o arrastra para cambiar</p>
                </div>
              ) : (
                <div className="text-center">
                  <svg className="w-6 h-6 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <p className="font-sans text-sm text-gray-400">Arrastra o haz clic · <span className="font-[700] text-gray-500">PDF o DOCX</span></p>
                </div>
              )}
            </div>

            {state === 'error' && (
              <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 font-sans text-sm">{errorMsg}</p>
              </div>
            )}

            {state === 'analyzing' ? (
              <div className="mt-4 flex items-center justify-center gap-3 py-3">
                <svg className="animate-spin h-5 w-5 text-teal" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <p className="font-sans text-sm text-gray-400">Analizando el nuevo CV...</p>
              </div>
            ) : (
              <button
                onClick={handleAnalyze}
                disabled={!file}
                className="mt-4 w-full py-3 rounded-xl font-sans font-[900] text-sm uppercase tracking-wider transition-all duration-300"
                style={{
                  backgroundColor: file ? '#092c64' : '#e5e7eb',
                  color: file ? '#ffffff' : '#9ca3af',
                  cursor: file ? 'pointer' : 'not-allowed',
                }}
              >
                Comparar versiones
              </button>
            )}
          </div>
        )}

        {/* Results comparison */}
        {state === 'done' && after && (
          <>
            {/* Overall score diff */}
            <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
              <p className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400 mb-5">
                Puntuación global
              </p>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <p className="font-sans text-xs text-gray-400 mb-1">Antes</p>
                  <p className="font-sans font-[900] text-3xl sm:text-4xl" style={{ color: '#9ca3af' }}>
                    {before.overallScore}
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  {overallDiff !== null && (
                    <span
                      className="font-sans font-[900] text-sm px-3 py-1 rounded-full mt-1"
                      style={{
                        backgroundColor: overallDiff > 0 ? '#f0fdf4' : overallDiff < 0 ? '#fff1f2' : '#f9fafb',
                        color: overallDiff > 0 ? '#10b981' : overallDiff < 0 ? '#ef4444' : '#9ca3af',
                      }}
                    >
                      {overallDiff > 0 ? `+${overallDiff}` : overallDiff === 0 ? 'Sin cambios' : overallDiff}
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <p className="font-sans text-xs text-gray-400 mb-1">Después</p>
                  <p
                    className="font-sans font-[900] text-3xl sm:text-4xl"
                    style={{ color: after.overallScore >= 75 ? '#10b981' : after.overallScore >= 50 ? '#f59e0b' : '#ef4444' }}
                  >
                    {after.overallScore}
                  </p>
                </div>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <p className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400 mb-4">
                Desglose por categoría
              </p>
              {after.categories.map((cat, i) => {
                const beforeCat = before.categories[i]
                return (
                  <ScoreDiff
                    key={i}
                    label={cat.category}
                    before={beforeCat?.score ?? 0}
                    after={cat.score}
                  />
                )
              })}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleApplyNew}
                className="flex-1 py-3 rounded-xl font-sans font-[900] text-sm uppercase tracking-wider text-white transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#092c64' }}
              >
                Ver informe completo del nuevo CV
              </button>
              <button
                onClick={() => router.push('/results')}
                className="flex-1 py-3 rounded-xl font-sans font-[700] text-sm uppercase tracking-wider border-2 border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors"
              >
                Volver al anterior
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
