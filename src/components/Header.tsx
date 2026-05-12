'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import LanguageSelector, { getLang, type Lang } from './LanguageSelector'

const LABELS = {
  es: {
    analyzeCV: 'Analizar CV',
    cvEditor: 'Editor CV',
    matchCv: 'CV vs Oferta',
    cvsAnalyzed: (n: string) => `${n} CVs analizados`,
    language: 'Idioma',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
  },
  en: {
    analyzeCV: 'Analyse CV',
    cvEditor: 'CV Editor',
    matchCv: 'CV vs Job',
    cvsAnalyzed: (n: string) => `${n} CVs analysed`,
    language: 'Language',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
  },
}

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
  const [lang, setLang] = useState<Lang>('es')

  useEffect(() => {
    setLang(getLang())
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => setCvsAnalyzed(d.cvs_analyzed))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: Event) => setLang((e as CustomEvent<Lang>).detail)
    window.addEventListener('langchange', handler)
    return () => window.removeEventListener('langchange', handler)
  }, [])

  const L = LABELS[lang]

  const navLinks = [
    { href: '/',       label: L.analyzeCV },
    { href: '/editor', label: L.cvEditor },
    { href: '/match',  label: L.matchCv },
  ]

  return (
    <header className={`bg-white border-b sticky top-0 z-10${noPrint ? ' no-print' : ''}`}
      style={{ borderColor: '#e5e0d8' }}>
      <div className="max-w-container mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <a href="https://getmanfred.com" target="_blank" rel="noopener noreferrer"
            className="hover:opacity-70 transition-opacity duration-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-manfred.svg" alt="Manfred" className="h-6 sm:h-7 w-auto block" />
          </a>
          <span className="w-px h-5 bg-gray-light mx-1 sm:mx-2 self-center" />
          <a href="/" className="flex items-center gap-1 hover:opacity-70 transition-opacity duration-200">
            <span className="font-sans font-[900] text-navy text-sm sm:text-base uppercase tracking-widest self-center leading-none">
              ATS Killer
            </span>
            <span className="font-sans font-[700] text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full self-center ml-1"
              style={{ backgroundColor: '#01FFC6', color: '#092c64' }}>
              Beta
            </span>
          </a>
        </div>

        {/* CVs analyzed counter */}
        {cvsAnalyzed !== null && (
          <span className="hidden sm:flex items-center gap-1.5 font-sans text-xs" style={{ color: '#9ca3af' }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#01FFC6' }} />
            {L.cvsAnalyzed(cvsAnalyzed.toLocaleString('es-ES'))}
          </span>
        )}

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {navLinks.map(link => (
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
        </nav>

        {/* Mobile: hamburger */}
        <div className="flex sm:hidden items-center">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="p-2 rounded-lg transition-colors duration-200"
            style={{ color: menuOpen ? '#0DA1A4' : '#9ca3af' }}
            aria-label={menuOpen ? L.closeMenu : L.openMenu}
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
          {navLinks.map(link => (
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
          <div className="px-3 py-3 flex items-center gap-3">
            <span className="font-sans font-[700] text-xs uppercase tracking-wider text-gray-400">{L.language}</span>
            <LanguageSelector showHint />
          </div>
        </div>
      )}
    </header>
  )
}
