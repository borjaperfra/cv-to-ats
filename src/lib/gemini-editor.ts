import { GoogleGenerativeAI } from '@google/generative-ai'
import type { CVData, SkillCategories } from '@/types/cv'
import type { Suggestion } from '@/types/analysis'
import { withGeminiRetry } from '@/lib/gemini-retry'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set.')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-preview',
  generationConfig: { temperature: 0 },
})

// ─── Types returned by Gemini (no IDs) ───────────────────────────────────────

type RawExperiencia = Omit<CVData['experiencia'][0], 'id'>
type RawEducacion   = Omit<CVData['educacion'][0], 'id'>
type RawIdioma      = Omit<CVData['idiomas'][0], 'id'>
type RawProyecto    = Omit<CVData['proyectos'][0], 'id'>

interface RawCVData {
  personalInfo: CVData['personalInfo']
  resumen:      string
  experiencia:  RawExperiencia[]
  proyectos:    RawProyecto[]
  educacion:    RawEducacion[]
  habilidades:  SkillCategories
  idiomas:      RawIdioma[]
}

const EMPTY_SKILLS: SkillCategories = { languages: [], frameworks: [], databases: [], tools: [], practices: [] }

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
  "resumen": "",
  "experiencia": [
    {
      "empresa": "<company name>",
      "cargo": "<job title>",
      "ubicacion": "<location>",
      "fechaInicio": "<start date, e.g. 'Jan 2022'>",
      "fechaFin": "<end date or empty if current>",
      "actual": <true if current job, false otherwise>,
      "bullets": ["<achievement or responsibility>", ...]
    }
  ],
  "proyectos": [
    {
      "nombre": "<project name>",
      "descripcion": "<brief description of what you built and the impact>",
      "url": "<url or empty string>"
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
  "habilidades": {
    "languages":  ["<programming language>", ...],
    "frameworks": ["<framework or library>", ...],
    "databases":  ["<database>", ...],
    "tools":      ["<tool, platform or technology>", ...],
    "practices":  ["<methodology or practice>", ...]
  },
  "idiomas": [
    { "idioma": "<language>", "nivel": "<level, e.g. Native, B2, Advanced>" }
  ]
}

Rules:
- Use empty string "" for missing text fields, empty array [] for missing lists.
- Keep the original language of the CV for names and descriptions.
- For experience bullets: keep them as-is, extracted faithfully from the CV.
- Order experience from most recent to oldest.
- Skills: categorize each skill into the most appropriate group. Deduplicate.
- Projects: extract any personal, open-source or notable side projects. Leave array empty if none.

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
- DO improve experience "bullets" to be more quantified, action-verb-led and keyword-rich.
- DO add missing skills from the recommendations to the appropriate "habilidades" category (only real skills, not soft skills).
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
  const skills = raw.habilidades ?? EMPTY_SKILLS
  return {
    personalInfo: raw.personalInfo ?? {
      nombre: '', cargo: '', email: '', telefono: '',
      linkedin: '', ubicacion: '', website: '',
    },
    resumen: raw.resumen ?? '',
    experiencia: (raw.experiencia ?? []).map(e => ({ ...e, id: genId() })),
    proyectos:   (raw.proyectos ?? []).map(p => ({ ...p, id: genId(), url: p.url ?? '' })),
    educacion:   (raw.educacion ?? []).map(e => ({ ...e, id: genId() })),
    habilidades: {
      languages:  skills.languages  ?? [],
      frameworks: skills.frameworks ?? [],
      databases:  skills.databases  ?? [],
      tools:      skills.tools      ?? [],
      practices:  skills.practices  ?? [],
    },
    idiomas: (raw.idiomas ?? []).map(l => ({ ...l, id: genId() })),
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
  const result = await withGeminiRetry(() => model.generateContent(PARSE_PROMPT(cvText)))
  const raw = parseGeminiJson(result.response.text())
  return hydrateCVData(raw)
}

export async function improveCVWithSuggestions(
  cvData: CVData,
  suggestions: Suggestion[],
): Promise<CVData> {
  const raw: RawCVData = {
    personalInfo: cvData.personalInfo,
    resumen:      cvData.resumen,
    experiencia:  cvData.experiencia.map(({ id: _id, ...rest }) => rest),
    proyectos:    cvData.proyectos.map(({ id: _id, ...rest }) => rest),
    educacion:    cvData.educacion.map(({ id: _id, ...rest }) => rest),
    habilidades:  cvData.habilidades,
    idiomas:      cvData.idiomas.map(({ id: _id, ...rest }) => rest),
  }
  const result = await withGeminiRetry(() => model.generateContent(IMPROVE_PROMPT(raw, suggestions)))
  const improved = parseGeminiJson(result.response.text())
  improved.personalInfo = raw.personalInfo
  return hydrateCVData(improved)
}
