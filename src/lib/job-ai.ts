import type { JobAnalysisResult } from '@/types/job'
import { withGeminiRetry } from '@/lib/api-retry'
import { nanComplete } from '@/lib/nan-client'

function buildJobPrompt(jdText: string, lang: 'es' | 'en'): string {
  const langInstruction = lang === 'en'
    ? 'Respond in English. Write ALL text values in English.'
    : 'Respond in Spanish (Castilian). Write ALL text values in Spanish.'

  return `You are an expert recruiter and career advisor. Your tone is direct, honest, and has a slight sense of humor when warranted. You analyze job offers and tell candidates what the offer really says — and what it conspicuously does not say.

LANGUAGE: ${langInstruction}

Analyze the job offer below. Return ONLY valid JSON — no markdown, no text outside the JSON object.

Score calibration (0-100). Score the offer as a whole based on transparency, clarity, and respect for the candidate:
- 85-100: Excellent offer. Transparent salary, clear role, realistic requirements, concrete culture signals, respectful process.
- 65-84: Good offer with minor gaps. Mostly transparent but missing some information.
- 45-64: Average offer. Notable gaps or some red flags but worth investigating.
- 25-44: Below average. Several red flags or key information is missing.
- 0-24: Poor offer. Multiple red flags, vague, unrealistic requirements, or deceptive language.

Analyze these dimensions to form your score and findings:
1. Salary transparency — is it mentioned? is it a range? is it vague ("según valía", "competitive salary")?
2. Requirements sanity — are there too many technologies for the experience level? are years-of-experience requirements absurd relative to the technology's age?
3. Work modality — is remote/hybrid/on-site clearly stated? are the specific conditions (e.g. number of days) given?
4. Role clarity — does the candidate know what they will actually do day-to-day?
5. Culture signals — are there concrete culture indicators, or just empty phrases like "buen ambiente" and "empresa líder"?
6. Hiring process — is the selection process described? how many stages? is there a timeline?
7. Benefits quality — are the benefits meaningful, or are they filler (free fruit, table football, "flexible hours" as a perk)?
8. Suspicious urgency — does "immediate incorporation" suggest high rotation? is there unusual pressure?
9. Salary-requirements coherence — if a salary is mentioned, does it match the seniority and number of requirements?
10. Team and project context — is there any information about the team size, project stage, or company context?

Required JSON fields:

- "score": number 0-100

- "puesto": job title extracted from the offer. Empty string if not found.

- "empresa": company name extracted from the offer. Empty string if not found.

- "resumen": 2-3 sentences. Give a direct, honest assessment of the offer with slight humor where appropriate. Be specific: reference actual content from the offer. Do NOT start with flattery or praise. If the offer is poor, say so clearly from the first sentence. If it is excellent, explain why concisely.

- "veredicto": one punchy headline, maximum 10 words. Newspaper-style. Captures the essence of the offer with a touch of irony if warranted. Should feel like a headline, not a description.

- "senalesPositivas": array of 1-5 positive signals found in the offer. Each item: { "titulo": short label (3-6 words), "descripcion": 1-2 sentences explaining why this is a good sign for the candidate }. Include at least one even if the offer is poor.

- "senalesAlerta": array of 1-6 red flags or concerns. Each item: { "titulo": short label (3-6 words), "descripcion": 1-2 sentences explaining why this matters and what it might signal }. Include at least one even if the offer is excellent.

- "loQueNoDice": array of 2-5 strings. Important information that is conspicuously absent from the offer. Frame as factual observations, not accusations. Example: "No menciona el salario", "No especifica los días de teletrabajo", "No describe el proceso de selección".

RULES:
- Be specific: reference actual phrases or content from the offer
- "loQueNoDice" contains absences, not opinions or red flag interpretations
- Never be cruel, offensive, or attack the company — gentle irony only
- If the offer is genuinely excellent, score it high and explain why honestly
- All text values must be in the specified language

JSON structure:
{
  "score": <number>,
  "puesto": "<string>",
  "empresa": "<string>",
  "resumen": "<string>",
  "veredicto": "<string>",
  "senalesPositivas": [{ "titulo": "<string>", "descripcion": "<string>" }],
  "senalesAlerta": [{ "titulo": "<string>", "descripcion": "<string>" }],
  "loQueNoDice": ["<string>", ...]
}

JOB OFFER:
---
${jdText}
---`
}

export async function analyzeJobWithAI(jdText: string, lang: 'es' | 'en' = 'es'): Promise<JobAnalysisResult> {
  const prompt = buildJobPrompt(jdText, lang)
  const text = await withGeminiRetry(() => nanComplete(prompt))

  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  let parsed: JobAnalysisResult
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Error al procesar la respuesta. Por favor, inténtalo de nuevo.')
  }

  if (typeof parsed.score !== 'number' || !Array.isArray(parsed.senalesPositivas)) {
    throw new Error('La respuesta no tenía los campos necesarios. Por favor, inténtalo de nuevo.')
  }

  parsed.puesto            = parsed.puesto ?? ''
  parsed.empresa           = parsed.empresa ?? ''
  parsed.resumen           = parsed.resumen ?? ''
  parsed.veredicto         = parsed.veredicto ?? ''
  parsed.senalesPositivas  = parsed.senalesPositivas ?? []
  parsed.senalesAlerta     = parsed.senalesAlerta ?? []
  parsed.loQueNoDice       = parsed.loQueNoDice ?? []

  return parsed
}
