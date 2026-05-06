'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import LanguageSelector from './LanguageSelector'

const NAV_LINKS = [
  { href: '/',          label: 'Analizar CV' },
  { href: '/editor',    label: 'Editor CV' },
]

function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/' || pathname.startsWith('/results')
  return pathname === href || pathname.startsWith(href + '/')
}

interface HeaderProps {
  noPrint?: boolean
}

export default function Header({ noPrint = false }: HeaderProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [cvsAnalyzed, setCvsAnalyzed] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => setCvsAnalyzed(d.cvs_analyzed))
      .catch(() => {})
  }, [])

  return (
    <header className={`bg-white border-b sticky top-0 z-10${noPrint ? ' no-print' : ''}`}
      style={{ borderColor: '#e5e0d8' }}>
      <div className="max-w-container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">

        {/* Logo */}
        <a href="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity duration-200 flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-manfred.svg" alt="Manfred" className="h-6 sm:h-7 w-auto block" />
          <span className="w-px h-5 bg-gray-light mx-1 sm:mx-2 self-center" />
          <span className="font-sans font-[900] text-navy text-sm sm:text-base uppercase tracking-widest self-center leading-none">
            ATS Killer
          </span>
          <span className="font-sans font-[700] text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full self-center ml-1"
            style={{ backgroundColor: '#01FFC6', color: '#092c64' }}>
            Beta
          </span>
        </a>

        {/* CVs analyzed counter */}
        {cvsAnalyzed !== null && (
          <span className="hidden sm:flex items-center gap-1.5 font-sans text-xs" style={{ color: '#9ca3af' }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#01FFC6' }} />
            {cvsAnalyzed.toLocaleString('es-ES')} CVs analizados
          </span>
        )}

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map(link => (
            <a key={link.href} href={link.href}
              className="font-sans font-[700] text-xs uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors duration-200"
              style={isActive(link.href, pathname)
                ? { color: '#0DA1A4', backgroundColor: '#e6f7f7' }
                : { color: '#9ca3af' }}
            >
              {link.label}
            </a>
          ))}
          <LanguageSelector showHint />
          <button
            onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login' }}
            className="font-sans font-[700] text-xs uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors duration-200"
            style={{ color: '#9ca3af' }}
            title="Cerrar sesión"
          >
            Salir
          </button>
        </nav>

        {/* Mobile: only hamburger — language goes inside the dropdown */}
        <div className="flex sm:hidden items-center">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="p-2 rounded-lg transition-colors duration-200"
            style={{ color: menuOpen ? '#0DA1A4' : '#9ca3af' }}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden bg-white border-t px-4 py-2 space-y-1" style={{ borderColor: '#f3f4f6' }}>
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center font-sans font-[700] text-sm uppercase tracking-wider px-3 py-3 rounded-xl transition-colors duration-200"
              style={isActive(link.href, pathname)
                ? { color: '#0DA1A4', backgroundColor: '#e6f7f7' }
                : { color: '#374151' }}
            >
              {link.label}
            </a>
          ))}
          {/* Language selector inside mobile menu */}
          <div className="px-3 py-3 flex items-center gap-3">
            <span className="font-sans font-[700] text-xs uppercase tracking-wider text-gray-400">Idioma</span>
            <LanguageSelector showHint />
          </div>
          <button
            onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login' }}
            className="flex w-full items-center font-sans font-[700] text-sm uppercase tracking-wider px-3 py-3 rounded-xl transition-colors duration-200"
            style={{ color: '#9ca3af' }}
          >
            Salir
          </button>
        </div>
      )}
    </header>
  )
}
