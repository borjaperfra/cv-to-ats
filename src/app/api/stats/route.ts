import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from('stats')
      .select('value')
      .eq('id', 'cvs_analyzed')
      .single()

    if (error) throw error

    return NextResponse.json(
      { cvs_analyzed: data?.value ?? 0 },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    )
  } catch {
    return NextResponse.json({ cvs_analyzed: 0 })
  }
}
