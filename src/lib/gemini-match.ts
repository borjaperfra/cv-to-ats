import type { MatchResult, MatchSuggestion } from '@/types/match'
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

  Score calibration — use these anchors for balanced, objective scoring:
  - 85–100: Near-perfect match. CV covers almost all required skills, correct seniority, strong keyword overlap.
  - 68–84: Good match with minor gaps. Candidate is competitive but missing a few requirements.
  - 45–67: Partial match. Some gaps in skills, experience level, or keyword coverage. CV tailoring would help.
  - Below 45: Poor match. The CV lacks several key requirements or the seniority is clearly off.
  Aim for accuracy: reward genuine alignment, but flag real gaps without exaggerating them.

- "resumenMatch": 2-3 sentence paragraph in the specified language. Start with a direct overall assessment of the match, then describe the main strengths and the most critical gaps. Be specific about elements from both the CV and the JD.

- "resumenMatchTerminos": array of 2-5 exact substrings from "resumenMatch" to highlight in bold (must appear literally in "resumenMatch"). Do not include the person's name.

- "keywordsPresentes": array of up to 12 keywords/skills from the JD that are present in the CV. Use the exact term from the JD.

- "keywordsFaltantes": array of up to 12 important keywords/skills/requirements from the JD that are missing or insufficiently represented in the CV. Sorted by importance.

- "requisitosExcluyentes": array of up to 6 requirements from the JD that are strictly mandatory (look for: "required", "mandatory", "must have", "essential", "imprescindible", "requerido", "necesario", "obligatorio"). If no explicit mandatory markers exist, infer the 3-4 most critical technical requirements from the role's core responsibilities. Include only requirements that are MISSING from the CV. Empty array [] if the CV meets all critical requirements.

- "sugerencias": array of exactly 4 to 6 career development suggestions. Each suggestion addresses a specific gap between the CV and this job offer — NOT advice on how to rewrite the CV, but concrete actions the candidate should take to genuinely close the gap: a course or certification to obtain, a side project to build, or a type of experience to seek. Each suggestion:
  - "tipo": one of "formacion" (course, certification, study), "proyecto" (build something concrete), "experiencia" (seek a specific type of real-world exposure)
  - "titulo": short actionable title in the specified language (infinitive verb, e.g. "Certificarse en AWS", "Construir una API con GraphQL")
  - "descripcion": 2-3 sentences in the specified language. First: which specific gap from this job offer it addresses (name the exact missing skill or requirement). Then: what concretely to do and why it raises the match.
  - "terminos": array of 1-3 exact substrings from "descripcion" that should be highlighted in bold (key skills or actions). Must appear literally in "descripcion".
  - "impacto": "alto" if this closes a knockout or critical requirement, "medio" if it fills an important gap, "bajo" if it adds a nice-to-have.
  - "recursos": array of 1-3 specific, named resources — exact course titles, certification names, platforms, or tools (e.g. "AWS Certified Solutions Architect – Associate", "Kubernetes for Developers (CKAD)", "The Odin Project"). Empty array if no obvious specific resource applies.

RULES for sugerencias:
- Each suggestion must address a DIFFERENT gap. Do not write two suggestions about the same missing skill.
- Sort by impacto descending: "alto" first, then "medio", then "bajo".
- Name the specific skill, technology, or requirement from the JD in every descripcion — never write generic advice.
- NEVER suggest rewriting or editing the CV. These are real career actions, not document edits.

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
  "requisitosExcluyentes": ["<string>", ...],
  "sugerencias": [
    {
      "tipo": "<formacion|proyecto|experiencia>",
      "titulo": "<string>",
      "descripcion": "<string>",
      "terminos": ["<substring>", ...],
      "impacto": "<alto|medio|bajo>",
      "recursos": ["<string>", ...]
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

  parsed.nombre                = parsed.nombre ?? ''
  parsed.empresa               = parsed.empresa ?? ''
  parsed.resumenMatchTerminos  = parsed.resumenMatchTerminos ?? []
  parsed.keywordsPresentes     = parsed.keywordsPresentes ?? []
  parsed.keywordsFaltantes     = parsed.keywordsFaltantes ?? []
  parsed.requisitosExcluyentes = parsed.requisitosExcluyentes ?? []

  return parsed
}
