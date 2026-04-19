import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ATSAnalysisResult } from '@/types/analysis'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set.')
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({
  model: 'gemini-3-flash-preview',
  generationConfig: { temperature: 0 },
})

function buildPrompt(cvText: string, lang: 'es' | 'en'): string {
  const langInstruction = lang === 'en'
    ? 'Respond in English. Write ALL text values in English.'
    : 'Respond in Spanish (Castilian). Write ALL text values in Spanish.'
  const today = new Date().toISOString().slice(0, 10)
  return `You are an expert ATS (Applicant Tracking Systems) consultant. Your tone is direct, human and free of unnecessary jargon.

TODAY'S DATE: ${today}. Use this as the reference for all temporal reasoning. Do NOT flag dates on or before today as future dates.

LANGUAGE: ${langInstruction}
Exception: JSON keys and enum values must always stay as specified (e.g. "alta"/"media"/"baja", "good"/"needs-work"/"critical").

Analyze the following CV and return ONLY valid JSON — no markdown, no text outside the JSON object.

Required fields:

- "nombre": only the person's first name extracted from the CV (no surnames).

- "saludo": 2-4 sentence paragraph in the specified language. The first sentence is a casual, direct greeting using the person's name, followed by a quick score assessment. The following sentences highlight the CV's strengths and then the main issues lowering the ATS score. Use gender-neutral language. Be specific and mention concrete elements from the CV.

- "saludoTerminos": array of 2-5 exact substrings from the "saludo" field that represent the most important technical terms or concrete problems to highlight in bold (they must appear literally in "saludo"). Do not include the person's name.

- "headline": short technical phrase (max 15 words) about the ATS state of the CV. in the specified language.

- "overallScore": number 0-100, weighted average of the categories.

- "categories": evaluate these 6 categories (name them in the specified language):
  1. Keywords & skills
  2. Format & parseability
  3. Work experience structure
  4. Education & certifications
  5. Contact information
  6. Length & file optimization

  For each category:
  - "category": category name in the specified language
  - "score": number 0-100
  - "status": "good" (≥75), "needs-work" (50-74) or "critical" (<50)
  - "summary": one direct sentence about the state of this area in the specified language
  - "suggestions": array of 2 to 4 objects with:
    - "titulo": short actionable title summarizing the improvement group in the specified language
    - "pasos": array of 2-4 objects, each with:
      - "texto": concrete actionable step explained in 1-2 sentences in the specified language. MANDATORY: each step must reference specific content from this CV — quote an actual job title, company name, skill, section name, or explicitly name what is missing and where. Never write a step that could apply to any CV.
      - "terminos": array of 1-3 exact substrings from "texto" that are the most important terms (must appear literally in "texto")
    - "prioridad": "alta", "media" or "baja" (always these exact Spanish values)

- "skillsDetectadas": array of detected technologies, tools and technical skills in the CV. Max 15 items, no duplicates, no descriptions — just the name (e.g. "React", "Python", "Figma", "SQL"). Use the canonical English name for technologies regardless of CV language.

- "metricas": object with:
  - "palabras": approximate total word count of the CV
  - "paginasEstimadas": estimated number of pages (1–4)
  - "densidadKeywords": percentage of ATS-relevant keywords over total words (0–100)

- "alertasCriticas": array of strings in the specified language describing severe issues that can cause ATS parsing failures. Only include real problems detected in the text (e.g. photo detected, multiple columns, complex tables, decorative special characters, URLs with spaces). Empty array [] if no critical alerts.

- "topPriorities": array of 3 concrete actions in the specified language (infinitive phrases, gender-neutral). Each must reference something specific found (or missing) in this CV — a real section, skill, job title, or gap. Never write a priority that could apply to any CV.

IMPORTANT:
- Each suggestion and priority must address a REAL and specific problem found in THIS CV. Do not include generic or trivial suggestions (e.g. "rename the file", "save as PDF", "add more keywords", "quantify your achievements") unless you can point to a concrete, specific instance in this CV that justifies it.
- FORBIDDEN generic patterns — never write steps like: "Add relevant keywords to your CV", "Quantify your achievements with numbers", "Make sure your contact info is complete", "Use a clean format". If you need to make that point, tie it to something specific: which keywords are missing based on what this person does, which specific achievement could be quantified and how, which contact field is actually missing.
- The overallScore must be reproducible: base the score on objective, measurable criteria, not subjective impressions.
- ALL generated text (saludo, headline, summaries, suggestions, alerts, priorities) must be in the SAME language as the CV.

Estructura JSON:
{
  "nombre": "<string>",
  "saludo": "<string>",
  "saludoTerminos": ["<substring>", ...],
  "headline": "<string>",
  "overallScore": <number>,
  "categories": [
    {
      "category": "<string>",
      "score": <number>,
      "status": "<good|needs-work|critical>",
      "summary": "<string>",
      "suggestions": [
        {
          "titulo": "<string>",
          "pasos": [
            {
              "texto": "<string>",
              "terminos": ["<substring>", ...]
            }
          ],
          "prioridad": "<alta|media|baja>"
        }
      ]
    }
  ],
  "skillsDetectadas": ["<string>", ...],
  "metricas": {
    "palabras": <number>,
    "paginasEstimadas": <number>,
    "densidadKeywords": <number>
  },
  "alertasCriticas": ["<string>", ...],
  "topPriorities": ["<string>", "<string>", "<string>"]
}

CV TEXT:
---
${cvText}
---`
}

export async function analyzeWithGemini(cvText: string, lang: 'es' | 'en' = 'es'): Promise<ATSAnalysisResult> {
  const prompt = buildPrompt(cvText, lang)
  const result = await model.generateContent(prompt)
  const text = result.response.text()

  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let parsed: ATSAnalysisResult
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Error al procesar la respuesta. Por favor, inténtalo de nuevo.')
  }

  if (typeof parsed.overallScore !== 'number' || !Array.isArray(parsed.categories)) {
    throw new Error('La respuesta no tenía los campos necesarios. Por favor, inténtalo de nuevo.')
  }

  parsed.nombre           = parsed.nombre ?? ''
  parsed.saludo           = parsed.saludo ?? parsed.headline ?? ''
  parsed.saludoTerminos   = parsed.saludoTerminos ?? []
  parsed.skillsDetectadas = parsed.skillsDetectadas ?? []
  parsed.alertasCriticas  = parsed.alertasCriticas ?? []

  return parsed
}
