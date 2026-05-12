'use client'

import { useState, useEffect } from 'react'

const TIPOS = [
  { value: 'bug',        label: 'Error / Bug' },
  { value: 'sugerencia', label: 'Sugerencia' },
  { value: 'idea',       label: 'Idea' },
  { value: 'otro',       label: 'Otro' },
]

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState('sugerencia')
  const [mensaje, setMensaje] = useState('')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [pagina, setPagina] = useState('')

  useEffect(() => {
    setPagina(window.location.pathname)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const handleSubmit = async () => {
    if (!mensaje.trim()) { setError('Escribe tu mensaje antes de enviar.'); return }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, mensaje, nombre, email, pagina }),
      })
      if (!res.ok) throw new Error()
      setDone(true)
      setTimeout(() => {
        setOpen(false)
        setDone(false)
        setMensaje('')
        setNombre('')
        setEmail('')
        setTipo('sugerencia')
      }, 2000)
    } catch {
      setError('No se pudo enviar el feedback. Inténtalo de nuevo.')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setError('')
  }

  return (
    <>
      {/* Floating button — bottom left */}
      <button
        onClick={() => setOpen(true)}
        className="no-print fixed bottom-5 left-4 z-40 flex items-center gap-2 font-sans font-[900] text-xs uppercase tracking-widest text-white px-4 py-2.5 rounded-full transition-all duration-200 hover:opacity-90 active:scale-95"
        style={{
          backgroundColor: '#092c64',
          boxShadow: '0 4px 16px rgba(9,44,100,0.3)',
        }}
        aria-label="Abrir formulario de feedback"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Feedback
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={handleClose}
        >
          {/* Modal */}
          <div
            className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#f3f4f6' }}>
              <div>
                <p className="font-sans font-[900] text-sm uppercase tracking-widest" style={{ color: '#092c64' }}>
                  Deja tu feedback
                </p>
                <p className="font-sans text-xs text-gray-400 mt-0.5">
                  Estamos en Beta · tu opinión mejora la app
                </p>
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {done ? (
              <div className="px-6 py-12 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e6f7f7' }}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#0DA1A4' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-sans font-[800] text-base" style={{ color: '#1a2744' }}>Gracias por tu feedback</p>
                <p className="font-sans text-sm text-gray-400 text-center">Nos ayuda a mejorar la herramienta.</p>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-4">
                {/* Type selector */}
                <div>
                  <label className="block font-sans font-[600] text-xs uppercase tracking-wider text-gray-400 mb-2">
                    Tipo
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TIPOS.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setTipo(t.value)}
                        className="font-sans font-[700] text-xs px-3 py-1.5 rounded-full border-2 transition-all duration-150"
                        style={{
                          borderColor: tipo === t.value ? '#0DA1A4' : '#e5e7eb',
                          color: tipo === t.value ? '#0DA1A4' : '#9ca3af',
                          backgroundColor: tipo === t.value ? '#e6f7f7' : 'transparent',
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block font-sans font-[600] text-xs uppercase tracking-wider text-gray-400 mb-2">
                    Mensaje <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    value={mensaje}
                    onChange={e => { setMensaje(e.target.value); setError('') }}
                    onKeyDown={e => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault()
                        handleSubmit()
                      }
                    }}
                    placeholder="Cuéntanos qué has encontrado, qué mejorarías o qué echas en falta..."
                    rows={4}
                    className="w-full font-sans text-sm rounded-xl border px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-teal/30 transition-all"
                    style={{ borderColor: error ? '#ef4444' : '#e5e7eb', color: '#1a2744' }}
                  />
                  <p className="font-sans text-xs text-gray-400 mt-1">
                    <kbd className="font-sans text-xs px-1 py-0.5 rounded border" style={{ borderColor: '#d1d5db', backgroundColor: '#f9fafb' }}>Ctrl+Enter</kbd> para enviar · <kbd className="font-sans text-xs px-1 py-0.5 rounded border" style={{ borderColor: '#d1d5db', backgroundColor: '#f9fafb' }}>Esc</kbd> para cerrar
                  </p>
                </div>

                {/* Optional name / email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-sans font-[600] text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                      Nombre <span className="normal-case font-[400]">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={e => setNombre(e.target.value)}
                      placeholder="Tu nombre"
                      className="w-full font-sans text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30 transition-all"
                      style={{ borderColor: '#e5e7eb', color: '#1a2744' }}
                    />
                  </div>
                  <div>
                    <label className="block font-sans font-[600] text-xs uppercase tracking-wider text-gray-400 mb-1.5">
                      Email <span className="normal-case font-[400]">(opcional)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="w-full font-sans text-sm rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal/30 transition-all"
                      style={{ borderColor: '#e5e7eb', color: '#1a2744' }}
                    />
                  </div>
                </div>

                {error && (
                  <p className="font-sans text-sm text-red-500">{error}</p>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={sending || !mensaje.trim()}
                  className="w-full py-3 rounded-xl font-sans font-[900] text-sm uppercase tracking-wider transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#092c64', color: '#ffffff' }}
                >
                  {sending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Enviando...
                    </span>
                  ) : 'Enviar feedback'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
