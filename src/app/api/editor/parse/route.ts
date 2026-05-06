import { NextRequest, NextResponse } from 'next/server'
import { parseCVToEditor, improveCVWithSuggestions } from '@/lib/gemini-editor'
import type { CVData } from '@/types/cv'
import type { Suggestion } from '@/types/analysis'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mode, cvText, cvData, suggestions } = body as {
      mode: 'parse' | 'improve'
      cvText?: string
      cvData?: CVData
      suggestions?: Suggestion[]
    }

    if (mode === 'parse') {
      if (!cvText || cvText.trim().length < 50) {
        return NextResponse.json({ error: 'No hay texto de CV suficiente para parsear.' }, { status: 400 })
      }
      const result = await parseCVToEditor(cvText.slice(0, 60_000))
      return NextResponse.json(result)
    }

    if (mode === 'improve') {
      if (!cvData || !suggestions?.length) {
        return NextResponse.json({ error: 'Faltan datos del CV o las recomendaciones.' }, { status: 400 })
      }
      const result = await improveCVWithSuggestions(cvData, suggestions)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Modo desconocido.' }, { status: 400 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
