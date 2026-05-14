'use client'

import { useState, useEffect } from 'react'

interface ExportButtonProps {
  variant?: 'outline' | 'solid'
}

export default function ExportButton({ variant = 'outline' }: ExportButtonProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
  }, [])

  const handleExport = () => window.print()

  const solidClass =
    'inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] font-sans font-[700] text-xs uppercase tracking-wider transition-all duration-300 bg-navy text-white hover:opacity-80'

  const outlineClass =
    'inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] border-2 border-teal text-teal font-sans font-[900] text-xs uppercase tracking-wider hover:bg-teal hover:text-white transition-all duration-300'

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleExport}
        className={variant === 'solid' ? solidClass : outlineClass}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Descargar PDF
      </button>
      {isMobile && (
        <p className="font-sans text-[10px] text-gray-400 leading-tight">
          En el menú de impresión, selecciona &ldquo;Guardar como PDF&rdquo;
        </p>
      )}
    </div>
  )
}
