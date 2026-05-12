import { NextRequest, NextResponse } from 'next/server'
import { analyzeLinkedIn } from '@/lib/gemini-linkedin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 90

const MIN_LENGTH = 200
const MAX_LENGTH = 50_000

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
  const { allowed, retryAfter } = checkRateLimit(`linkedin:${ip}`)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor, espera un momento antes de volver a intentarlo.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'El cuerpo de la solicitud no es JSON válido.' }, { status: 400 })
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
    }

    const { profileText, lang: langRaw } = body as Record<string, unknown>
    const lang = langRaw === 'en' ? 'en' : 'es'

    if (!profileText || typeof profileText !== 'string') {
      return NextResponse.json({ error: 'No se ha proporcionado el texto del perfil.' }, { status: 400 })
    }

    if (profileText.trim().length < MIN_LENGTH) {
      return NextResponse.json(
        { error: 'El texto del perfil es demasiado corto. Asegúrate de copiar el perfil completo.' },
        { status: 422 }
      )
    }

    if (profileText.length > MAX_LENGTH) {
      return NextResponse.json(
        { error: 'El texto del perfil es demasiado largo. Por favor, pega solo el contenido principal.' },
        { status: 422 }
      )
    }

    const result = await analyzeLinkedIn(profileText.trim(), lang)
    result.analyzedAt = new Date().toISOString()

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  }
}
