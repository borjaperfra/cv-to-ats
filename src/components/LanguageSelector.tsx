'use client'

import { useState, useEffect, useCallback } from 'react'

export type Lang = 'es' | 'en'
export const LANG_KEY = 'atsLang'
export const DEFAULT_LANG: Lang = 'es'

export function getLang(): Lang {
  if (typeof window === 'undefined') return DEFAULT_LANG
  return (localStorage.getItem(LANG_KEY) as Lang) || DEFAULT_LANG
}

interface LanguageSelectorProps {
  /** If true, shows a "se aplicará al próximo análisis" hint on change */
  showHint?: boolean
}

export default function LanguageSelector({ showHint = false }: LanguageSelectorProps) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG)
  const [hint, setHint] = useState(false)
  const [hintTimer, setHintTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLangState(getLang())
  }, [])

  const select = useCallback((l: Lang) => {
    if (l === lang) return
    localStorage.setItem(LANG_KEY, l)
    setLangState(l)
    window.dispatchEvent(new CustomEvent('langchange', { detail: l }))

    if (showHint) {
      setHint(true)
      if (hintTimer) clearTimeout(hintTimer)
      const t = setTimeout(() => setHint(false), 3000)
      setHintTimer(t)
    }
  }, [lang, showHint, hintTimer])

  // Cleanup timer on unmount
  useEffect(() => () => { if (hintTimer) clearTimeout(hintTimer) }, [hintTimer])

  return (
    <div className="relative">
      <div className="flex rounded-lg p-0.5 ml-2" style={{ backgroundColor: '#f3f4f6' }}>
        {(['es', 'en'] as const).map(l => (
          <button
            key={l}
            onClick={() => select(l)}
            className="font-sans font-[700] text-xs px-2.5 py-1.5 rounded-md uppercase tracking-wider transition-all duration-200"
            style={lang === l
              ? { backgroundColor: '#092c64', color: '#ffffff' }
              : { color: '#9ca3af' }}
          >
            {l}
          </button>
        ))}
      </div>

      {showHint && hint && (
        <div
          className="absolute top-full right-0 mt-2 z-50 whitespace-nowrap font-sans text-xs px-3 py-1.5 rounded-lg shadow-md"
          style={{ backgroundColor: '#1a2744', color: '#ffffff' }}
        >
          Se aplicará al próximo análisis
          {/* arrow */}
          <span
            className="absolute -top-1.5 right-4 w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '6px solid #1a2744',
            }}
          />
        </div>
      )}
    </div>
  )
}
