import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { CVData } from '@/types/cv'
import { EMPTY_CV } from '@/types/cv'

export const maxDuration = 60

const FIELD_LABELS: Record<string, string> = {
  nombre:     'nombre completo de la persona',
  email:      'direcciones de correo electrónico',
  telefono:   'números de teléfono',
  direccion:  'dirección postal (calle, número, código postal)',
  linkedin:   'URLs de LinkedIn, GitHub u otras redes sociales personales',
  nacimiento: 'fecha de nacimiento o edad',
  dni:        'DNI, NIE, NIF, pasaporte u otros documentos de identidad',
  foto:       'menciones o referencias a fotografía',
  empresa:    'nombres de todas las empresas en la experiencia laboral (campo "empresa" de cada entrada)',
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
    const buffer   = Buffer.from(await file.arrayBuffer())
    const pdfParse = (await import('pdf-parse')).default
    const parsed   = await pdfParse(buffer)
    const rawText  = parsed.text?.trim()

    if (!rawText) {
      return NextResponse.json(
        { error: 'No se pudo extraer texto del PDF. Puede que sea un PDF escaneado o protegido.' },
        { status: 422 }
      )
    }

    const fieldList = fields.map(f => `- ${FIELD_LABELS[f] ?? f}`).join('\n')

    const prompt = `Eres un parser y anonimizador de CVs. Analiza el siguiente texto de CV, extrae su contenido en la estructura JSON indicada y anonimiza los datos personales señalados.

Datos a anonimizar (sustituir por "[ANONIMIZADO]"):
${fieldList}

Devuelve ÚNICAMENTE JSON válido con esta estructura exacta:
{
  "personalInfo": {
    "nombre": string,
    "cargo": string,
    "email": string,
    "telefono": string,
    "linkedin": string,
    "ubicacion": string,
    "website": string
  },
  "resumen": string,
  "experiencia": [
    {
      "id": string,
      "empresa": string,
      "cargo": string,
      "ubicacion": string,
      "fechaInicio": string,
      "fechaFin": string,
      "actual": boolean,
      "bullets": string[]
    }
  ],
  "proyectos": [
    {
      "id": string,
      "nombre": string,
      "descripcion": string,
      "url": string
    }
  ],
  "educacion": [
    {
      "id": string,
      "institucion": string,
      "titulo": string,
      "campo": string,
      "fechaInicio": string,
      "fechaFin": string,
      "logros": string[]
    }
  ],
  "habilidades": {
    "languages": string[],
    "frameworks": string[],
    "databases": string[],
    "tools": string[],
    "practices": string[]
  },
  "idiomas": [
    {
      "id": string,
      "idioma": string,
      "nivel": string
    }
  ]
}

Reglas:
- Los campos en la lista de datos a anonimizar se sustituyen por "[ANONIMIZADO]"
- Todo el contenido profesional (logros, fechas de trabajo, habilidades, formación, proyectos) se conserva íntegro, SALVO los campos indicados arriba para anonimizar
- Si un campo no está en el CV, usa string vacío "" o array vacío []
- "actual": true si es el trabajo presente, false en caso contrario
- Los IDs deben ser únicos: "exp-1", "exp-2", "edu-1", "proj-1", "lang-1", etc.
- No incluyas markdown, solo JSON puro

Texto del CV:
${rawText}`

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model  = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: { responseMimeType: 'application/json' },
    })
    const result = await model.generateContent(prompt)
    const text   = result.response.text()

    let cvData: CVData
    try {
      cvData = mergeWithEmpty(JSON.parse(text))
    } catch {
      return NextResponse.json({ error: 'Error al procesar la estructura del CV.' }, { status: 500 })
    }

    return NextResponse.json({ cvData })
  } catch (err) {
    console.error('[anonymize]', err)
    return NextResponse.json({ error: 'Error interno al procesar el CV.' }, { status: 500 })
  }
}

function mergeWithEmpty(raw: Partial<CVData>): CVData {
  return {
    personalInfo: { ...EMPTY_CV.personalInfo, ...(raw.personalInfo ?? {}) },
    resumen:      raw.resumen      ?? '',
    experiencia:  raw.experiencia  ?? [],
    proyectos:    raw.proyectos    ?? [],
    educacion:    raw.educacion    ?? [],
    habilidades:  { ...EMPTY_CV.habilidades, ...(raw.habilidades ?? {}) },
    idiomas:      raw.idiomas      ?? [],
  }
}
