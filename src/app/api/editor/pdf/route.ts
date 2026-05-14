import { NextRequest, NextResponse } from 'next/server'
import { existsSync } from 'fs'
import type { CVData } from '@/types/cv'
import type { CvLang } from '@/lib/cv-labels'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { mkdtempSync, rmdirSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'
export const maxDuration = 60

async function getLaunchOptions(tmpDir: string) {
  const systemPath = process.env.CHROMIUM_PATH ?? '/usr/bin/chromium-browser'
  if (existsSync(systemPath)) {
    return {
      executablePath: systemPath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        `--user-data-dir=${tmpDir}`,
      ],
    }
  }
  // Fallback: bundled Chromium from @sparticuz/chromium (works without system deps)
  const { default: chromium } = await import('@sparticuz/chromium')
  const executablePath = await chromium.executablePath()
  return {
    executablePath,
    args: [...chromium.args, `--user-data-dir=${tmpDir}`],
  }
}

async function buildHtml(cvData: CVData, lang: CvLang): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { createElement } = await import('react')
  const { default: HarvardTemplate } = await import('@/components/editor/HarvardTemplate')
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

    const html = await buildHtml(cvData, lang)

    tmpDir = mkdtempSync(join('/tmp', 'chromium-'))

    const launchOptions = await getLaunchOptions(tmpDir)
    const puppeteer = await import('puppeteer-core')
    const browser = await puppeteer.default.launch({
      headless: true,
      ...launchOptions,
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
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[pdf] error:', msg)
    return NextResponse.json({ error: `Error al generar el PDF: ${msg}` }, { status: 500 })
  } finally {
    if (tmpDir) {
      try { rmdirSync(tmpDir, { recursive: true }) } catch { /* ignore */ }
    }
  }
}
