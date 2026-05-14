import { NextRequest, NextResponse } from 'next/server'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import HarvardTemplate from '@/components/editor/HarvardTemplate'
import type { CVData } from '@/types/cv'
import type { CvLang } from '@/lib/cv-labels'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { mkdtempSync, rmdirSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'
export const maxDuration = 60

const CHROMIUM_PATH = process.env.CHROMIUM_PATH ?? '/usr/bin/chromium-browser'

function buildHtml(cvData: CVData, lang: CvLang): string {
  const body = renderToStaticMarkup(createElement(HarvardTemplate, { data: cvData, lang }))
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; color: #000; }
    .bg-white { background-color: #fff; }
    .text-black { color: #000; }
  </style>
</head>
<body>${body}</body>
</html>`
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed, retryAfter } = checkRateLimit(`pdf:${ip}`, 5)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor, espera un momento.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  let tmpDir: string | null = null

  try {
    const { cvData, lang = 'en', filename = 'cv' } = await req.json() as {
      cvData: CVData
      lang?: CvLang
      filename?: string
    }

    if (!cvData) {
      return NextResponse.json({ error: 'Faltan datos del CV.' }, { status: 400 })
    }

    const html = buildHtml(cvData, lang)

    tmpDir = mkdtempSync(join('/tmp', 'chromium-'))

    const puppeteer = await import('puppeteer-core')
    const browser = await puppeteer.default.launch({
      executablePath: CHROMIUM_PATH,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        `--user-data-dir=${tmpDir}`,
      ],
    })

    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'domcontentloaded' })
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      })

      const safeFilename = (filename as string).replace(/[^a-z0-9_\-]/gi, '_').toLowerCase()

      const pdfBlob = new Blob([Buffer.from(pdfBuffer)], { type: 'application/pdf' })
      return new NextResponse(pdfBlob, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${safeFilename}_cv.pdf"`,
        },
      })
    } finally {
      await browser.close()
    }
  } catch (err) {
    console.error('[pdf]', err)
    const msg = err instanceof Error ? err.message : 'Error al generar el PDF.'
    if (msg.includes('ENOENT') || msg.includes('executablePath')) {
      return NextResponse.json(
        { error: 'El generador de PDF no está disponible en este entorno.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: 'Error al generar el PDF.' }, { status: 500 })
  } finally {
    if (tmpDir) {
      try { rmdirSync(tmpDir, { recursive: true }) } catch { /* ignore */ }
    }
  }
}
