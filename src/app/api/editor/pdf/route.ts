import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import HarvardTemplatePdf from '@/components/editor/HarvardTemplatePdf'
import type { CVData } from '@/types/cv'
import type { CvLang } from '@/lib/cv-labels'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed, retryAfter } = checkRateLimit(`pdf:${ip}`, 5)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor, espera un momento.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const { cvData, lang = 'en', filename = 'cv' } = await req.json() as {
      cvData: CVData
      lang?: CvLang
      filename?: string
    }

    if (!cvData) {
      return NextResponse.json({ error: 'Faltan datos del CV.' }, { status: 400 })
    }

    const element = createElement(HarvardTemplatePdf, { data: cvData, lang })
    const buffer = await renderToBuffer(element)

    const safeFilename = (filename as string).replace(/[^a-z0-9_\-]/gi, '_').toLowerCase()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}_cv.pdf"`,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al generar el PDF.'
    console.error('[pdf]', msg)
    return NextResponse.json({ error: `Error al generar el PDF: ${msg}` }, { status: 500 })
  }
}
