import { GoogleGenerativeAI } from '@google/generative-ai'
import type { CVData } from '@/types/cv'
import type { Suggestion } from '@/types/analysis'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set.')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({
  model: 'gemini-3-flash-preview',
  generationConfig: { temperature: 0 },
})

// ─── Types returned by Gemini (no IDs) ───────────────────────────────────────

type RawExperiencia = Omit<CVData['experiencia'][0], 'id'>
type RawEducacion   = Omit<CVData['educacion'][0], 'id'>
type RawIdioma      = Omit<CVData['idiomas'][0], 'id'>

interface RawCVData {
  personalInfo: CVData['personalInfo']
  resumen:      string
  experiencia:  RawExperiencia[]
  educacion:    RawEducacion[]
  habilidades:  string[]
  idiomas:      RawIdioma[]
}

// ─── Parse raw CV text → structured CVData ───────────────────────────────────

const PARSE_PROMPT = (cvText: string) => `
You are a CV parser. Extract the structured data from the following CV text and return ONLY valid JSON — no markdown, no text outside the JSON.

Return exactly this structure:
{
  "personalInfo": {
    "nombre": "<full name>",
    "cargo": "<current professional title or most recent role>",
    "email": "<email>",
    "telefono": "<phone>",
    "linkedin": "<linkedin url or username>",
    "ubicacion": "<city, country>",
    "website": "<personal website or portfolio url>"
  },
  "resumen": "<professional summary or objective, if present>",
  "experiencia": [
    {
      "empresa": "<company name>",
      "cargo": "<job title>",
      "ubicacion": "<location>",
      "fechaInicio": "<start date, e.g. 'Ene 2022'>",
      "fechaFin": "<end date or empty if current>",
      "actual": <true if current job, false otherwise>,
      "bullets": ["<achievement or responsibility>", ...]
    }
  ],
  "educacion": [
    {
      "institucion": "<institution name>",
      "titulo": "<degree name>",
      "campo": "<field of study>",
      "fechaInicio": "<start year>",
      "fechaFin": "<end year>",
      "logros": ["<notable achievement, if any>"]
    }
  ],
  "habilidades": ["<skill or technology>", ...],
  "idiomas": [
    { "idioma": "<language>", "nivel": "<level, e.g. Nativo, B2, Avanzado>" }
  ]
}

Rules:
- Use empty string "" for missing fields, empty array [] for missing lists.
- Keep the original language of the CV.
- For experience bullets: keep them as-is, extracted faithfully from the CV.
- Order experience from most recent to oldest.
- Skills: list them individually (no grouping), deduplicate.

CV TEXT:
---
${cvText}
---
`.trim()

// ─── Improve CV content applying ATS suggestions ─────────────────────────────

const IMPROVE_PROMPT = (cvData: RawCVData, suggestions: Suggestion[]) => `
You are a professional CV optimizer. You will receive a structured CV and a list of ATS improvement recommendations.
Rewrite and enhance the CV content to apply those recommendations while respecting strict rules.

STRICT RULES:
- DO NOT invent new experience, education, certifications or dates.
- DO NOT change personal info (nombre, email, telefono, linkedin, ubicacion, website).
- DO improve the "resumen" to be more keyword-rich and ATS-friendly based on the recommendations.
- DO improve experience "bullets" to be more quantified, action-verb-led and keyword-rich.
- DO add missing skills from the recommendations to the "habilidades" array (only real skills, not soft skills).
- DO keep the original language of the CV.
- NEVER concatenate adjacent string fields. Always preserve spaces and separators between empresa, cargo, fechaInicio and fechaFin.
- Return ONLY valid JSON with the exact same structure as the input — no markdown, no extra text.

CURRENT CV (JSON):
${JSON.stringify(cvData, null, 2)}

ATS IMPROVEMENT RECOMMENDATIONS:
${suggestions.map((s, i) => `${i + 1}. ${s.titulo}\n${s.pasos.map(p => `   - ${p.texto}`).join('\n')}`).join('\n\n')}

Return the improved CV as JSON with the exact same structure.
`.trim()

// ─── Helper: add generated IDs to raw entries ────────────────────────────────

function genId() { return Math.random().toString(36).slice(2, 9) }

function hydrateCVData(raw: RawCVData): CVData {
  return {
    personalInfo: raw.personalInfo ?? {
      nombre: '', cargo: '', email: '', telefono: '',
      linkedin: '', ubicacion: '', website: '',
    },
    resumen: raw.resumen ?? '',
    experiencia: (raw.experiencia ?? []).map(e => ({ ...e, id: genId() })),
    educacion:   (raw.educacion ?? []).map(e => ({ ...e, id: genId() })),
    habilidades: raw.habilidades ?? [],
    idiomas:     (raw.idiomas ?? []).map(l => ({ ...l, id: genId() })),
  }
}

function parseGeminiJson(text: string): RawCVData {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  return JSON.parse(cleaned)
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function parseCVToEditor(cvText: string): Promise<CVData> {
  const result = await model.generateContent(PARSE_PROMPT(cvText))
  const raw = parseGeminiJson(result.response.text())
  return hydrateCVData(raw)
}

export async function improveCVWithSuggestions(
  cvData: CVData,
  suggestions: Suggestion[],
): Promise<CVData> {
  // Strip IDs before sending to Gemini (cleaner prompt)
  const raw: RawCVData = {
    personalInfo: cvData.personalInfo,
    resumen:      cvData.resumen,
    experiencia:  cvData.experiencia.map(({ id: _id, ...rest }) => rest),
    educacion:    cvData.educacion.map(({ id: _id, ...rest }) => rest),
    habilidades:  cvData.habilidades,
    idiomas:      cvData.idiomas.map(({ id: _id, ...rest }) => rest),
  }
  const result = await model.generateContent(IMPROVE_PROMPT(raw, suggestions))
  const improved = parseGeminiJson(result.response.text())
  // Preserve personal info exactly (Gemini should not change it, but just in case)
  improved.personalInfo = raw.personalInfo
  return hydrateCVData(improved)
}
