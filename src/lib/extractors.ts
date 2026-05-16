// Server-side only — never import from client components

function extractJpegsFromPDF(buffer: Buffer): Buffer[] {
  const jpegs: Buffer[] = []
  let pos = 0
  while (pos < buffer.length - 1) {
    if (buffer[pos] === 0xFF && buffer[pos + 1] === 0xD8) {
      let end = pos + 2
      while (end < buffer.length - 1) {
        if (buffer[end] === 0xFF && buffer[end + 1] === 0xD9) {
          end += 2
          const jpeg = buffer.slice(pos, end)
          if (jpeg.length > 1024) jpegs.push(jpeg)
          pos = end
          break
        }
        end++
      }
      if (end >= buffer.length - 1) break
    } else {
      pos++
    }
  }
  return jpegs
}

async function extractFromImagePDF(buffer: Buffer): Promise<string> {
  if (!process.env.NAN_API_KEY) throw new Error('NAN_API_KEY not set')

  const jpegs = extractJpegsFromPDF(buffer)
  if (jpegs.length === 0) throw new Error('no images found in PDF')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60_000)

  try {
    const res = await fetch('https://api.nan.builders/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NAN_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gemma4',
        temperature: 0,
        messages: [{
          role: 'user',
          content: [
            ...jpegs.map(jpeg => ({
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${jpeg.toString('base64')}` },
            })),
            { type: 'text', text: 'Extract ALL text from these CV pages verbatim. Return only the raw text, no markdown, no formatting.' },
          ],
        }],
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`NaN API error ${res.status}: ${body}`)
    }

    const data = await res.json() as { choices: Array<{ message: { content: string } }> }
    const text = data.choices[0].message.content.trim()
    if (text.length < 30) throw new Error('OCR returned no usable text')
    return text
  } finally {
    clearTimeout(timer)
  }
}

function extractLinksFromPdfBuffer(buffer: Buffer): string[] {
  // Scan raw PDF binary for /URI annotations — pdf-parse discards these
  const raw = buffer.toString('latin1')
  const urls: string[] = []
  const uriRegex = /\/URI\s*\(([^)]+)\)/g
  let match
  while ((match = uriRegex.exec(raw)) !== null) {
    const url = match[1].replace(/\\\)/g, ')').trim()
    if (/^https?:\/\//i.test(url)) urls.push(url)
  }
  return Array.from(new Set(urls))
}

export async function extractFromPDF(buffer: Buffer, maxPages?: number): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse')
  const data = await pdfParse(buffer)

  if (maxPages && data.numpages > maxPages) {
    throw new Error(`El CV no puede tener más de ${maxPages} páginas. El tuyo tiene ${data.numpages}.`)
  }

  let text: string
  if (data.text.trim().length >= 30) {
    text = data.text
  } else {
    // Fallback: image-based PDF — extract embedded JPEGs and OCR via Gemma4
    try {
      text = await extractFromImagePDF(buffer)
    } catch {
      throw new Error('No se pudo extraer texto de este PDF. Puede ser un escaneado o un diseño exportado como imagen (ej: Canva). Prueba a exportarlo de nuevo como PDF con texto, o sube una copia en DOCX o TXT.')
    }
  }

  const links = extractLinksFromPdfBuffer(buffer)
  if (links.length > 0) {
    text += '\n\n[EXTRACTED_LINKS]\n' + links.join('\n') + '\n[/EXTRACTED_LINKS]'
  }

  return text
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
