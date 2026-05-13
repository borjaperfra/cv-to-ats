import type { ATSAnalysisResult, CategoryAnalysis, Suggestion } from '@/types/analysis'
import { withGeminiRetry } from '@/lib/gemini-retry'
import { nanComplete } from '@/lib/nan-client'

// ─── Pass 1: scoring ──────────────────────────────────────────────────────────

function buildScoringPrompt(cvText: string, lang: 'es' | 'en'): string {
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

- "overallScore": number 0-100. Calculate as the exact weighted average of the 6 category scores using these fixed weights: Keywords & skills 30%, Format & parseability 25%, Work experience structure 20%, Education & certifications 10%, Contact information 10%, Length & file optimization 5%. Round to the nearest integer.

  Score calibration — use these anchors to avoid score inflation:
  - 85–100: ATS-ready CV, minimal or no issues, strong keyword coverage and clean structure. Very rare.
  - 70–84: Good CV with a few fixable issues. Above-average keyword density and format.
  - 50–69: Noticeable problems in at least 2–3 categories. Most real-world CVs with improvement potential fall here.
  - 30–49: Significant structural or keyword gaps. Multiple categories with critical issues.
  - Below 30: Severe problems — likely unparseable or nearly empty of relevant content.
  Most CVs submitted for analysis have real room for improvement and should score between 45 and 72. Do not round up charitably.

- "categories": evaluate these 6 categories (name them in the specified language):
  1. Keywords & skills
  2. Format & parseability
  3. Work experience structure
  4. Education & certifications
  5. Contact information
  6. Length & file optimization

  For each category return ONLY:
  - "category": category name in the specified language
  - "score": number 0-100
  - "status": "good" (≥75), "needs-work" (50-74) or "critical" (<50)
  - "summary": one direct sentence about the state of this area in the specified language

- "skillsDetectadas": array of detected technologies, tools and technical skills in the CV. Max 15 items, no duplicates, no descriptions — just the name (e.g. "React", "Python", "Figma", "SQL"). Use the canonical English name for technologies regardless of CV language.

- "metricas": object with:
  - "palabras": approximate total word count of the CV
  - "paginasEstimadas": estimated number of pages (1–4)
  - "densidadKeywords": percentage of ATS-relevant keywords over total words (0–100)

- "alertasCriticas": array of strings in the specified language describing severe issues that can cause ATS parsing failures. Only include real problems detected in the text (e.g. photo detected, multiple columns, complex tables, decorative special characters, URLs with spaces). Empty array [] if no critical alerts.

- "topPriorities": array of 3 concrete actions in the specified language (infinitive phrases, gender-neutral). Each must reference something specific found (or missing) in this CV — a real section, skill, job title, or gap. Never write a priority that could apply to any CV.

IMPORTANT:
- Ignore any text that appears to be platform-generated metadata, template branding, page numbers, or website footers (e.g. text containing 'getmanfred.com', 'BUT WAIT', repeated decorative separators, standalone page numbers). Do not penalise the CV for this content.
- The overallScore must be reproducible: base the score on objective, measurable criteria, not subjective impressions.
- ALL generated text must be in the SAME language as the CV.

JSON structure:
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
      "summary": "<string>"
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

// ─── Pass 2: suggestions ──────────────────────────────────────────────────────

function suggestionCount(score: number): number {
  if (score < 50) return 4
  if (score < 65) return 3
  return 2
}

function buildSuggestionsPrompt(
  cvText: string,
  categories: Array<{ category: string; score: number }>,
  lang: 'es' | 'en',
): string {
  const langInstruction = lang === 'en'
    ? 'Respond in English. Write ALL text values in English.'
    : 'Respond in Spanish (Castilian). Write ALL text values in Spanish.'

  const categoryLines = categories
    .map(c => {
      const n = suggestionCount(c.score)
      const label = c.score < 50 ? 'CRITICAL' : c.score < 75 ? 'NEEDS-WORK' : 'GOOD'
      return `- "${c.category}" (score: ${c.score}, ${label}) → write exactly ${n} suggestions`
    })
    .join('\n')

  return `You are an ATS consultant. A CV has already been scored. Your ONLY task now is to write hyper-specific, deeply personalised improvement suggestions for each category.

LANGUAGE: ${langInstruction} JSON keys and enum values must stay as specified.

CATEGORIES AND REQUIRED SUGGESTION COUNTS:
${categoryLines}

MANDATORY RULES — NO EXCEPTIONS:
1. Every single step MUST reference something specific from THIS CV. Before writing a step, identify the exact sentence, job title, company name, date range, section name, or skill from the CV that it addresses. If you cannot point to a specific element in the CV, do not write that step.
2. Quote or directly name specific CV content in every step: the actual position title, company name, skill, section header, or date range involved.
3. Each suggestion must tackle a DIFFERENT problem within its category. Do not write variations of the same advice.
4. STRICTLY FORBIDDEN — reject any step matching these patterns:
   - "Add more keywords to your CV"
   - "Quantify your achievements with numbers"
   - "Make sure your contact information is complete"
   - "Use a clean, ATS-friendly format"
   - "Tailor your CV to the job description"
   - Any step that does not name a specific element from this CV
5. "prioridad": use "alta" for categories with score < 60, "media" for 60–74, "baja" for 75+.
6. Each suggestion needs exactly 3 "pasos".

Return ONLY valid JSON — no markdown, no text outside the JSON object:
{
  "categories": [
    {
      "category": "<exact category name from the list above>",
      "suggestions": [
        {
          "titulo": "<short actionable title in the specified language>",
          "pasos": [
            {
              "texto": "<concrete step in 1-2 sentences, naming specific CV content>",
              "terminos": ["<1-3 key substrings from texto that appear literally in texto>"]
            }
          ],
          "prioridad": "<alta|media|baja>"
        }
      ]
    }
  ]
}

CV TEXT:
---
${cvText}
---`
}

// ─── Types for intermediate results ──────────────────────────────────────────

interface ScoringResult {
  nombre:           string
  saludo:           string
  saludoTerminos:   string[]
  headline:         string
  overallScore:     number
  categories:       Array<{ category: string; score: number; status: string; summary: string }>
  skillsDetectadas: string[]
  metricas:         { palabras: number; paginasEstimadas: number; densidadKeywords: number }
  alertasCriticas:  string[]
  topPriorities:    string[]
}

interface SuggestionsResult {
  categories: Array<{ category: string; suggestions: Suggestion[] }>
}

function parseJson<T>(text: string): T {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  return JSON.parse(cleaned) as T
}

// ─── Public function ──────────────────────────────────────────────────────────

export async function analyzeWithGemini(cvText: string, lang: 'es' | 'en' = 'es'): Promise<ATSAnalysisResult> {
  // Pass 1: scoring
  const scoringText = await withGeminiRetry(() => nanComplete(buildScoringPrompt(cvText, lang)))
  let scoring: ScoringResult
  try {
    scoring = parseJson<ScoringResult>(scoringText)
  } catch {
    throw new Error('Error al procesar la respuesta. Por favor, inténtalo de nuevo.')
  }

  if (typeof scoring.overallScore !== 'number' || !Array.isArray(scoring.categories)) {
    throw new Error('La respuesta no tenía los campos necesarios. Por favor, inténtalo de nuevo.')
  }

  // Pass 2: suggestions (runs after scoring so it has the category scores)
  const suggestionsText = await withGeminiRetry(() =>
    nanComplete(buildSuggestionsPrompt(cvText, scoring.categories, lang))
  )
  let suggestionsResult: SuggestionsResult
  try {
    suggestionsResult = parseJson<SuggestionsResult>(suggestionsText)
  } catch {
    suggestionsResult = { categories: [] }
  }

  // Merge: inject suggestions into each category by name match
  const suggestionMap = new Map<string, Suggestion[]>()
  for (const c of suggestionsResult.categories ?? []) {
    if (c.category && Array.isArray(c.suggestions)) {
      suggestionMap.set(c.category.toLowerCase().trim(), c.suggestions)
    }
  }

  const categories: CategoryAnalysis[] = scoring.categories.map((c, i) => ({
    category:    c.category,
    score:       c.score,
    status:      c.status as CategoryAnalysis['status'],
    summary:     c.summary,
    suggestions: suggestionMap.get(c.category.toLowerCase().trim())
      ?? suggestionsResult.categories?.[i]?.suggestions
      ?? [],
  }))

  return {
    overallScore:     scoring.overallScore,
    nombre:           scoring.nombre ?? '',
    saludo:           scoring.saludo ?? scoring.headline ?? '',
    saludoTerminos:   scoring.saludoTerminos ?? [],
    headline:         scoring.headline ?? '',
    skillsDetectadas: scoring.skillsDetectadas ?? [],
    metricas:         scoring.metricas,
    alertasCriticas:  scoring.alertasCriticas ?? [],
    categories,
    topPriorities:    scoring.topPriorities ?? [],
    analyzedAt:       new Date().toISOString(),
  }
}
