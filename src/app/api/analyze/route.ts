import { NextRequest, NextResponse } from 'next/server'
import { extractCVText } from '@/lib/extractors'
import { analyzeWithGemini } from '@/lib/gemini'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]

const MAX_SIZE_BYTES = 10 * 1024 * 1024  // 10 MB
const MAX_TEXT_CHARS = 60_000            // ~30 pages of text — more than enough

function sanitizeError(error: unknown): string {
  // Never expose raw SDK / internal errors to the client
  if (error instanceof Error) {
    const msg = error.message
    if (msg.includes('API key') || msg.includes('quota') || msg.includes('PERMISSION_DENIED')) {
      return 'El servicio de análisis no está disponible en este momento. Por favor, inténtalo más tarde.'
    }
    if (msg.includes('JSON') || msg.includes('parse')) {
      return 'Error al procesar la respuesta. Por favor, inténtalo de nuevo.'
    }
    return msg
  }
  return 'El análisis ha fallado. Por favor, inténtalo de nuevo.'
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIp(request)
  const { allowed, retryAfter } = checkRateLimit(`analyze:${ip}`)
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

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato no admitido. Por favor, sube un archivo PDF o DOCX.' },
        { status: 415 }
      )
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'El archivo supera el límite de 10 MB.' },
        { status: 413 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const cvText = await extractCVText(buffer, file.name)

    if (cvText.trim().length < 100) {
      return NextResponse.json(
        { error: 'No se pudo extraer texto del archivo. Asegúrate de que el PDF no está protegido o escaneado.' },
        { status: 422 }
      )
    }

    const CV_KEYWORDS = [
      'experiencia', 'experience', 'educación', 'education', 'habilidades', 'skills',
      'trabajo', 'empleo', 'cargo', 'puesto', 'empresa', 'company', 'universidad',
      'university', 'formación', 'training', 'curriculum', 'résumé', 'resume',
      'idiomas', 'languages', 'certificaciones', 'certifications', 'logros', 'achievements',
    ]
    const sample = cvText.slice(0, 3000).toLowerCase()
    const hasCVContent = CV_KEYWORDS.some(kw => sample.includes(kw))
    if (!hasCVContent) {
      return NextResponse.json(
        { error: 'El documento no parece un CV. Por favor, sube tu currículum en formato PDF o DOCX.' },
        { status: 422 }
      )
    }

    if (cvText.length > MAX_TEXT_CHARS) {
      return NextResponse.json(
        { error: 'El documento tiene demasiado contenido. Por favor, sube una versión más concisa.' },
        { status: 422 }
      )
    }

    const lang = (formData.get('lang') as string | null) === 'en' ? 'en' : 'es'
    const result = await analyzeWithGemini(cvText, lang)
    result.analyzedAt = new Date().toISOString()

    return NextResponse.json({ ...result, _cvText: cvText })
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  }
}
