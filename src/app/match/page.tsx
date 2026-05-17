'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { MatchResult } from '@/types/match'
import { getLang, type Lang } from '@/components/LanguageSelector'
import Header from '@/components/Header'

type State = 'idle' | 'analyzing' | 'error'
type BatchState = 'idle' | 'loading' | 'done'

interface ManfredOffer {
  id: number
  position: string
  slug: string
  salaryFrom: number
  salaryTo: number
  currency: string
  remotePercentage: number
  isFreelance: boolean
  feeRateFrom: number
  feeRateTo: number
  highlights: string[]
  locations: string[]
  company: { name: string; logoUrl: string }
}

function formatSalary(offer: ManfredOffer): string | null {
  const { isFreelance, feeRateFrom, feeRateTo, salaryFrom, salaryTo, currency } = offer
  if (isFreelance) {
    if (!feeRateFrom && !feeRateTo) return null
    if (feeRateFrom && feeRateTo && feeRateFrom !== feeRateTo) return `${feeRateFrom}–${feeRateTo} ${currency}/h`
    return `${feeRateFrom || feeRateTo} ${currency}/h`
  }
  if (!salaryFrom && !salaryTo) return null
  const k = (n: number) => `${Math.round(n / 1000)}k`
  if (salaryFrom && salaryTo && salaryFrom !== salaryTo) return `${k(salaryFrom)}–${k(salaryTo)} ${currency}`
  if (salaryFrom && !salaryTo) return `desde ${k(salaryFrom)} ${currency}`
  return `hasta ${k(salaryTo)} ${currency}`
}

function formatLocation(remotePercentage: number, locations: string[]): string {
  const city = locations[0] ?? ''
  if (remotePercentage >= 100) return '100% remoto'
  if (remotePercentage > 0) return city ? `Híbrido · ${city}` : 'Híbrido'
  return city ? `Presencial · ${city}` : 'Presencial'
}

const TITLE_STOP = new Set(['and', 'the', 'for', 'with', 'de', 'of', 'en', 'a', 'an'])

function titleWords(s: string): string[] {
  // Min length 2 so acronyms like QA, AI, ML, UX are kept and not filtered out
  return s.toLowerCase().split(/[\s/,\-]+/).filter(w => w.length >= 2 && !TITLE_STOP.has(w))
}

function skillInText(skill: string, text: string): boolean {
  // Word-boundary match prevents 'R' or 'C' from matching inside 'engineer', 'architect', etc.
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text)
}

function preScoreOffer(offer: ManfredOffer, skills: string[], cvRole: string): number {
  const positionLower = offer.position.toLowerCase()

  if (cvRole) {
    // Primary signal (70 pts): bidirectional role-title matching
    // highlights are company perks (emojis/benefits), not tech requirements — ignored
    const offerWords = titleWords(offer.position)
    const roleWords = titleWords(cvRole)
    let roleScore = 0
    if (offerWords.length > 0 && roleWords.length > 0) {
      const offerInRole = offerWords.filter(w => cvRole.toLowerCase().includes(w)).length / offerWords.length
      const roleInOffer = roleWords.filter(w => positionLower.includes(w)).length / roleWords.length
      roleScore = Math.max(offerInRole, roleInOffer) * 70
    }
    // Secondary signal (30 pts): whole-word skill matches in offer title
    const skillHits = skills.filter(s => skillInText(s, positionLower)).length
    const skillScore = Math.min(skillHits / 3, 1) * 30
    return Math.round(Math.min(roleScore + skillScore, 100))
  }

  // Fallback when no role info: skills vs position+highlights, capped denominator
  const haystack = [offer.position, ...offer.highlights].join(' ').toLowerCase()
  const hits = skills.filter(s => skillInText(s, haystack)).length
  if (!hits) return 0
  return Math.round(Math.min(hits / Math.min(skills.length, 8), 1) * 100)
}

