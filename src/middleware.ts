import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PATHS = ['/admin']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only admin routes require authentication
  if (!PROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const secret = process.env.AUTH_SECRET
  if (!secret) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const session = request.cookies.get('auth-session')?.value
  if (session !== secret) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.jpg|logo-manfred.svg).*)'],
}
