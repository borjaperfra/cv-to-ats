import { NextRequest, NextResponse } from 'next/server'
import { extractCVText } from '@/lib/extractors'
import { nanComplete } from '@/lib/nan-client'
import { withGeminiRetry } from '@/lib/gemini-retry'

export const runtime = 'nodejs'
export const maxDuration = 30

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('cvFile') as File | null
    if (!file || !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ skills: [], country: null })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const cvText = await extractCVText(buffer, file.name, 3)
    if (cvText.trim().length < 50) {
      return NextResponse.json({ skills: [], country: null })
    }

    const prompt = `Extract two things from this CV text:

1. A flat list of concrete technical skills: programming languages, frameworks, databases, cloud platforms, tools, methodologies. Be specific (e.g. "React" not "front-end"). Max 25 items.
2. The country where this person currently resides or works. Look at address, phone prefix (+34 = Spain), recent job locations, city names. Return the English country name (e.g. "Spain", "France", "Germany"), or null if genuinely unknown.

Return ONLY valid JSON with no extra text: {"skills":["skill1","skill2"],"country":"Spain"}

CV TEXT:
${cvText.slice(0, 6000)}`

    const raw = await withGeminiRetry(() => nanComplete(prompt))
    const parsed = JSON.parse(raw) as { skills?: unknown; country?: unknown }

    const skills = Array.isArray(parsed.skills)
      ? (parsed.skills as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 25)
      : []
    const country = typeof parsed.country === 'string' ? parsed.country : null

    return NextResponse.json({ skills, country })
  } catch {
    return NextResponse.json({ skills: [], country: null })
  }
}
