import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const { allowed, retryAfter } = checkRateLimit(`login:${ip}`, 5, 3 * 60_000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  const { username, password } = await request.json()

  const validUser = process.env.AUTH_USERNAME
  const validPass = process.env.AUTH_PASSWORD
  const secret    = process.env.AUTH_SECRET

  if (!validUser || !validPass || !secret) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  if (username !== validUser || password !== validPass) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('auth-session', secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
  return response
}
