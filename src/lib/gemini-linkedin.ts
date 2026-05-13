import type { LinkedInResult } from '@/types/linkedin'
import { withGeminiRetry } from '@/lib/gemini-retry'
import { nanComplete } from '@/lib/nan-client'

function buildLinkedInPrompt(profileText: string, lang: 'es' | 'en'): string {
  const langInstruction = lang === 'en'
    ? 'Respond in English. Write ALL text values in English.'
    : 'Respond in Spanish (Castilian). Write ALL text values in Spanish.'
  return `You are an expert LinkedIn profile optimizer and personal branding consultant. Your tone is direct, human and free of unnecessary jargon.

LANGUAGE: ${langInstruction} JSON keys and enum values must always stay as specified.

The user has pasted the text content of their LinkedIn profile. Analyze it and return ONLY valid JSON — no markdown, no text outside the JSON object.

Required fields:

- "nombre": only the person's first name extracted from the profile (no surnames).

- "saludo": 2-4 sentence paragraph in the specified language. Start with a casual greeting using the person's name, then give an overall assessment of the LinkedIn profile quality. Mention specific strengths and the main gaps. Be specific about elements from the profile.

- "saludoTerminos": array of 2-5 exact substrings from "saludo" to highlight in bold (must appear literally in "saludo"). Do not include the person's name.

- "headline": short technical phrase (max 15 words) about the overall LinkedIn profile state. in the specified language.

- "overallScore": number 0-100. Calculate as the exact weighted average of the 6 category scores using these fixed weights: Titular y propuesta de valor 25%, Resumen/About 20%, Experiencia y logros 25%, Habilidades y validaciones 15%, Formación y certificaciones 5%, Completitud y visibilidad 10%. Round to the nearest integer.

  Score calibration — use these anchors to avoid score inflation:
  - 85–100: Exceptional profile, fully optimised, strong keyword presence, quantified achievements, all sections complete. Very rare.
  - 70–84: Strong profile with minor gaps. Competitive but with a few areas to polish.
  - 50–69: Average profile with noticeable weaknesses in at least 2–3 categories.
  - Below 50: Significant gaps — missing sections, weak headline, no quantified achievements, low visibility.
  Most LinkedIn profiles have real room for improvement and should score between 45 and 72. Do not round up charitably.

- "completitud": number 0-100 estimating how complete the profile is (presence of photo mention, headline, about, experience with bullets, education, skills, recommendations, contact info).

- "skillsDetectadas": array of up to 15 skills and technologies detected in the profile. Use canonical English names for technologies.

- "categories": evaluate these 6 LinkedIn-specific categories (name them in the specified language):
  1. Titular y propuesta de valor — Is the headline compelling beyond a simple job title? Does it include keywords?
  2. Resumen / About — Length, hook, keywords, call to action, personality
  3. Experiencia y logros — Bullet points per role, quantified achievements, keywords
  4. Habilidades y validaciones — Skills section completeness, relevance, ordering
  5. Formación y certificaciones — Education completeness, relevant certifications
  6. Completitud y visibilidad — Profile photo mentioned, custom URL, recommendations, contact info, activity

  For each category:
  - "category": category name in the specified language
  - "score": number 0-100
  - "status": "good" (≥75), "needs-work" (50-74) or "critical" (<50)
  - "summary": one direct sentence about the state of this area in the specified language
  - "suggestions": array of exactly 3 objects with:
    - "titulo": short actionable title in the specified language
    - "pasos": array of exactly 3 concrete steps, each with:
      - "texto": specific action in the specified language
      - "terminos": array of 1-3 exact substrings from "texto" to bold
    - "prioridad": "alta", "media" or "baja"

- "topPriorities": array of 3 concrete actions in the specified language (infinitive, gender-neutral).

IMPORTANT:
- This is a LinkedIn profile analysis. Do NOT give CV or résumé advice. Do not comment on CV formatting, CV sections, or CV structure.
- Only flag real issues found in the provided text. Do not invent problems or sections.
- NEVER mention, suggest moving, or recommend adding a section that does not appear explicitly in the provided profile text. If there is no "Hobbies", "Interests", "Volunteer", or any other section in the text — do not mention it at all.
- When flagging an issue, always include a direct quote (in quotes) from the profile text that supports the finding. Never make generic recommendations without citing specific text from the profile.
- The overallScore must be based on objective criteria.
- ALL generated text must be in the specified language.
- NEVER open with flattery, praise, or motivational phrases. Do not say things like "great profile", "impressive background", "excellent presence", or any equivalent. Go straight to the assessment.
- If the profile has significant gaps or a low score, say so directly from the first sentence. Do not soften weak results with positivity first.

JSON structure:
{
  "nombre": "<string>",
  "saludo": "<string>",
  "saludoTerminos": ["<substring>", ...],
  "headline": "<string>",
  "overallScore": <number>,
  "completitud": <number>,
  "skillsDetectadas": ["<string>", ...],
  "categories": [
    {
      "category": "<string>",
      "score": <number>,
      "status": "<good|needs-work|critical>",
      "summary": "<string>",
      "suggestions": [
        {
          "titulo": "<string>",
          "pasos": [{ "texto": "<string>", "terminos": ["<substring>", ...] }],
          "prioridad": "<alta|media|baja>"
        }
      ]
    }
  ],
  "topPriorities": ["<string>", "<string>", "<string>"]
}

LINKEDIN PROFILE TEXT:
---
${profileText}
---`
}

function deduplicateProfileText(text: string): string {
  const paragraphs = text.split(/\n{2,}/)
  const seen = new Set<string>()
  return paragraphs
    .map(p => p.trim())
    .filter(p => {
      if (!p) return false
      const key = p.toLowerCase().replace(/\s+/g, ' ')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .join('\n\n')
}

export async function analyzeLinkedIn(profileText: string, lang: 'es' | 'en' = 'es'): Promise<LinkedInResult> {
  const cleanedText = deduplicateProfileText(profileText)
  const prompt = buildLinkedInPrompt(cleanedText, lang)
  const text = await withGeminiRetry(() => nanComplete(prompt))

  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let parsed: LinkedInResult
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
  parsed.completitud      = parsed.completitud ?? 0
  parsed.skillsDetectadas = parsed.skillsDetectadas ?? []

  return parsed
}
