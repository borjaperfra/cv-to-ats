import { NextRequest, NextResponse } from 'next/server'
import { analyzeJobWithAI } from '@/lib/job-ai'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 90

const MAX_JD_CHARS = 30_000
const MIN_JD_CHARS = 100

function sanitizeError(error: unknown): string {
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
  const ip = getClientIp(request)
  const { allowed, retryAfter } = checkRateLimit(`job:${ip}`)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor, espera un momento antes de volver a intentarlo.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const body = await request.json() as { jdText?: string; lang?: string }
    const jdText = (body.jdText ?? '').trim()
    const lang = body.lang === 'en' ? 'en' : 'es'

    if (jdText.length < MIN_JD_CHARS) {
      return NextResponse.json(
        { error: 'El texto de la oferta es demasiado corto. Pega al menos 100 caracteres.' },
        { status: 422 }
      )
    }

    if (jdText.length > MAX_JD_CHARS) {
      return NextResponse.json(
        { error: 'El texto de la oferta es demasiado largo.' },
        { status: 422 }
      )
    }

    const result = await analyzeJobWithAI(jdText, lang)
    result.analyzedAt = new Date().toISOString()

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  }
}
