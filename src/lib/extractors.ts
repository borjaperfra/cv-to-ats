// Server-side only — never import from client components

const OCR_TIMEOUT_MS = 30_000

async function extractFromPDFWithOCR(buffer: Buffer): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const { withGeminiRetry } = await import('@/lib/gemini-retry')
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview', generationConfig: { temperature: 0 } })

  const ocrCall = withGeminiRetry(() => model.generateContent([
    {
      inlineData: {
        mimeType: 'application/pdf',
        data: buffer.toString('base64'),
      },
    },
    'Extract all the text from this PDF document exactly as it appears. Return only the extracted text, no commentary.',
  ]))

  const timeoutGuard = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('El PDF tardó demasiado en procesarse. Inténtalo de nuevo.')), OCR_TIMEOUT_MS)
  )

  const result = await Promise.race([ocrCall, timeoutGuard])
  return result.response.text()
}

export async function extractFromPDF(buffer: Buffer, maxPages?: number): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse')
  const data = await pdfParse(buffer)

  if (maxPages && data.numpages > maxPages) {
    throw new Error(`El CV no puede tener más de ${maxPages} páginas. El tuyo tiene ${data.numpages}.`)
  }

  if (data.text.trim().length >= 100) return data.text

  // Fallback: PDF is image-based (e.g. Canva exports) — use Gemini OCR
  return extractFromPDFWithOCR(buffer)
}

export async function extractFromDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  try {
    const result = await mammoth.extractRawText({ buffer })
    if (!result.value.trim()) {
      throw new Error('El archivo .doc no pudo leerse. Conviértelo a .docx o PDF e inténtalo de nuevo.')
    }
    return result.value
  } catch (err) {
    if (err instanceof Error && err.message.includes('doc')) throw err
    throw new Error('El archivo .doc no pudo leerse. Conviértelo a .docx o PDF e inténtalo de nuevo.')
  }
}

export async function extractCVText(buffer: Buffer, filename: string, maxPages?: number): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return extractFromPDF(buffer, maxPages)
  if (ext === 'docx' || ext === 'doc') return extractFromDOCX(buffer)
  if (ext === 'txt' || ext === 'md') return buffer.toString('utf-8')
  throw new Error(`Formato no admitido: .${ext}. Por favor, sube un archivo PDF, DOCX, TXT o MD.`)
}
