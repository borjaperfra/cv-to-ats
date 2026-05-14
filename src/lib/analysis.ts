import type { ATSAnalysisResult, CategoryAnalysis, Suggestion } from '@/types/analysis'
import { withGeminiRetry } from '@/lib/api-retry'
import { nanComplete } from '@/lib/nan-client'

// Weights must match the category order below (keywords, format, experience, education, contact, length)
const CATEGORY_WEIGHTS = [0.30, 0.25, 0.20, 0.10, 0.10, 0.05]

function buildAnalysisPrompt(cvText: string, lang: 'es' | 'en'): string {
  const langInstruction = lang === 'en'
    ? 'Respond in English. Write ALL text values in English.'
    : 'Respond in Spanish (Castilian). Write ALL text values in Spanish.'
  const today = new Date().toISOString().slice(0, 10)

  return `You are an expert ATS (Applicant Tracking Systems) consultant. Your tone is direct, human and free of unnecessary jargon.

TODAY'S DATE: ${today}. Use this as the reference for all temporal reasoning. Do NOT flag dates on or before today as future dates.

LANGUAGE: ${langInstruction}
Exception: JSON keys and enum values must always stay as specified (e.g. "alta"/"media"/"baja", "good"/"needs-work"/"critical").

Analyze the following CV and return ONLY valid JSON — no markdown, no text outside the JSON object.

─── SCORING ───────────────────────────────────────────────────────────────────

Required top-level fields:

- "nombre": only the person's first name extracted from the CV (no surnames).

- "saludo": 2-4 sentence paragraph in the specified language. The first sentence is a casual, direct greeting using the person's name, followed by a quick score assessment. The following sentences highlight the CV's strengths and then the main issues lowering the ATS score. Use gender-neutral language. Be specific and mention concrete elements from the CV. When mentioning skills or technologies, reflect the CV's stated proficiency level exactly — never upgrade or downgrade it. If the CV qualifies a skill as "autodidacta", "aprendizaje propio", "familiar", "básico" or equivalent, preserve that qualifier. Official certifications always indicate verified, demonstrable expertise and must be reflected as such.

- "saludoTerminos": array of 2-5 exact substrings from the "saludo" field that represent the most important technical terms or concrete problems to highlight in bold (they must appear literally in "saludo"). Do not include the person's name.

- "headline": short technical phrase (max 15 words) about the ATS state of the CV in the specified language.

- "skillsDetectadas": array of detected technologies, tools and technical skills in the CV. Max 15 items, no duplicates, no descriptions — just the name (e.g. "React", "Python", "Figma", "SQL"). Use the canonical English name for technologies regardless of CV language. Prioritise skills backed by certifications or extensive work experience over skills only mentioned as self-taught or familiar. Normalise certification codes to the technology name (e.g. "AZ-900", "AZ-104", "AZ-305" → "Azure"; "AWS SAA-C03", "AWS-DVA" → "AWS"; "CKA", "CKAD" → "Kubernetes"; "GCP ACE" → "GCP"). If the 15-item limit is reached, drop self-taught mentions before dropping certified or heavily-used skills.

- "metricas": object with:
  - "palabras": approximate total word count of the CV
  - "paginasEstimadas": estimated number of pages (1–4)
  - "densidadKeywords": percentage of ATS-relevant keywords over total words (0–100)

- "alertasCriticas": array of strings in the specified language describing severe issues that can cause ATS parsing failures. Only include real problems detected in the text (e.g. photo detected, multiple columns, complex tables, decorative special characters, URLs with spaces). Empty array [] if no critical alerts.

- "gapsCarrera": array of strings in the specified language describing detected employment gaps of 6 months or more between consecutive work experiences. Each string must name the specific gap (e.g. "8 meses sin actividad laboral entre Empresa X (mar 2021) y Empresa Y (nov 2021)"). Return empty array [] if no significant gaps found. This is informational only — do NOT alter category scores because of gaps.

- "topPriorities": array of 3 concrete actions in the specified language (infinitive phrases, gender-neutral). Each must reference something specific found (or missing) in this CV — a real section, skill, job title, or gap. Never write a priority that could apply to any CV.

─── CATEGORIES ────────────────────────────────────────────────────────────────

Evaluate these 6 categories using the scoring criteria below. For each, produce:
- "category": category name in the specified language
- "score": number 0-100 (apply criteria mechanically — count exactly, do not estimate)
- "status": "good" (≥75), "needs-work" (50-74) or "critical" (<50)
- "summary": one direct sentence about the state of this area in the specified language
- "suggestions": improvement suggestions for this category (see SUGGESTIONS section below)

Scoring criteria:

1. Keywords & skills — count each unique, explicitly named technology, programming language, framework, library, database, cloud platform, DevOps/MLOps tool, named methodology (e.g. Scrum, Kanban), or professional certification. Each item counts once regardless of how often it appears. Do NOT count generic soft skills ("communication", "leadership"), job titles, industry names, or vague phrases ("web technologies", "cloud experience").
   - 85–100: 15+ distinct items | 70–84: 10–14 | 55–69: 6–9 | 35–54: 3–5 | <35: 0–2

2. Format & parseability — start at 90. Apply deductions only for confirmed, unambiguous issues. When in doubt, do NOT deduct.
   - Two or more text columns running side by side (not a simple two-cell table): −35
   - Main content inside merged-cell tables (not simple bordered boxes): −25
   - CV text exists only as embedded images (no selectable text at all): −60
   - Non-standard decorative characters used as the sole bullet style (★, ⬛, custom glyphs — not "•" or "-"): −10
   If none of the above apply, score exactly 90. Do not invent penalties.

3. Work experience structure — for each role, check four binary elements: company name present? Job title present? Start date present? End date or "present" present? Description (at least one line) present? Count total omissions across all roles.
   - 85–100: 0 omissions | 70–84: 1–2 omissions | 50–69: 3–5 omissions | <50: 6+ omissions

4. Education & certifications — institution name + degree/qualification + year = complete entry.
   - 85–100: ≥1 complete entry + certifications if listed | 65–84: complete entry, no certs | 50–64: partial entries | <50: sparse or absent

5. Contact information — email (+25 pts), phone (+25 pts), city/country (+25 pts), LinkedIn or portfolio URL (+25 pts). Score = sum of present elements × 25. Apply mechanically.

6. Length & file optimization — based on estimated page count only.
   - 90–100: 1–2 pages | 70–84: 3 pages | 45–69: 4 pages | <45: 5+ pages or under 200 words

─── SUGGESTIONS ───────────────────────────────────────────────────────────────

For each category, write improvement suggestions. Number of suggestions based on the score you assign:
- score < 50 → 4 suggestions
- score 50–74 → 3 suggestions
- score ≥ 75 → 2 suggestions

Each suggestion must follow this structure:
- "titulo": short actionable title in the specified language
- "pasos": exactly 3 steps, each with:
  - "texto": concrete step in 1-2 sentences, naming specific CV content
  - "terminos": array of 1-3 key substrings from "texto" that appear literally in "texto"
- "prioridad": "alta" if category score < 60, "media" if 60–74, "baja" if ≥ 75
- "sugerencia": short (max 50 words) copy-paste ready text example showing improved content, or null if no concrete rewrite is possible

MANDATORY SUGGESTION RULES:
1. Every step MUST reference something specific from THIS CV: an exact sentence, job title, company name, date range, section name, or skill. If you cannot point to a specific element, do not write that step.
2. Quote or directly name specific CV content in every step.
3. Each suggestion must tackle a DIFFERENT problem within its category.
4. STRICTLY FORBIDDEN steps: "Add more keywords", "Quantify your achievements with numbers", "Make sure your contact information is complete", "Use a clean ATS-friendly format", "Tailor your CV to the job description", or any step that does not name a specific CV element.
5. NEVER suggest changing, correcting, or updating date ranges, employment years, or graduation years. All dates are facts from the candidate's history.
6. NEVER describe experience as "outdated" based on the year it occurred.
7. NEVER suggest reordering work experience chronologically if the most recent position already appears first.
8. Do NOT duplicate advice across suggestions — each suggestion in the entire response must address a unique problem.
9. NEVER suggest removing the candidate's name without specifying exactly where it should appear instead.

─── IMPORTANT ─────────────────────────────────────────────────────────────────

- Ignore platform-generated metadata, template branding, page numbers, or website footers (e.g. 'getmanfred.com', 'BUT WAIT', repeated decorative separators, standalone page numbers). Do not penalise the CV for this content.
- ALL generated text must be in the SAME language as specified.
- FIDELITY TO STATED LEVELS: Never infer an expertise level beyond what the CV explicitly states. The CV's own qualifiers ("certified", "autodidacta", "learning", "familiar with", "básico", "en progreso") are ground truth — do not override them.

─── JSON STRUCTURE ────────────────────────────────────────────────────────────

{
  "nombre": "<string>",
  "saludo": "<string>",
  "saludoTerminos": ["<substring>", ...],
  "headline": "<string>",
  "skillsDetectadas": ["<string>", ...],
  "metricas": {
    "palabras": <number>,
    "paginasEstimadas": <number>,
    "densidadKeywords": <number>
  },
  "alertasCriticas": ["<string>", ...],
  "gapsCarrera": ["<string>", ...],
  "topPriorities": ["<string>", "<string>", "<string>"],
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
              "terminos": ["<string>", ...]
            }
          ],
          "prioridad": "<alta|media|baja>",
          "sugerencia": "<string|null>"
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

interface AnalysisResult {
  nombre:           string
  saludo:           string
  saludoTerminos:   string[]
  headline:         string
  categories:       Array<{
    category:    string
    score:       number
    status:      string
    summary:     string
    suggestions: Suggestion[]
  }>
  skillsDetectadas: string[]
  metricas:         { palabras: number; paginasEstimadas: number; densidadKeywords: number }
  alertasCriticas:  string[]
  gapsCarrera:      string[]
  topPriorities:    string[]
}

function parseJson<T>(text: string): T {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  return JSON.parse(cleaned) as T
}

export async function analyzeWithGemini(cvText: string, lang: 'es' | 'en' = 'es'): Promise<ATSAnalysisResult> {
  const responseText = await withGeminiRetry(() => nanComplete(buildAnalysisPrompt(cvText, lang)))

  let result: AnalysisResult
  try {
    result = parseJson<AnalysisResult>(responseText)
  } catch {
    throw new Error('Error al procesar la respuesta. Por favor, inténtalo de nuevo.')
  }

  if (!Array.isArray(result.categories) || result.categories.length === 0) {
    throw new Error('La respuesta no tenía los campos necesarios. Por favor, inténtalo de nuevo.')
  }

  const overallScore = Math.round(
    result.categories
      .slice(0, 6)
      .reduce((sum, cat, i) => sum + (cat.score ?? 0) * (CATEGORY_WEIGHTS[i] ?? 0), 0)
  )

  const categories: CategoryAnalysis[] = result.categories.map(c => ({
    category:    c.category,
    score:       c.score,
    status:      c.status as CategoryAnalysis['status'],
    summary:     c.summary,
    suggestions: Array.isArray(c.suggestions) ? c.suggestions : [],
  }))

  return {
    overallScore,
    nombre:           result.nombre ?? '',
    saludo:           result.saludo ?? result.headline ?? '',
    saludoTerminos:   result.saludoTerminos ?? [],
    headline:         result.headline ?? '',
    skillsDetectadas: result.skillsDetectadas ?? [],
    metricas:         result.metricas,
    alertasCriticas:  result.alertasCriticas ?? [],
    gapsCarrera:      result.gapsCarrera ?? [],
    categories,
    topPriorities:    result.topPriorities ?? [],
    analyzedAt:       new Date().toISOString(),
  }
}
