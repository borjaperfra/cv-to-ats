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

- "saludo": 2-4 sentence paragraph in the specified language. The first sentence is a casual, direct greeting using the person's name, followed by a quick score assessment. The following sentences highlight the CV's strengths and then the main issues lowering the ATS score. Use gender-neutral language. Be specific and mention concrete elements from the CV. When mentioning skills or technologies, reflect the CV's stated proficiency level exactly — never upgrade or downgrade it. If the CV qualifies a skill as "autodidacta", "aprendizaje propio", "familiar", "básico" or equivalent, preserve that qualifier. Official certifications always indicate verified, demonstrable expertise and must be reflected as such.

- "saludoTerminos": array of 2-5 exact substrings from the "saludo" field that represent the most important technical terms or concrete problems to highlight in bold (they must appear literally in "saludo"). Do not include the person's name.

- "headline": short technical phrase (max 15 words) about the ATS state of the CV. in the specified language.

- "overallScore": number 0-100. Calculate as the exact weighted average of the 6 category scores using these fixed weights: Keywords & skills 30%, Format & parseability 25%, Work experience structure 20%, Education & certifications 10%, Contact information 10%, Length & file optimization 5%. Round to the nearest integer.

  Score calibration — apply these objective, measurable anchors:
  - 85–100: ATS-ready: 12+ distinct technical skills, clean single-column structure, all roles have company+title+dates+description, full contact info.
  - 70–84: Good CV: 7–11 skills, readable format with minor issues, most roles complete, contact info mostly present.
  - 50–69: Functional but improvable: <7 skills OR structural issues, some incomplete roles, some contact info missing.
  - 35–49: Significant gaps in 2+ categories: very few keywords, missing sections, multiple incomplete roles.
  - Below 35: Severe problems — nearly no keywords, unparseable format, or critical information missing.

  Per-category scoring criteria (apply mechanically):

  Keywords & skills: count unique technical skills, tools, technologies, and methodologies explicitly named.
  - 85–100: 15+ distinct items | 70–84: 10–14 | 55–69: 6–9 | 35–54: 3–5 | <35: 0–2

  Format & parseability: penalise ONLY for confirmed parsing obstacles (multi-column layout, merged-cell tables, embedded images, decorative special characters as bullets, text-as-image). A clean, well-structured CV with standard section headers scores 85–100. Do NOT deduct for professional formatting, clear typography, or organised layout.
  - 85–100: clean single-column, standard headers | 65–84: minor issues | 45–64: some obstacles | <45: severe or unparseable

  Work experience structure: for each role, check: company name present? Job title present? Dates (start/end) present? Description present?
  - 85–100: all 4 elements in every role | 70–84: 1–2 minor omissions | 50–69: several roles missing 1–2 elements | <50: many incomplete roles

  Education & certifications: institution name + degree/qualification + year = complete entry.
  - 85–100: ≥1 complete entry + certifications if listed | 65–84: complete entry, no certs | 50–64: partial entries | <50: sparse or absent

  Contact information: email (+25 pts), phone (+25 pts), city/country (+25 pts), LinkedIn or portfolio URL (+25 pts). Total = sum of present elements.

  Length & file optimization: based on estimated page count.
  - 90–100: 1–2 pages | 70–84: 3 pages | 45–69: 4 pages | <45: 5+ pages or under 200 words

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

- "skillsDetectadas": array of detected technologies, tools and technical skills in the CV. Max 15 items, no duplicates, no descriptions — just the name (e.g. "React", "Python", "Figma", "SQL"). Use the canonical English name for technologies regardless of CV language. Prioritise skills backed by certifications or extensive work experience over skills only mentioned as self-taught or familiar. Normalise certification codes to the technology name (e.g. "AZ-900", "AZ-104", "AZ-305" → "Azure"; "AWS SAA-C03", "AWS-DVA" → "AWS"; "CKA", "CKAD" → "Kubernetes"; "GCP ACE" → "GCP"). If the 15-item limit is reached, drop self-taught mentions before dropping certified or heavily-used skills.

- "metricas": object with:
  - "palabras": approximate total word count of the CV
  - "paginasEstimadas": estimated number of pages (1–4)
  - "densidadKeywords": percentage of ATS-relevant keywords over total words (0–100)

