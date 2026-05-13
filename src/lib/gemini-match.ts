import type { MatchResult } from '@/types/match'
import { withGeminiRetry } from '@/lib/gemini-retry'
import { nanComplete } from '@/lib/nan-client'

function buildMatchPrompt(cvText: string, jdText: string, lang: 'es' | 'en'): string {
  const langInstruction = lang === 'en'
    ? 'Respond in English. Write ALL text values in English.'
    : 'Respond in Spanish (Castilian). Write ALL text values in Spanish.'
  return `You are an expert ATS and recruitment consultant. Your tone is direct, human and free of unnecessary jargon.

LANGUAGE: ${langInstruction}

Analyze the fit between the CV and the job description below. Return ONLY valid JSON — no markdown, no text outside the JSON object.

Required fields:

- "nombre": only the person's first name extracted from the CV (no surnames).

- "puestoBuscado": job title extracted from the job description.

- "empresa": company name from the job description, or empty string if not found.

- "matchScore": number 0-100 representing how well the CV matches this specific job. Be objective: base it on keyword overlap, required experience, skills alignment, and seniority fit.

  Score calibration — use these anchors to avoid score inflation:
  - 85–100: Near-perfect match. CV covers almost all required skills, correct seniority, strong keyword overlap. Very rare.
  - 65–84: Good match with minor gaps. Candidate is competitive but missing a few important requirements.
  - 40–64: Partial match. Noticeable gaps in skills, experience level, or keyword coverage. Needs meaningful CV tailoring.
  - Below 40: Poor match. The CV lacks multiple key requirements or the seniority is clearly off.
  Most CVs analyzed against a real job description have meaningful gaps and should score between 40 and 70. Do not inflate scores out of optimism.

- "resumenMatch": 2-3 sentence paragraph in the specified language. Start with a direct overall assessment of the match, then describe the main strengths and the most critical gaps. Be specific about elements from both the CV and the JD.

- "resumenMatchTerminos": array of 2-5 exact substrings from "resumenMatch" to highlight in bold (must appear literally in "resumenMatch"). Do not include the person's name.

- "keywordsPresentes": array of up to 12 keywords/skills from the JD that are present in the CV. Use the exact term from the JD.

- "keywordsFaltantes": array of up to 12 important keywords/skills/requirements from the JD that are missing or insufficiently represented in the CV. Sorted by importance.

- "sugerencias": array of exactly 4 to 6 specific suggestions to better tailor the CV to this job. Each suggestion:
  - "titulo": short actionable title in the specified language
  - "pasos": array of exactly 3 concrete steps, each with:
    - "texto": specific action in the specified language
    - "terminos": array of 1-3 exact substrings from "texto" to bold
  - "prioridad": "alta", "media" or "baja"

JSON structure:
{
  "nombre": "<string>",
  "puestoBuscado": "<string>",
  "empresa": "<string>",
  "matchScore": <number>,
  "resumenMatch": "<string>",
  "resumenMatchTerminos": ["<substring>", ...],
  "keywordsPresentes": ["<string>", ...],
  "keywordsFaltantes": ["<string>", ...],
  "sugerencias": [
    {
      "titulo": "<string>",
      "pasos": [{ "texto": "<string>", "terminos": ["<substring>", ...] }],
      "prioridad": "<alta|media|baja>"
    }
  ]
}

IMPORTANT:
- All text values must be in the specified language. The "prioridad" values must always be "alta", "media" or "baja".
- NEVER open with flattery, praise, or motivational phrases. Do not say things like "great profile", "impressive background", "you have a lot to offer", or any equivalent. Go straight to the assessment.
- If the match is low or medium, say so directly and clearly from the first sentence. Do not soften bad news with positivity first.

CV TEXT:
---
${cvText}
---

JOB DESCRIPTION:
---
${jdText}
---`
}

export async function matchWithGemini(cvText: string, jdText: string, lang: 'es' | 'en' = 'es'): Promise<MatchResult> {
  const prompt = buildMatchPrompt(cvText, jdText, lang)
  const text = await withGeminiRetry(() => nanComplete(prompt))

  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let parsed: MatchResult
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Error al procesar la respuesta. Por favor, inténtalo de nuevo.')
  }

  if (typeof parsed.matchScore !== 'number' || !Array.isArray(parsed.sugerencias)) {
    throw new Error('La respuesta no tenía los campos necesarios. Por favor, inténtalo de nuevo.')
  }

  parsed.nombre              = parsed.nombre ?? ''
  parsed.empresa             = parsed.empresa ?? ''
  parsed.resumenMatchTerminos = parsed.resumenMatchTerminos ?? []
  parsed.keywordsPresentes   = parsed.keywordsPresentes ?? []
  parsed.keywordsFaltantes   = parsed.keywordsFaltantes ?? []

  return parsed
}
