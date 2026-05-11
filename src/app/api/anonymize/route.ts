import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const FIELD_LABELS: Record<string, string> = {
  nombre:     'nombre completo de la persona',
  email:      'direcciones de correo electrónico',
  telefono:   'números de teléfono',
  direccion:  'dirección postal (calle, número, ciudad, código postal)',
  linkedin:   'URLs de LinkedIn, GitHub u otras redes sociales personales',
  nacimiento: 'fecha de nacimiento y edad',
  dni:        'DNI, NIE, NIF, pasaporte u otros documentos de identidad',
  foto:       'menciones o referencias a fotografía',
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file      = formData.get('pdf')    as File | null
    const fieldsRaw = formData.get('fields') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No se ha adjuntado ningún archivo.' }, { status: 400 })
    }

    const fields: string[] = fieldsRaw ? JSON.parse(fieldsRaw) : []
    if (fields.length === 0) {
      return NextResponse.json({ error: 'Selecciona al menos un tipo de dato a eliminar.' }, { status: 400 })
    }

    // Extract text from PDF
    const buffer = Buffer.from(await file.arrayBuffer())
    const pdfParse = (await import('pdf-parse')).default
    const parsed = await pdfParse(buffer)
    const rawText = parsed.text?.trim()

    if (!rawText) {
      return NextResponse.json(
        { error: 'No se pudo extraer texto del PDF. Puede que sea un PDF escaneado o protegido.' },
        { status: 422 }
      )
    }

    // Build Gemini prompt
    const fieldList = fields.map(f => `- ${FIELD_LABELS[f] ?? f}`).join('\n')

    const prompt = `Eres una herramienta de anonimización de CVs. Dado el siguiente texto de un CV, sustituye los datos personales identificativos indicados por la etiqueta [REDACTADO].

Datos que debes anonimizar:
${fieldList}

Reglas estrictas:
- Sustituye cada dato identificativo por [REDACTADO]
- Conserva íntegro el contenido profesional: experiencia, habilidades, formación, logros, fechas de trabajo, nombres de empresas, universidades y cargos
- NO redactes nombres de empresas, universidades ni empleadores
- NO redactes tecnologías, idiomas, herramientas ni habilidades profesionales
- No uses formato markdown (sin asteriscos, sin almohadillas, sin backticks)
- Devuelve únicamente el texto del CV anonimizado, sin explicaciones ni comentarios adicionales

Texto del CV:
${rawText}`

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model  = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview' })
    const result = await model.generateContent(prompt)
    const anonymizedText = result.response.text()

    // Generate PDF
    const pdfBuffer = await buildPDF(anonymizedText)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': 'attachment; filename="cv-anonimizado.pdf"',
      },
    })
  } catch (err) {
    console.error('[anonymize]', err)
    return NextResponse.json({ error: 'Error interno al procesar el CV.' }, { status: 500 })
  }
}

async function buildPDF(text: string): Promise<ArrayBuffer> {
  const { jsPDF } = await import('jspdf')
  const doc    = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW  = doc.internal.pageSize.getWidth()
  const pageH  = doc.internal.pageSize.getHeight()
  const mX     = 20
  const mTop   = 22
  const mBot   = 20
  const textW  = pageW - 2 * mX
  let y        = mTop

  function newPage() {
    doc.addPage()
    y = mTop
  }

  function ensureSpace(h: number) {
    if (y + h > pageH - mBot) newPage()
  }

  for (const line of text.split('\n')) {
    const t = line.trim()

    if (t === '') {
      y += 3
      continue
    }

    // Detect section headers: short, fully uppercase lines without dots or @
    const isHeader =
      t === t.toUpperCase() &&
      t.length >= 3 &&
      t.length <= 60 &&
      /[A-ZÁÉÍÓÚÑ]/.test(t) &&
      !/[.@]/.test(t)

    if (isHeader) {
      y += 2
      ensureSpace(10)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(9, 44, 100)
      doc.text(t, mX, y)
      y += 1.5
      doc.setDrawColor(13, 161, 164)
      doc.setLineWidth(0.4)
      doc.line(mX, y, pageW - mX, y)
      y += 5
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(40, 40, 40)
      const wrapped = doc.splitTextToSize(t, textW) as string[]
      for (const wl of wrapped) {
        ensureSpace(5)
        doc.text(wl, mX, y)
        y += 5
      }
    }
  }

  return doc.output('arraybuffer')
}