- "alertasCriticas": array of strings in the specified language describing severe issues that can cause ATS parsing failures. Only include real problems detected in the text (e.g. photo detected, multiple columns, complex tables, decorative special characters, URLs with spaces). Empty array [] if no critical alerts.

- "gapsCarrera": array of strings in the specified language describing detected employment gaps of 6 months or more between consecutive work experiences. Each string must name the specific gap (e.g. "8 meses sin actividad laboral entre Empresa X (mar 2021) y Empresa Y (nov 2021)"). Return empty array [] if no significant gaps found. This is informational only — do NOT alter category scores because of gaps.

- "topPriorities": array of 3 concrete actions in the specified language (infinitive phrases, gender-neutral). Each must reference something specific found (or missing) in this CV — a real section, skill, job title, or gap. Never write a priority that could apply to any CV.

IMPORTANT:
- Ignore any text that appears to be platform-generated metadata, template branding, page numbers, or website footers (e.g. text containing 'getmanfred.com', 'BUT WAIT', repeated decorative separators, standalone page numbers). Do not penalise the CV for this content.
- The overallScore must be reproducible: base the score on objective, measurable criteria, not subjective impressions.
- ALL generated text must be in the SAME language as the CV.
- FIDELITY TO STATED LEVELS: Never infer an expertise level beyond what the CV explicitly states. The CV's own qualifiers ("certified", "autodidacta", "learning", "familiar with", "básico", "en progreso") are ground truth — do not override them based on how frequently a technology appears or how prominent it looks in the text. A skill mentioned once with a certification outweighs the same skill mentioned many times without one.

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
  "gapsCarrera": ["<string>", ...],
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
  const today = new Date().toISOString().slice(0, 10)

  const categoryLines = categories
    .map(c => {
      const n = suggestionCount(c.score)
      const label = c.score < 50 ? 'CRITICAL' : c.score < 75 ? 'NEEDS-WORK' : 'GOOD'
      return `- "${c.category}" (score: ${c.score}, ${label}) → write exactly ${n} suggestions`
    })
    .join('\n')

  return `You are an ATS consultant. A CV has already been scored. Your ONLY task now is to write hyper-specific, deeply personalised improvement suggestions for each category.

TODAY'S DATE: ${today}. Use this as the definitive reference for all temporal reasoning.

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
7. NEVER suggest changing, correcting, or updating date ranges, employment years, graduation years, or any other temporal information. All dates in the CV are facts from the candidate's history — do not flag them as wrong, future, outdated, or in need of updating.
8. NEVER describe experience as "outdated" based on the year it occurred. Do not suggest that any listed experience is in the future or needs its dates corrected.
9. Each suggestion MUST include a "sugerencia" field: a short (max 50 words), copy-paste ready text example showing what the improved content looks like. Write only the specific text to add or replace — not an instruction. For example: if adding skills, write the updated skills line ("Figma, Design Thinking, Wireframing"); if rewriting a bullet, write the improved bullet. If no concrete text rewrite is possible, set to null.
10. NEVER suggest reordering work experience chronologically if the most recent position already appears first. A role listed as "Actualidad", "actual", "Present", or paired with the most recent year is already correctly positioned at the top. Assume reverse chronological order is correct unless you find a concrete violation (an older date appearing before a newer date).
11. Do NOT duplicate advice across suggestions. Each suggestion in this entire response must address a unique, distinct problem — if you have already addressed moving content, removing a section, or adding a skill in another suggestion, do not repeat it in a different one.
12. NEVER suggest removing or eliminating the candidate's name from the CV without specifying exactly where it should appear instead. If the name appears in an unexpected place, suggest moving it to the header — never suggest deleting it without providing an alternative placement in the same step.

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
          "prioridad": "<alta|media|baja>",
          "sugerencia": "<copy-paste text example or null>"
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
  gapsCarrera:      string[]
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
    gapsCarrera:      scoring.gapsCarrera ?? [],
    categories,
    topPriorities:    scoring.topPriorities ?? [],
    analyzedAt:       new Date().toISOString(),
  }
}
