import { NextRequest, NextResponse } from 'next/server'
import { extractCVText } from '@/lib/extractors'
import { analyzeWithGemini } from '@/lib/analysis'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { getSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 90

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
]
const MAX_SIZE_BYTES      = 3 * 1024 * 1024
const MAX_PAGES           = 5
const MAX_TEXT_CHARS      = 60_000
const ANALYSIS_TIMEOUT_MS = 85_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('El análisis tardó demasiado. Por favor, inténtalo de nuevo.')), ms)
    ),
  ])
}

function looksLikeCV(text: string): boolean {
  const sample = text.slice(0, 10_000).toLowerCase()
  const keywords = [
    // ES
    'experiencia', 'formación', 'estudios', 'habilidades', 'competencias',
    'trabajo', 'empresa', 'empleado', 'cargo', 'puesto', 'universidad',
    'titulación', 'curriculum', 'perfil', 'objetivo', 'referencias',
    // EN
    'experience', 'education', 'skills', 'resume', 'work history',
    'company', 'employed', 'position', 'role', 'university', 'degree',
    'profile', 'summary', 'references', 'volunteer', 'achievements',
    // FR
    'expérience', 'formation', 'compétences', 'diplôme', 'entreprise',
    // DE
    'erfahrung', 'ausbildung', 'kenntnisse', 'lebenslauf', 'berufserfahrung',
    // IT
    'esperienza', 'istruzione', 'competenze', 'curriculum vitae',
    // PT
    'experiência', 'formação', 'habilidades',
    // Universal
    'linkedin', 'github', 'portfolio',
  ]
  return keywords.filter(kw => sample.includes(kw)).length >= 2
}


function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message
    if (msg.includes('API key') || msg.includes('quota') || msg.includes('PERMISSION_DENIED')) {
      return 'El servicio de análisis no está disponible en este momento. Por favor, inténtalo más tarde.'
    }
    if (msg.includes('JSON') || msg.includes('parse')) {
      return 'Error al procesar la respuesta. Por favor, inténtalo de nuevo.'
    }
    if (msg.includes('timed out') || msg.includes('timeout') || msg.includes('tardó demasiado')) {
      return 'El análisis está tardando más de lo esperado. Por favor, inténtalo de nuevo en unos instantes.'
    }
    return msg
  }
  return 'El análisis ha fallado. Por favor, inténtalo de nuevo.'
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const { allowed, retryAfter } = checkRateLimit(`analyze:${ip}`, 3)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor, espera un momento antes de volver a intentarlo.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }


  try {
    const formData = await request.formData()
    const file = formData.get('cv') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se ha proporcionado ningún archivo.' }, { status: 400 })
    }

    const fileExt = (file.name.split('.').pop() ?? '').toLowerCase()
    const ALLOWED_EXTS = new Set(['pdf', 'docx', 'doc', 'txt', 'md'])
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTS.has(fileExt)) {
      return NextResponse.json(
        { error: 'Solo se admiten archivos PDF, DOCX, TXT o MD.' },
        { status: 415 }
      )
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'El archivo supera el límite de 3 MB.' },
        { status: 413 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const cvText = await extractCVText(buffer, file.name, MAX_PAGES)

    if (cvText.trim().length < 100) {
      return NextResponse.json(
        { error: 'No se pudo extraer texto del archivo. Si es un PDF, asegúrate de que no está protegido o escaneado.' },
        { status: 422 }
      )
    }

    const OBVIOUS_NON_CV = [
      'número de factura', 'base imponible', 'nº de factura',
      'purchase order', 'amount due', 'bill to:',
      'fecha de vencimiento', 'total a pagar',
    ]
    const quickSample = cvText.slice(0, 1000).toLowerCase()
    const isObviouslyNotCV = OBVIOUS_NON_CV.some(kw => quickSample.includes(kw))

    if (isObviouslyNotCV || !looksLikeCV(cvText)) {
      return NextResponse.json(
        { error: 'El documento no parece un CV. Por favor, sube tu currículum en formato PDF, DOCX, TXT o MD.' },
        { status: 422 }
      )
    }

    if (cvText.length > MAX_TEXT_CHARS) {
      return NextResponse.json(
        { error: 'El documento tiene demasiado contenido. Por favor, sube una versión más concisa.' },
        { status: 422 }
      )
    }

    const PLATFORM_PATTERNS = [
      /but wait[^\n]*/gi,
      /getmanfred\.com[^\n]*/gi,
      /manfred[^\n]*/gi,
      /página\s+\d+\s+de\s+\d+/gi,
      /page\s+\d+\s+of\s+\d+/gi,
      /^\s*\d+\s*$/gm,
    ]
    const cleanedCvText = PLATFORM_PATTERNS.reduce((t, re) => t.replace(re, ''), cvText).trim()

    const lang = (formData.get('lang') as string | null) === 'en' ? 'en' : 'es'
    const result = await withTimeout(analyzeWithGemini(cleanedCvText, lang), ANALYSIS_TIMEOUT_MS)
    result.analyzedAt = new Date().toISOString()

    void (async () => {
      try { await getSupabase().rpc('increment_stat', { stat_id: 'cvs_analyzed' }) } catch {}
    })()

    return NextResponse.json({ ...result, _cvText: cvText })
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  }
}
