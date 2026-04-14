import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tipo, mensaje, nombre, email, pagina } = body

    if (!mensaje?.trim()) {
      return NextResponse.json({ error: 'El mensaje es obligatorio.' }, { status: 400 })
    }

    const { error } = await supabase.from('feedback').insert({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tipo: String(tipo || 'otro').slice(0, 50),
      mensaje: String(mensaje).trim().slice(0, 2000),
      nombre: nombre ? String(nombre).trim().slice(0, 100) : null,
      email: email ? String(email).trim().slice(0, 200) : null,
      pagina: pagina ? String(pagina).slice(0, 200) : null,
      fecha: new Date().toISOString(),
    })

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error inesperado.' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('fecha', { ascending: false })

    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, resuelto } = await req.json()
    if (!id) return NextResponse.json({ error: 'id requerido.' }, { status: 400 })

    const update: Record<string, unknown> = {
      resuelto: !!resuelto,
      fecha_resolucion: resuelto ? new Date().toISOString() : null,
    }

    const { data, error } = await supabase
      .from('feedback')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ ok: true, entry: data })
  } catch {
    return NextResponse.json({ error: 'Error inesperado.' }, { status: 500 })
  }
}
