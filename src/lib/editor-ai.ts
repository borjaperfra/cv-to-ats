import type { CVData, SkillCategories } from '@/types/cv'
import type { Suggestion } from '@/types/analysis'
import type { CvLang } from '@/lib/cv-labels'
import { withGeminiRetry } from '@/lib/api-retry'
import { nanComplete } from '@/lib/nan-client'

// ─── Types returned by NaN (no IDs) ──────────────────────────────────────────

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
You are a CV data extractor. Your ONLY task is to extract what is explicitly written in the CV text below. Return ONLY valid JSON — no markdown, no text outside the JSON object.

CRITICAL ANTI-HALLUCINATION RULES — NO EXCEPTIONS:
- ONLY extract content that appears explicitly in the CV text. Never invent, infer, or complete missing information.
- If a field is not present in the CV text, use "" for strings or [] for arrays. Never guess or fabricate.
- Copy names, dates, companies, job titles, and bullets VERBATIM from the source text. Do not paraphrase or improve them.
- Do NOT add skills, experience, education, or any other data that is not literally written in the CV.
- If you are not certain a field appears in the text, leave it empty.

Return exactly this structure:
{
  "personalInfo": {
    "nombre": "<full name as written in CV, or empty>",
    "cargo": "<current professional title or most recent role as written, or empty>",
    "email": "<email as written, or empty>",
    "telefono": "<phone as written, or empty>",
    "linkedin": "<linkedin url or username as written, or empty>",
    "ubicacion": "<city, country as written, or empty>",
    "website": "<personal website or portfolio url as written, or empty>"
  },
  "resumen": "<summary or profile section verbatim, or empty string if not present>",
  "experiencia": [
    {
      "empresa": "<company name as written>",
      "cargo": "<job title as written>",
      "ubicacion": "<location as written, or empty>",
      "fechaInicio": "<start date as written, e.g. 'Jan 2022'>",
      "fechaFin": "<end date as written, or empty if current>",
      "actual": <true if current job, false otherwise>,
      "bullets": ["<bullet or responsibility copied verbatim from CV>"]
    }
  ],
  "proyectos": [
    {
      "nombre": "<project name as written>",
      "descripcion": "<description as written>",
      "url": "<url as written, or empty string>"
    }
  ],
  "educacion": [
    {
      "institucion": "<institution name as written>",
      "titulo": "<degree name as written>",
      "campo": "<field of study as written, or empty>",
      "fechaInicio": "<start year as written, or empty>",
      "fechaFin": "<end year as written, or empty>",
      "logros": ["<achievement as written, if any>"]
    }
  ],
  "habilidades": {
    "languages":  ["<programming/scripting/query languages found in CV>"],
    "frameworks": ["<libraries, frameworks, runtimes found in CV>"],
    "databases":  ["<database systems found in CV>"],
    "tools":      ["<DevOps, cloud, build, testing tools found in CV>"],
    "practices":  ["<methodologies and practices found in CV>"]
  },
  "idiomas": [
    { "idioma": "<language as written>", "nivel": "<level as written>" }
  ]
}

Additional rules:
- Order experience from most recent to oldest.
- CRITICAL: universities, colleges, schools, bootcamps, or any academic institution belong ONLY in "educacion". NEVER place them in "experiencia", even if they appear chronologically alongside jobs.
- Skills categorization: assign each skill to exactly one category (languages=programming languages, frameworks=libraries/runtimes, databases=data stores, tools=DevOps/cloud/build, practices=methodologies). Never put all skills in one category.
- CRITICAL: preserve ALL characters as they appear — accented letters (á, é, í, ó, ú, ñ, ç, etc.) must be output as real Unicode, not escape sequences.

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
- DO add missing skills from the recommendations to the appropriate "habilidades" category (only real technical skills, not soft skills). Use the same categorization rules: languages=programming languages, frameworks=libraries/runtimes, databases=data stores, tools=DevOps/cloud/build tools, practices=methodologies.
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

function decodeUnicodeEscapes(s: string): string {
  // If the model emits literal \uXXXX sequences as text (double-escaped),
  // decode them before JSON.parse so accents and ñ are restored correctly.
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  )
}

function parseNaNJson(text: string): RawCVData {
  const cleaned = decodeUnicodeEscapes(
    text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
  )
  return JSON.parse(cleaned)
}

// ─── Translate CV content ─────────────────────────────────────────────────────

const TRANSLATE_PROMPT = (cvData: RawCVData, targetLang: CvLang) => `
You are a professional CV translator. Translate the CV content below to ${targetLang === 'en' ? 'English' : 'Spanish'}.

STRICT RULES — translate ONLY these fields:
- personalInfo.cargo
- experiencia[].cargo
- experiencia[].bullets[] (every bullet string)
- proyectos[].descripcion
- educacion[].titulo
- educacion[].campo
- educacion[].logros[] (every achievement string)

DO NOT translate (keep byte-for-byte identical):
- personalInfo.nombre, email, telefono, linkedin, ubicacion, website
- experiencia[].empresa, experiencia[].ubicacion, experiencia[].fechaInicio, experiencia[].fechaFin, experiencia[].actual
- educacion[].institucion, educacion[].fechaInicio, educacion[].fechaFin
- proyectos[].nombre, proyectos[].url
- habilidades (all skill arrays — technology names are universal)
- idiomas (language names and levels)
- resumen

Keep proper nouns (product names, framework names, acronyms) unchanged even inside translated strings.
Return ONLY valid JSON with the exact same structure as the input — no markdown, no extra text.

CV JSON:
${JSON.stringify(cvData, null, 2)}
`.trim()

// ─── Public functions ─────────────────────────────────────────────────────────

export async function parseCVToEditor(cvText: string): Promise<CVData> {
  const text = await withGeminiRetry(() => nanComplete(PARSE_PROMPT(cvText)))
  const raw = parseNaNJson(text)
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
  const text = await withGeminiRetry(() => nanComplete(IMPROVE_PROMPT(raw, suggestions)))
  const improved = parseNaNJson(text)
  improved.personalInfo = raw.personalInfo
  return hydrateCVData(improved)
}

export async function translateCVContent(cvData: CVData, targetLang: CvLang): Promise<CVData> {
  const raw: RawCVData = {
    personalInfo: cvData.personalInfo,
    resumen:      cvData.resumen,
    experiencia:  cvData.experiencia.map(({ id: _id, ...rest }) => rest),
    proyectos:    cvData.proyectos.map(({ id: _id, ...rest }) => rest),
    educacion:    cvData.educacion.map(({ id: _id, ...rest }) => rest),
    habilidades:  cvData.habilidades,
    idiomas:      cvData.idiomas.map(({ id: _id, ...rest }) => rest),
  }
  const text = await withGeminiRetry(() => nanComplete(TRANSLATE_PROMPT(raw, targetLang)))
  const translated = parseNaNJson(text)
  translated.personalInfo = raw.personalInfo
  translated.habilidades = raw.habilidades
  translated.idiomas = raw.idiomas
  return hydrateCVData(translated)
}
