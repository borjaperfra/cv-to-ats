import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed, retryAfter } = checkRateLimit(`feedback:${ip}`, 5)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor, espera un momento.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const body = await req.json()
    const { tipo, mensaje, nombre, email, pagina } = body

    if (!mensaje?.trim()) {
      return NextResponse.json({ error: 'El mensaje es obligatorio.' }, { status: 400 })
    }

    const { error } = await getSupabase().from('feedback').insert({
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
    const { data, error } = await getSupabase()
      .from('feedback')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(500)

    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, resuelto, procesado } = body
    if (!id) return NextResponse.json({ error: 'id requerido.' }, { status: 400 })

    const update: Record<string, unknown> = {}

    if (typeof resuelto === 'boolean') {
      update.resuelto = resuelto
      update.fecha_resolucion = resuelto ? new Date().toISOString() : null
    }

    if (typeof procesado === 'boolean') {
      update.procesado = procesado
      update.procesado_en = procesado ? new Date().toISOString() : null
    }

    const { data, error } = await getSupabase()
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
