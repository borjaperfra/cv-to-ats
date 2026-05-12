import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'

const STAT_IDS = [
  'cvs_analyzed',
  'action:match',
  'action:linkedin',
  'action:editor_parse',
  'action:editor_improve',
  'action:editor_translate',
  'action:anonymize',
]

export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from('stats')
      .select('id, value')
      .in('id', STAT_IDS)

    if (error) throw error

    const map = Object.fromEntries((data ?? []).map(r => [r.id as string, r.value as number]))

    return NextResponse.json(
      {
        cvs_analyzed:      map['cvs_analyzed']          ?? 0,
        match:             map['action:match']           ?? 0,
        linkedin:          map['action:linkedin']        ?? 0,
        editor_parse:      map['action:editor_parse']    ?? 0,
        editor_improve:    map['action:editor_improve']  ?? 0,
        editor_translate:  map['action:editor_translate'] ?? 0,
        anonymize:         map['action:anonymize']       ?? 0,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    )
  } catch {
    return NextResponse.json({
      cvs_analyzed: 0, match: 0, linkedin: 0,
      editor_parse: 0, editor_improve: 0, editor_translate: 0, anonymize: 0,
    })
  }
}