const LOADING_MESSAGES = {
  es: [
    'Comparando perfiles...',
    'Vectorizando keywords de la oferta...',
    'Midiendo el gap de experiencia...',
    'Calculando distancia semántica CV-JD...',
    'Calculando el match...',
    'Revisando habilidades técnicas...',
    'Identificando requisitos excluyentes...',
    'Preparando recomendaciones personalizadas...',
    'Clasificando keywords por relevancia...',
    'Casi listo, generando tu informe...',
  ],
  en: [
    'Comparing profiles...',
    'Vectorising job offer keywords...',
    'Measuring the experience gap...',
    'Calculating CV-JD semantic distance...',
    'Calculating the match...',
    'Reviewing technical skills...',
    'Identifying knockout requirements...',
    'Preparing personalised recommendations...',
    'Classifying keywords by relevance...',
    'Almost done, generating your report...',
  ],
}

const LABELS = {
  es: {
    tagline: 'Herramienta Gratuita de Manfred',
    h1a: '¿Tu CV encaja con',
    h1b: 'esta oferta?',
    subtitle: 'Compara tu CV con una oferta concreta y descubre qué keywords faltan, qué cambiar y cómo mejorar tu match.',
    cachedResultText: 'Tienes un análisis de match anterior guardado',
    seeAnalysis: 'Ver análisis →',
    cvSection: 'Tu CV',
    cvLoaded: (name: string) => `CV de ${name} cargado`,
    cvLoadedHint: 'Del análisis anterior · no necesitas subirlo de nuevo',
    change: 'Cambiar',
    clickToChange: 'Haz clic para cambiar',
    uploadCv: 'Sube tu CV',
    uploadFormat: 'PDF o DOCX',
    jdSection: 'Oferta de trabajo',
    jdPlaceholder: 'Pega el texto de la oferta o una URL (https://...)',
    orUpload: 'o sube un archivo',
    urlDetected: 'URL detectada',
    uploadFile: 'Subir PDF o DOCX',
    remove: 'Quitar',
    loadingHint: 'La IA está comparando tu perfil con la oferta',
    submit: 'Comprobar match',
    batchPre: '¿Tienes varias ofertas?',
    batchCta: 'Compara todas a la vez →',
    noStorage: 'Tu CV no se almacena',
    fastAnalysis: 'Análisis en segundos',
    checkingSkills: 'Revisando tu encaje con las ofertas de Manfred...',
    batchMatchCta: 'Ver mi match con las mejores ofertas de Manfred',
    batchMatchSubtext: 'Analizaremos tu encaje con las 5 ofertas más afines a tu perfil',
    batchMatchProgress: (done: number, total: number) => `Analizando ${done} de ${total} ofertas...`,
    batchMatchDone: (n: number) => `${n} ofertas analizadas · ordenadas por compatibilidad`,
    batchMatchViewFull: 'Ver análisis completo',
    batchMatchNew: 'Nuevo análisis',
    locationWarningTitle: 'Residencia en España requerida',
    locationWarningBody: (country: string) => `Hemos detectado que tu CV está vinculado a ${country}. Todas las ofertas de Manfred son en España y requieren residencia legal para formalizar contrato. Lamentablemente no podremos tener en cuenta tu candidatura.`,
    errNoJd: 'Pega el texto, una URL o sube la oferta de trabajo para continuar.',
    errShortJd: 'El texto de la oferta parece demasiado corto. Pega el contenido completo.',
    errNoCv: 'Sube tu CV para continuar.',
    errService: 'El servicio no está disponible en este momento. Inténtalo de nuevo en unos segundos.',
    errMatch: 'Error al analizar el match.',
    errUnknown: 'Error inesperado. Por favor, inténtalo de nuevo.',
  },
  en: {
    tagline: 'Free Manfred Tool',
    h1a: 'Does your CV match',
    h1b: 'this job offer?',
    subtitle: 'Compare your CV against a specific job and find out which keywords are missing, what to change and how to improve your match.',
    cachedResultText: 'You have a previous match analysis saved',
    seeAnalysis: 'See analysis →',
    cvSection: 'Your CV',
    cvLoaded: (name: string) => `CV of ${name} loaded`,
    cvLoadedHint: 'From the previous analysis · no need to upload again',
    change: 'Change',
    clickToChange: 'Click to change',
    uploadCv: 'Upload your CV',
    uploadFormat: 'PDF or DOCX',
    jdSection: 'Job offer',
    jdPlaceholder: 'Paste the job description or a URL (https://...)',
    orUpload: 'or upload a file',
    urlDetected: 'URL detected',
    uploadFile: 'Upload PDF or DOCX',
    remove: 'Remove',
    loadingHint: 'AI is comparing your profile against the job offer',
    submit: 'Check match',
    batchPre: 'Have several offers?',
    batchCta: 'Compare them all at once →',
    noStorage: 'Your CV is not stored',
    fastAnalysis: 'Analysis in seconds',
    checkingSkills: 'Checking your fit with Manfred offers...',
    batchMatchCta: 'See my match with the best Manfred offers',
    batchMatchSubtext: 'We will analyse your fit with the 5 offers most aligned to your profile',
    batchMatchProgress: (done: number, total: number) => `Analysing ${done} of ${total} offers...`,
    batchMatchDone: (n: number) => `${n} offers analysed · sorted by compatibility`,
    batchMatchViewFull: 'See full analysis',
    batchMatchNew: 'New analysis',
    locationWarningTitle: 'Spanish residency required',
    locationWarningBody: (country: string) => `We detected your CV is linked to ${country}. All Manfred offers are based in Spain and require legal residency to sign a contract. Unfortunately we won't be able to consider your application.`,
    errNoJd: 'Paste the text, a URL or upload the job offer to continue.',
    errShortJd: 'The job description seems too short. Paste the full content.',
    errNoCv: 'Upload your CV to continue.',
    errService: 'The service is not available right now. Please try again in a few seconds.',
    errMatch: 'Error analysing the match.',
    errUnknown: 'Unexpected error. Please try again.',
  },
}

