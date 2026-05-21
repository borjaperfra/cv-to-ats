'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { getLang, type Lang } from '@/components/LanguageSelector'

const LABELS = {
  es: {
    title: '¿Vale la pena esta oferta?',
    subtitle: 'Pega el texto de la oferta y te decimos lo que dice, lo que no dice y si merece tu tiempo.',
    placeholder: 'Pega aquí el texto completo de la oferta de empleo...',
    analyze: 'Analizar oferta',
    analyzing: 'Analizando...',
    errEmpty: 'Pega el texto de la oferta para continuar.',
    errShort: 'El texto es demasiado corto. Pega la oferta completa.',
    errService: 'El servicio no está disponible en este momento. Inténtalo de nuevo en unos segundos.',
    errUnknown: 'Error inesperado. Por favor, inténtalo de nuevo.',
    charCount: (n: number) => `${n.toLocaleString('es-ES')} caracteres`,
  },
  en: {
    title: 'Is this job worth it?',
    subtitle: 'Paste the job offer text and we\'ll tell you what it says, what it doesn\'t say, and whether it\'s worth your time.',
    placeholder: 'Paste the full job offer text here...',
    analyze: 'Analyse offer',
    analyzing: 'Analysing...',
    errEmpty: 'Paste the job offer text to continue.',
    errShort: 'The text is too short. Paste the full job offer.',
    errService: 'The service is not available right now. Try again in a few seconds.',
    errUnknown: 'Unexpected error. Please try again.',
    charCount: (n: number) => `${n.toLocaleString('en-GB')} characters`,
  },
}

const LOADING_MESSAGES = [
  'Leyendo entre líneas...',
  'Contando tecnologías pedidas...',
  'Buscando el salario (puede tardar)...',
  'Evaluando beneficios reales vs decorativos...',
  'Detectando señales...',
]

export default function OfertaPage() {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>('es')
  const [jdText, setJdText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [loadingMsg, setLoadingMsg] = useState('')

  useEffect(() => {
    setLang(getLang())
    const handler = (e: Event) => setLang((e as CustomEvent<Lang>).detail)
    window.addEventListener('langchange', handler)
    return () => window.removeEventListener('langchange', handler)
  }, [])

  useEffect(() => {
    if (!analyzing) return
    setLoadingMsg(LOADING_MESSAGES[0])
    let i = 1
    const interval = setInterval(() => {
      setLoadingMsg(LOADING_MESSAGES[i % LOADING_MESSAGES.length])
      i++
    }, 3000)
    return () => clearInterval(interval)
  }, [analyzing])

  const L = LABELS[lang]

  async function handleAnalyze() {
    setError('')
    const text = jdText.trim()
    if (!text) { setError(L.errEmpty); return }
    if (text.length < 100) { setError(L.errShort); return }

    setAnalyzing(true)
    try {
      const res = await fetch('/api/job-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdText: text, lang }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? L.errUnknown)
        return
      }
      sessionStorage.setItem('jobResult', JSON.stringify(data))
      router.push('/oferta/results')
    } catch {
      setError(L.errService)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-light">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

        <div className="mb-8">
          <h1 className="font-sans font-[900] text-2xl sm:text-3xl text-navy mb-3 leading-tight">
            {L.title}
          </h1>
          <p className="font-sans text-sm sm:text-base text-gray-500 leading-relaxed">
            {L.subtitle}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 sm:p-6 mb-4" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
          <textarea
            value={jdText}
            onChange={e => setJdText(e.target.value)}
            placeholder={L.placeholder}
            rows={14}
            disabled={analyzing}
            className="w-full font-sans text-sm text-purple-dark placeholder-gray-300 resize-none outline-none leading-relaxed bg-transparent"
            style={{ minHeight: 260 }}
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <span className="font-sans text-xs text-gray-300">
              {jdText.length > 0 ? L.charCount(jdText.length) : ''}
            </span>
            {jdText.length > 0 && (
              <button
                onClick={() => setJdText('')}
                disabled={analyzing}
                className="font-sans text-xs text-gray-300 hover:text-gray-400 transition-colors"
              >
                Borrar
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl font-sans text-sm"
            style={{ backgroundColor: '#fff1f2', color: '#e11d48' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={analyzing || jdText.trim().length < 10}
          className="w-full font-sans font-[700] text-sm uppercase tracking-wider py-3.5 rounded-xl transition-all duration-200"
          style={analyzing || jdText.trim().length < 10
            ? { backgroundColor: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed' }
            : { backgroundColor: '#092c64', color: '#ffffff' }}
        >
          {analyzing ? loadingMsg || L.analyzing : L.analyze}
        </button>

      </main>
    </div>
  )
}
