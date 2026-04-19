import { NextRequest, NextResponse } from 'next/server'
import { extractCVText } from '@/lib/extractors'
import { matchWithGemini } from '@/lib/gemini-match'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]
const MAX_SIZE_BYTES = 10 * 1024 * 1024
const MAX_CV_CHARS   = 60_000
const MAX_JD_CHARS   = 30_000

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

// ── SSRF protection: only allow public HTTP/HTTPS URLs ─────────────────────
function isAllowedUrl(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (!['http:', 'https:'].includes(url.protocol)) return false
  const host = url.hostname.toLowerCase()
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false
  if (/^10\./.test(host)) return false
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false
  if (/^192\.168\./.test(host)) return false
  if (host === '0.0.0.0' || host === '169.254.169.254') return false // AWS metadata etc.
  return true
}

// ── Strip HTML tags and decode common entities ──────────────────────────────
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchJdFromUrl(rawUrl: string): Promise<string> {
  if (!isAllowedUrl(rawUrl)) {
    throw new Error('La URL no es válida o no está permitida.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    const response = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ManfredATSKiller/1.0)',
        'Accept': 'text/html,application/xhtml+xml,text/plain;q=0.9',
        'Accept-Language': 'es,en;q=0.9',
      },
    })

    if (!response.ok) {
      throw new Error(`No se pudo acceder a la URL (error ${response.status}). Prueba a pegar el texto directamente.`)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('html') && !contentType.includes('text')) {
      throw new Error('La URL no devuelve contenido de texto. Prueba a pegar el texto de la oferta directamente.')
    }

    const html = await response.text()
    const text = htmlToText(html)

    // Detect login walls: if the extracted text is short or contains login-wall signals
    const loginSignals = ['sign in', 'log in', 'iniciar sesión', 'inicia sesión', 'create an account', 'crea una cuenta', 'password', 'contraseña']
    const textLower = text.toLowerCase()
    const hasLoginSignal = loginSignals.some(s => textLower.includes(s))
    if (hasLoginSignal && text.length < 2000) {
      throw new Error('La URL requiere iniciar sesión para ver el contenido. Prueba a pegar el texto de la oferta directamente.')
    }

    return text
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('La URL tardó demasiado en responder. Prueba a pegar el texto directamente.')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const { allowed, retryAfter } = checkRateLimit(`match:${ip}`)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor, espera un momento antes de volver a intentarlo.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const formData = await request.formData()

    // ── CV ──
    let cvText = (formData.get('cvText') as string | null) ?? ''

    if (cvText && cvText.length > MAX_CV_CHARS) {
      return NextResponse.json({ error: 'El texto del CV es demasiado largo.' }, { status: 422 })
    }

    if (!cvText) {
      const cvFile = formData.get('cvFile') as File | null
      if (!cvFile) {
        return NextResponse.json({ error: 'Se necesita el CV.' }, { status: 400 })
      }
      if (!ALLOWED_TYPES.includes(cvFile.type)) {
        return NextResponse.json({ error: 'Formato de CV no admitido. Sube un PDF o DOCX.' }, { status: 415 })
      }
      if (cvFile.size > MAX_SIZE_BYTES) {
        return NextResponse.json({ error: 'El CV supera el límite de 10 MB.' }, { status: 413 })
      }
      const buffer = Buffer.from(await cvFile.arrayBuffer())
      cvText = await extractCVText(buffer, cvFile.name)
    }

    if (cvText.trim().length < 100) {
      return NextResponse.json(
        { error: 'No se pudo extraer texto del CV. Asegúrate de que el PDF no está protegido.' },
        { status: 422 }
      )
    }

    // ── JD: text | file | url ──
    let jdText = (formData.get('jdText') as string | null) ?? ''

    if (jdText && jdText.length > MAX_JD_CHARS) {
      return NextResponse.json({ error: 'La oferta de trabajo es demasiado larga.' }, { status: 422 })
    }

    if (!jdText) {
      const jdUrl = (formData.get('jdUrl') as string | null) ?? ''

      if (jdUrl) {
        jdText = await fetchJdFromUrl(jdUrl)
        if (jdText.length > MAX_JD_CHARS) jdText = jdText.slice(0, MAX_JD_CHARS)
      } else {
        const jdFile = formData.get('jdFile') as File | null
        if (!jdFile) {
          return NextResponse.json({ error: 'Se necesita la oferta de trabajo.' }, { status: 400 })
        }
        if (!ALLOWED_TYPES.includes(jdFile.type)) {
          return NextResponse.json({ error: 'Formato de oferta no admitido. Sube un PDF o DOCX.' }, { status: 415 })
        }
        if (jdFile.size > MAX_SIZE_BYTES) {
          return NextResponse.json({ error: 'La oferta supera el límite de 10 MB.' }, { status: 413 })
        }
        const buffer = Buffer.from(await jdFile.arrayBuffer())
        jdText = await extractCVText(buffer, jdFile.name)
      }
    }

    if (jdText.trim().length < 50) {
      return NextResponse.json(
        { error: 'No se pudo extraer suficiente texto de la oferta. Prueba a pegar el texto directamente.' },
        { status: 422 }
      )
    }

    const lang = (formData.get('lang') as string | null) === 'en' ? 'en' : 'es'
    const result = await matchWithGemini(cvText, jdText, lang)
    result.analyzedAt = new Date().toISOString()

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 })
  }
}