function OfferLogo({ name, logoUrl }: { name: string; logoUrl: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      {logoUrl && !failed ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={logoUrl} alt="" className="w-full h-full object-contain p-1" onError={() => setFailed(true)} />
      ) : (
        <span className="font-sans font-[900] text-xs text-gray-400">{name.slice(0, 2).toUpperCase()}</span>
      )}
    </div>
  )
}

function matchBadgeStyle(pct: number) {
  if (pct >= 80) return { bg: '#dcfce7', color: '#15803d', border: '#86efac' }
  if (pct >= 40) return { bg: '#fef3c7', color: '#b45309', border: '#fcd34d' }
  return              { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' }
}

export default function MatchPage() {
  const router = useRouter()
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [lang, setLang] = useState<Lang>('es')
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES.es[0])

  // CV state
  const [hasCachedCv, setHasCachedCv] = useState(false)
  const [cachedCvName, setCachedCvName] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [hasCachedResult, setHasCachedResult] = useState(false)
  const [isDraggingCv, setIsDraggingCv] = useState(false)
  const [loadingSkills, setLoadingSkills] = useState(false)
  const [locationWarning, setLocationWarning] = useState<string | null>(null)
  const [cvRole, setCvRole] = useState('')

  // JD state
  const [jdText, setJdText] = useState('')
  const [jdFile, setJdFile] = useState<File | null>(null)
  const jdInputRef = useRef<HTMLInputElement>(null)

  // Manfred offers
  const [manfredOffers, setManfredOffers] = useState<ManfredOffer[]>([])
  const [loadingOffers, setLoadingOffers] = useState(true)
  const [skillsDetectadas, setSkillsDetectadas] = useState<string[]>([])

  // Batch match
  const [batchState, setBatchState] = useState<BatchState>('idle')
  const [batchProgress, setBatchProgress] = useState(0)
  const [batchTotal, setBatchTotal] = useState(0)
  const [batchResults, setBatchResults] = useState<Array<{ offer: ManfredOffer; result: MatchResult | null }>>([])

  const jdIsUrl = /^https?:\/\/\S+$/.test(jdText.trim())

  useEffect(() => {
    setLang(getLang())

    const cached = sessionStorage.getItem('atsCvText') || localStorage.getItem('atsCvText')
    const result = sessionStorage.getItem('atsResult')
    if (cached && cached.length > 100) {
      setHasCachedCv(true)
      if (result) {
        try {
          const r = JSON.parse(result)
          setCachedCvName(r.nombre || localStorage.getItem('atsCvName') || 'CV')
        } catch { setCachedCvName(localStorage.getItem('atsCvName') || 'CV') }
      } else {
        setCachedCvName(localStorage.getItem('atsCvName') || 'CV')
      }
    }
    setHasCachedResult(!!sessionStorage.getItem('matchResult'))

    try {
      const atsRaw = sessionStorage.getItem('atsResult')
      if (atsRaw) {
        const ats = JSON.parse(atsRaw)
        if (Array.isArray(ats.skillsDetectadas)) setSkillsDetectadas(ats.skillsDetectadas)
      } else {
        const matchSkills = sessionStorage.getItem('matchSkills')
        if (matchSkills) setSkillsDetectadas(JSON.parse(matchSkills))
      }

      const storedRole = sessionStorage.getItem('cvRole')
      if (storedRole) {
        setCvRole(storedRole)
      } else if (atsRaw) {
        // ATS result exists but no role cached — extract role from cached CV text silently
        const cachedCvText = sessionStorage.getItem('atsCvText') || localStorage.getItem('atsCvText')
        if (cachedCvText && cachedCvText.length > 100) {
          setLoadingSkills(true)
          const fd = new FormData()
          fd.append('cvText', cachedCvText.slice(0, 6000))
          fetch('/api/cv-preview', { method: 'POST', body: fd })
            .then(r => r.ok ? r.json() : { role: '' })
            .then(({ role }: { role: string }) => {
              if (role) { setCvRole(role); sessionStorage.setItem('cvRole', role) }
            })
            .catch(() => {})
            .finally(() => setLoadingSkills(false))
        }
      }
    } catch { /* ignore */ }

    const pendingUrl = sessionStorage.getItem('pendingMatchUrl')
    if (pendingUrl) {
      setJdText(pendingUrl)
      sessionStorage.removeItem('pendingMatchUrl')
    }
  }, [])

  useEffect(() => {
    const handler = (e: Event) => setLang((e as CustomEvent<Lang>).detail)
    window.addEventListener('langchange', handler)
    return () => window.removeEventListener('langchange', handler)
  }, [])

  useEffect(() => {
    if (!cvFile) {
      setSkillsDetectadas([])
      setLocationWarning(null)
      return
    }
    setLoadingSkills(true)
    setSkillsDetectadas([])
    setCvRole('')
    setLocationWarning(null)
    const fd = new FormData()
    fd.append('cvFile', cvFile)
    fetch('/api/cv-preview', { method: 'POST', body: fd })
      .then(r => r.ok ? r.json() : { role: '', skills: [], country: null })
      .then(({ role, skills, country }: { role: string; skills: string[]; country: string | null }) => {
        if (role) { setCvRole(role); sessionStorage.setItem('cvRole', role) }
        if (Array.isArray(skills) && skills.length > 0) {
          setSkillsDetectadas(skills)
          sessionStorage.setItem('matchSkills', JSON.stringify(skills))
        }
        if (country && !/(spain|españa)/i.test(country)) {
          setLocationWarning(country)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSkills(false))
  }, [cvFile])

  useEffect(() => {
    fetch('/api/manfred-offers')
      .then(r => r.ok ? r.json() : [])
      .then((data: ManfredOffer[]) => {
        if (!Array.isArray(data)) return
        setManfredOffers(data)
      })
      .catch(() => {})
      .finally(() => setLoadingOffers(false))
  }, [])

  useEffect(() => {
    if (state !== 'analyzing') return
    const messages = LOADING_MESSAGES[lang]
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % messages.length
      setLoadingMsg(messages[i])
    }, 2200)
    return () => clearInterval(interval)
  }, [state, lang])

  const L = LABELS[lang]

  const handleAnalyze = async () => {
    const hasJd = jdText.trim().length > 10 || !!jdFile
    if (!hasJd) { setErrorMsg(L.errNoJd); return }
    if (!jdIsUrl && jdText.trim().length > 0 && jdText.trim().length < 50) {
      setErrorMsg(L.errShortJd); return
    }
    if (!hasCachedCv && !cvFile) { setErrorMsg(L.errNoCv); return }

    setState('analyzing')
    setErrorMsg('')
    setLoadingMsg(LOADING_MESSAGES[lang][0])

    try {
      const formData = new FormData()

      if (hasCachedCv) {
        formData.append('cvText', sessionStorage.getItem('atsCvText') || localStorage.getItem('atsCvText') || '')
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
      formData.append('lang', lang)

      const response = await fetch('/api/match', { method: 'POST', body: formData })
      const ct = response.headers.get('content-type') ?? ''
      if (!ct.includes('application/json')) {
        throw new Error(L.errService)
      }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || L.errMatch)

      const matchResult = data as MatchResult
      sessionStorage.setItem('matchResult', JSON.stringify(matchResult))
      if (Array.isArray(matchResult.keywordsPresentes) && matchResult.keywordsPresentes.length > 0) {
        sessionStorage.setItem('matchSkills', JSON.stringify(matchResult.keywordsPresentes))
      }
      if (jdIsUrl) sessionStorage.setItem('matchJdUrl', jdText.trim())
      else sessionStorage.removeItem('matchJdUrl')
      router.push('/match/results')
    } catch (error) {
      setState('error')
      setErrorMsg(error instanceof Error ? error.message : L.errUnknown)
    }
  }

  const handleSelectOffer = (offer: ManfredOffer) => {
    setJdText(`https://www.getmanfred.com/es/ofertas-empleo/${offer.id}/${offer.slug}`)
    setJdFile(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBatchMatch = async () => {
    const cvText = sessionStorage.getItem('atsCvText') || localStorage.getItem('atsCvText') || ''
    if (!cvText && !cvFile) return

    const hasProfile = skillsDetectadas.length > 0 || cvRole.length > 0
    const sorted = hasProfile
      ? [...manfredOffers].sort((a, b) => preScoreOffer(b, skillsDetectadas, cvRole) - preScoreOffer(a, skillsDetectadas, cvRole))
      : manfredOffers
    const top5 = sorted.slice(0, 5)

    setBatchState('loading')
    setBatchProgress(0)
    setBatchTotal(top5.length)
    setBatchResults([])

    const results: Array<{ offer: ManfredOffer; result: MatchResult | null }> = []

    for (const offer of top5) {
      try {
        const offerRes = await fetch(`/api/manfred-offer-text?id=${offer.id}&slug=${offer.slug}`)
        const offerData = offerRes.ok ? await offerRes.json() as { text: string } : { text: '' }
        const jdOfferText = offerData.text || ''

        const formData = new FormData()
        if (cvText) {
          formData.append('cvText', cvText)
        } else if (cvFile) {
          formData.append('cvFile', cvFile)
        }
        formData.append('jdText', jdOfferText)
        formData.append('lang', lang)

        const matchRes = await fetch('/api/match', { method: 'POST', body: formData })
        if (matchRes.ok) {
          const matchData = await matchRes.json() as MatchResult
          results.push({ offer, result: matchData })
        } else {
          results.push({ offer, result: null })
        }
      } catch {
        results.push({ offer, result: null })
      }
      setBatchProgress(results.length)
    }

    results.sort((a, b) => (b.result?.matchScore ?? 0) - (a.result?.matchScore ?? 0))
    setBatchResults(results)
    setBatchState('done')
  }

  const isAnalyzing = state === 'analyzing'
  const hasJd = jdText.trim().length > 10 || !!jdFile
  const canSubmit = hasJd && (hasCachedCv || !!cvFile)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0ede8' }}>

      <Header />

      {/* Hero */}
      <section className="bg-navy text-white py-8 sm:py-14 px-6">
        <div className="max-w-container mx-auto text-center">
          <p className="font-sans font-[900] uppercase tracking-widest text-neon text-xs mb-5">
            {L.tagline}
          </p>
          <h1 className="font-heading font-[900] text-3xl sm:text-4xl md:text-5xl leading-tight mb-4">
            {L.h1a}
            <br />
            <span className="italic" style={{ color: '#01FFC6' }}>{L.h1b}</span>
          </h1>
          <p className="font-sans text-base text-white/70 max-w-xl mx-auto">
            {L.subtitle}
          </p>
        </div>
      </section>

      {/* Form */}
      <main className="max-w-2xl mx-auto px-6 py-6 sm:py-10 space-y-5">

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
                {L.cachedResultText}
              </p>
            </div>
            <button
              onClick={() => router.push('/match/results')}
              className="font-sans font-[700] text-xs uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors duration-200"
              style={{ backgroundColor: '#0DA1A4', color: '#ffffff' }}
            >
              {L.seeAnalysis}
            </button>
          </div>
        )}

        {/* CV section */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p className="font-sans font-[700] text-xs uppercase tracking-widest text-gray-400 mb-4">{L.cvSection}</p>

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
                    {L.cvLoaded(cachedCvName)}
                  </p>
                  <p className="font-sans text-xs text-gray-400">{L.cvLoadedHint}</p>
                </div>
              </div>
              <button
                onClick={() => { setHasCachedCv(false); setSkillsDetectadas([]); setCvRole(''); setLocationWarning(null); sessionStorage.removeItem('matchSkills'); sessionStorage.removeItem('cvRole') }}
                className="font-sans text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
              >
                {L.change}
              </button>
            </div>
          ) : (
            <div>
              <label
                className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed cursor-pointer transition-colors duration-200"
                style={{
                  borderColor: isDraggingCv || cvFile ? '#0DA1A4' : '#d1d5db',
                  backgroundColor: isDraggingCv ? '#d0f4f4' : cvFile ? '#e6f7f7' : 'transparent',
                }}
                onDragOver={e => { e.preventDefault(); setIsDraggingCv(true) }}
                onDragLeave={() => setIsDraggingCv(false)}
                onDrop={e => {
                  e.preventDefault()
                  setIsDraggingCv(false)
                  const file = e.dataTransfer.files?.[0]
                  if (file) setCvFile(file)
                }}
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
                    <p className="font-sans text-xs text-gray-400 mt-1">{L.clickToChange}</p>
                  </div>
                ) : isDraggingCv ? (
                  <div className="text-center">
                    <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#0DA1A4' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <p className="font-sans text-sm font-[700]" style={{ color: '#0DA1A4' }}>Suelta aquí tu CV</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <svg className="w-6 h-6 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <p className="font-sans text-sm text-gray-400">{L.uploadCv} <span className="font-[700] text-gray-500">{L.uploadFormat}</span></p>
                  </div>
                )}
              </label>
            </div>
          )}
        </div>

        {/* Skills loading banner — shown right below CV so it's immediately visible */}
        {loadingSkills && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: '#e6f7f7', border: '1px solid #b2e8e8' }}>
            <svg className="animate-spin h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" style={{ color: '#0DA1A4' }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="font-sans text-sm font-[600]" style={{ color: '#0DA1A4' }}>{L.checkingSkills}</p>
          </div>
        )}

        {/* Location warning */}
        {locationWarning && (
          <div className="flex items-start gap-3 p-4 rounded-xl" style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}>
            <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5" style={{ backgroundColor: '#ffedd5' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#c2410c' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-sans font-[700] text-sm mb-0.5" style={{ color: '#c2410c' }}>{L.locationWarningTitle}</p>
              <p className="font-sans text-sm leading-relaxed" style={{ color: '#9a3412' }}>{L.locationWarningBody(locationWarning)}</p>
            </div>
          </div>
        )}

        {/* JD section */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p className="font-sans font-[700] text-xs uppercase tracking-widest text-gray-400 mb-4">{L.jdSection}</p>

          <div className="relative">
            <textarea
              value={jdText}
              onChange={e => { setJdText(e.target.value); setJdFile(null) }}
              placeholder={L.jdPlaceholder}
              rows={jdIsUrl ? 2 : 8}
              className="w-full font-sans text-sm rounded-xl border px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-teal/30 transition-all"
              style={{
                borderColor: jdIsUrl ? '#0DA1A4' : '#e5e7eb',
                color: '#1a2744',
                transition: 'border-color 0.2s, height 0.2s',
              }}
            />
            {jdIsUrl && (
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ backgroundColor: '#e6f7f7' }}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#0DA1A4' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="font-sans font-[700] text-xs" style={{ color: '#0DA1A4' }}>{L.urlDetected}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="font-sans text-xs text-gray-400">{L.orUpload}</span>
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
              {jdFile ? jdFile.name : L.uploadFile}
            </div>
            {jdFile && (
              <button
                onClick={e => { e.preventDefault(); setJdFile(null) }}
                className="font-sans text-xs text-gray-400 hover:text-red-500 underline underline-offset-2"
              >
                {L.remove}
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
            <p className="font-sans text-gray-400 text-xs">{L.loadingHint}</p>
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
            {L.submit}
          </button>
        )}

        {/* Batch match */}
        {!isAnalyzing && (hasCachedCv || !!cvFile) && (
          <div>
            {batchState === 'idle' && (
              <>
                <button
                  onClick={handleBatchMatch}
                  className="w-full py-3 rounded-xl font-sans font-[800] text-sm uppercase tracking-wider transition-opacity hover:opacity-80"
                  style={{ backgroundColor: '#092c64', color: '#01FFC6' }}
                >
                  {L.batchMatchCta}
                </button>
                <p className="font-sans text-xs text-gray-400 text-center mt-2">{L.batchMatchSubtext}</p>
              </>
            )}
            {batchState === 'loading' && (
              <>
                <div className="flex items-center gap-3 py-2 mb-3">
                  <svg className="animate-spin h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" style={{ color: '#0DA1A4' }}>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <p className="font-sans text-sm font-[600]" style={{ color: '#0DA1A4' }}>{L.batchMatchProgress(batchProgress, batchTotal)}</p>
                </div>
                <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${batchTotal > 0 ? (batchProgress / batchTotal) * 100 : 0}%`, backgroundColor: '#0DA1A4' }}
                  />
                </div>
              </>
            )}
            {batchState === 'done' && batchResults.length > 0 && (
              <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-sans font-[700] text-xs uppercase tracking-widest text-gray-400">
                    {L.batchMatchDone(batchResults.filter(r => r.result !== null).length)}
                  </p>
                  <button
                    onClick={() => { setBatchState('idle'); setBatchResults([]) }}
                    className="font-sans text-xs text-gray-400 hover:text-teal underline underline-offset-2 transition-colors duration-200"
                  >
                    {L.batchMatchNew}
                  </button>
                </div>
                <div className="space-y-2">
                  {batchResults.map(({ offer, result }) => {
                    if (!result) return null
                    const ms = matchBadgeStyle(result.matchScore)
                    const offerUrl = `https://www.getmanfred.com/es/ofertas-empleo/${offer.id}/${offer.slug}`
                    return (
                      <div key={offer.id} className="rounded-xl border p-3" style={{ backgroundColor: '#fafafa', borderColor: result.matchScore >= 80 ? '#86efac' : '#ede9e3' }}>
                        <div className="flex items-center gap-3">
                          <OfferLogo name={offer.company.name} logoUrl={offer.company.logoUrl} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-sans font-[700] text-sm text-navy leading-snug">{offer.position}</p>
                              <span className="font-sans font-[800] text-[11px] px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: ms.bg, color: ms.color, border: `1px solid ${ms.border}` }}>
                                {result.matchScore}%
                              </span>
                            </div>
                            <p className="font-sans text-xs text-gray-400 mt-0.5">{offer.company.name}</p>
                          </div>
                          <button
                            onClick={() => {
                              sessionStorage.setItem('matchResult', JSON.stringify(result))
                              sessionStorage.setItem('matchJdUrl', offerUrl)
                              router.push('/match/results')
                            }}
                            className="flex-shrink-0 font-sans font-[700] text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 whitespace-nowrap"
                            style={{ backgroundColor: '#092c64', color: '#ffffff' }}
                          >
                            {L.batchMatchViewFull}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manfred offers */}
        {(loadingOffers || manfredOffers.length > 0) && (() => {
          const hasProfile = skillsDetectadas.length > 0 || cvRole.length > 0
          const sorted = hasProfile
            ? [...manfredOffers].sort((a, b) => preScoreOffer(b, skillsDetectadas, cvRole) - preScoreOffer(a, skillsDetectadas, cvRole))
            : manfredOffers
          return (
            <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <p className="font-sans font-[700] text-xs uppercase tracking-widest text-gray-400 mb-4">
                {hasProfile ? 'Ofertas activas en Manfred · ordenadas por afinidad' : 'Ofertas activas en Manfred'}
              </p>
              {loadingOffers ? (
                <div className="flex items-center gap-2 py-4">
                  <svg className="animate-spin h-4 w-4 text-teal flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <p className="font-sans text-sm text-gray-400">Cargando ofertas...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: '480px' }}>
                    {sorted.map(offer => {
                      const salary = formatSalary(offer)
                      const location = formatLocation(offer.remotePercentage, offer.locations ?? [])
                      const matchPct = preScoreOffer(offer, skillsDetectadas, cvRole)
                      const ms = matchBadgeStyle(matchPct)
                      const offerHref = `https://www.getmanfred.com/ofertas-empleo/${offer.id}/${offer.slug}`
                      return (
                        <div
                          key={offer.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelectOffer(offer)}
                          onKeyDown={e => e.key === 'Enter' && handleSelectOffer(offer)}
                          className="w-full text-left rounded-xl border p-3 transition-all duration-150 hover:shadow-sm cursor-pointer"
                          style={{ backgroundColor: '#fafafa', borderColor: matchPct >= 80 ? '#86efac' : '#ede9e3' }}
                        >
                          <div className="flex items-center gap-3">
                            <OfferLogo name={offer.company.name} logoUrl={offer.company.logoUrl} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-sans font-[700] text-sm text-navy leading-snug">{offer.position}</p>
                                {hasProfile && (
                                  <span className="font-sans font-[700] text-[10px] px-1.5 py-0.5 rounded-full"
                                    style={{ backgroundColor: ms.bg, color: ms.color, border: `1px solid ${ms.border}` }}>
                                    {matchPct}%
                                  </span>
                                )}
                              </div>
                              <p className="font-sans text-xs text-gray-400 mt-0.5">{offer.company.name}</p>
                            </div>
                            <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
                              {salary && <p className="font-sans text-xs font-[700] text-teal">{salary}</p>}
                              <p className="font-sans text-xs text-gray-400">{location}</p>
                              <a
                                href={offerHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="mt-1.5 inline-flex items-center gap-1 font-sans font-[700] text-[10px] px-2 py-0.5 rounded-full transition-opacity hover:opacity-75"
                                style={{ backgroundColor: '#e6f7f7', color: '#0DA1A4', border: '1px solid #b2e8e8' }}
                              >
                                Ver oferta
                                <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-3 text-center">
                    <a
                      href="https://www.getmanfred.com/ofertas-empleo"
                      target="_blank" rel="noopener noreferrer"
                      className="font-sans text-xs text-gray-400 hover:text-teal transition-colors duration-200"
                    >
                      Ver todas en getmanfred.com →
                    </a>
                  </div>
                </>
              )}
            </div>
          )
        })()}

        {/* Batch mode link */}
        <div className="flex items-center justify-center">
          <button
            onClick={() => router.push('/match/batch')}
            className="font-sans text-sm text-gray-400 hover:text-teal transition-colors duration-200"
          >
            {L.batchPre} <span className="font-[700] underline underline-offset-2">{L.batchCta}</span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-6 text-xs text-gray-400 font-sans">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-teal" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            {L.noStorage}
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-teal" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {L.fastAnalysis}
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
