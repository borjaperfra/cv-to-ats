'use client'

import { useEffect, useState, useCallback } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FeedbackEntry {
  id: string
  tipo: string
  mensaje: string
  nombre: string | null
  email: string | null
  pagina: string | null
  fecha: string
  resuelto?: boolean
  fecha_resolucion?: string
  procesado?: boolean
  procesado_en?: string
}

interface Issue {
  id: number
  numero: string
  tipo: 'bug' | 'ux' | 'idea'
  titulo: string
  descripcion: string
  prioridad: 'alta' | 'media' | 'baja'
  estado: 'pendiente' | 'en_progreso' | 'resuelto' | 'descartado'
  feedback_ids: string[]
  fecha_creacion: string
  fecha_actualizacion: string
}

type Tab = 'activo' | 'archivado' | 'issues'

// ─── Colour maps ─────────────────────────────────────────────────────────────

const TIPO_COLORS: Record<string, { bg: string; text: string }> = {
  bug:        { bg: '#fff1f2', text: '#e11d48' },
  sugerencia: { bg: '#fffbeb', text: '#d97706' },
  idea:       { bg: '#e6f7f7', text: '#0DA1A4' },
  otro:       { bg: '#f3f4f6', text: '#6b7280' },
}

const ISSUE_TIPO_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  bug:  { bg: '#fff1f2', text: '#e11d48',  label: 'BUG' },
  ux:   { bg: '#eff6ff', text: '#2563eb',  label: 'UX'  },
  idea: { bg: '#e6f7f7', text: '#0DA1A4',  label: 'IDEA' },
}

const PRIORIDAD_COLORS: Record<string, { bg: string; text: string }> = {
  alta:  { bg: '#fee2e2', text: '#dc2626' },
  media: { bg: '#fef3c7', text: '#d97706' },
  baja:  { bg: '#f0fdf4', text: '#16a34a' },
}

const ESTADO_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pendiente:   { bg: '#f3f4f6', text: '#6b7280', label: 'Pendiente'   },
  en_progreso: { bg: '#dbeafe', text: '#2563eb', label: 'En progreso' },
  resuelto:    { bg: '#d1fae5', text: '#059669', label: 'Resuelto'    },
  descartado:  { bg: '#f3f4f6', text: '#9ca3af', label: 'Descartado'  },
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminFeedbackPage() {
  const [entries,   setEntries]   = useState<FeedbackEntry[]>([])
  const [issues,    setIssues]    = useState<Issue[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadingIssues, setLoadingIssues] = useState(true)
  const [error,     setError]     = useState('')
  const [tab,       setTab]       = useState<Tab>('activo')
  const [resolving, setResolving] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [updatingIssue, setUpdatingIssue] = useState<number | null>(null)
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null)
  const [resueltasOpen, setResueltasOpen] = useState(false)

  // ── Fetch feedback ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/feedback')
      .then(r => r.json())
      .then(data => { setEntries([...data].reverse()); setLoading(false) })
      .catch(() => { setError('No se pudieron cargar las entradas.'); setLoading(false) })
  }, [])

  // ── Fetch issues ────────────────────────────────────────────────────────────
  const fetchIssues = useCallback(() => {
    setLoadingIssues(true)
    fetch('/api/issues')
      .then(r => r.json())
      .then(data => { setIssues(data); setLoadingIssues(false) })
      .catch(() => setLoadingIssues(false))
  }, [])

  useEffect(() => { fetchIssues() }, [fetchIssues])

  // ── Toggle resuelto ─────────────────────────────────────────────────────────
  async function toggleResuelto(entry: FeedbackEntry) {
    setResolving(entry.id)
    try {
      const res = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id, resuelto: !entry.resuelto }),
      })
      if (!res.ok) throw new Error()
      const { entry: updated } = await res.json()
      setEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
    } catch { /* silently ignore */ }
    finally { setResolving(null) }
  }

  // ── Toggle procesado ────────────────────────────────────────────────────────
  async function toggleProcesado(entry: FeedbackEntry) {
    setProcessing(entry.id)
    try {
      const res = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id, procesado: !entry.procesado }),
      })
      if (!res.ok) throw new Error()
      const { entry: updated } = await res.json()
      setEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
    } catch { /* silently ignore */ }
    finally { setProcessing(null) }
  }

  // ── Update issue estado ─────────────────────────────────────────────────────
  async function updateIssueEstado(issue: Issue, estado: Issue['estado']) {
    setUpdatingIssue(issue.id)
    try {
      const res = await fetch('/api/issues', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: issue.id, estado }),
      })
      if (!res.ok) throw new Error()
      const { issue: updated } = await res.json()
      setIssues(prev => prev.map(i => i.id === updated.id ? updated : i))
    } catch { /* silently ignore */ }
    finally { setUpdatingIssue(null) }
  }

  // ── Derived data ────────────────────────────────────────────────────────────
  const activos    = entries.filter(e => !e.resuelto)
  const archivados = entries.filter(e =>  e.resuelto)
  const visible    = tab === 'activo' ? activos : archivados

  const bugs        = activos.filter(e => e.tipo === 'bug').length
  const sugerencias = activos.filter(e => e.tipo === 'sugerencia').length
  const ideas       = activos.filter(e => e.tipo === 'idea').length

  const issuesAbiertas = issues.filter(i => i.estado !== 'resuelto' && i.estado !== 'descartado')
  const issuesResueltas = issues.filter(i => i.estado === 'resuelto' || i.estado === 'descartado')

  const issuesBug  = issuesAbiertas.filter(i => i.tipo === 'bug').length
  const issuesUX   = issuesAbiertas.filter(i => i.tipo === 'ux').length
  const issuesIdea = issuesAbiertas.filter(i => i.tipo === 'idea').length

  const sortOrder = (a: Issue, b: Issue) => {
    const order = { bug: 0, ux: 1, idea: 2 }
    if (order[a.tipo] !== order[b.tipo]) return order[a.tipo] - order[b.tipo]
    return a.numero.localeCompare(b.numero, undefined, { numeric: true })
  }

  const sortedIssues         = [...issuesAbiertas].sort(sortOrder)
  const sortedIssuesResueltas = [...issuesResueltas].sort(sortOrder)

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0ede8' }}>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── Stats ── */}
        {tab !== 'issues' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Activos',     value: activos.length,  bg: '#092c64', text: '#ffffff' },
              { label: 'Bugs',        value: bugs,            bg: '#fff1f2', text: '#e11d48' },
              { label: 'Sugerencias', value: sugerencias,     bg: '#fffbeb', text: '#d97706' },
              { label: 'Ideas',       value: ideas,           bg: '#e6f7f7', text: '#0DA1A4' },
            ].map(stat => (
              <div key={stat.label} className="rounded-2xl p-5" style={{ backgroundColor: stat.bg }}>
                <p className="font-sans font-[700] text-xs uppercase tracking-widest mb-1"
                  style={{ color: stat.text, opacity: 0.7 }}>{stat.label}</p>
                <p className="font-sans font-[900] text-3xl leading-none" style={{ color: stat.text }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Pendientes', value: issuesAbiertas.length,  bg: '#092c64', text: '#ffffff' },
              { label: 'Bugs',       value: issuesBug,               bg: '#fff1f2', text: '#e11d48' },
              { label: 'UX',         value: issuesUX,                bg: '#eff6ff', text: '#2563eb' },
              { label: 'Ideas',      value: issuesIdea,              bg: '#e6f7f7', text: '#0DA1A4' },
            ].map(stat => (
              <div key={stat.label} className="rounded-2xl p-5" style={{ backgroundColor: stat.bg }}>
                <p className="font-sans font-[700] text-xs uppercase tracking-widest mb-1"
                  style={{ color: stat.text, opacity: 0.7 }}>{stat.label}</p>
                <p className="font-sans font-[900] text-3xl leading-none" style={{ color: stat.text }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'activo',    label: `Activos (${activos.length})` },
            { key: 'archivado', label: `Archivados (${archivados.length})` },
            { key: 'issues',    label: `Issues (${issuesAbiertas.length})` },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="font-sans font-[700] text-xs uppercase tracking-widest px-4 py-2 rounded-full transition-colors"
              style={tab === t.key
                ? { backgroundColor: '#092c64', color: '#ffffff' }
                : { backgroundColor: '#ffffff', color: '#6b7280' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            FEEDBACK TABS (activo / archivado)
        ══════════════════════════════════════════════════════════════════════ */}
        {tab !== 'issues' && (
          <>
            {loading && (
              <div className="flex items-center justify-center py-16">
                <svg className="animate-spin h-7 w-7" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#0DA1A4" strokeWidth="3" />
                  <path className="opacity-75" fill="#0DA1A4" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                <p className="font-sans text-sm text-red-700">{error}</p>
              </div>
            )}

            {!loading && !error && visible.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <p className="font-sans font-[700] text-base text-gray-400">
                  {tab === 'activo' ? 'No hay entradas pendientes.' : 'No hay entradas archivadas.'}
                </p>
              </div>
            )}

            {visible.map(entry => {
              const colors     = TIPO_COLORS[entry.tipo] ?? TIPO_COLORS.otro
              const isResolving  = resolving  === entry.id
              const isProcessing = processing === entry.id
              const date = new Date(entry.fecha).toLocaleString('es-ES', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })

              return (
                <div key={entry.id}
                  className="bg-white rounded-2xl p-5 transition-opacity"
                  style={{
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    opacity: entry.resuelto ? 0.6 : 1,
                  }}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-sans font-[700] text-xs px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: colors.bg, color: colors.text }}>
                        {entry.tipo.toUpperCase()}
                      </span>

                      {/* Procesado badge */}
                      {entry.procesado && (
                        <span className="font-sans font-[700] text-xs px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
                          ✓ PROCESADO
                        </span>
                      )}

                      {entry.nombre && (
                        <span className="font-sans font-[600] text-sm" style={{ color: '#1a2744' }}>{entry.nombre}</span>
                      )}
                      {entry.email && (
                        <a href={`mailto:${entry.email}`}
                          className="font-sans text-xs text-gray-400 hover:text-teal transition-colors underline underline-offset-2">
                          {entry.email}
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-sans text-xs text-gray-400">{date}</p>
                        {entry.pagina && (
                          <p className="font-sans text-xs text-gray-300 mt-0.5">{entry.pagina}</p>
                        )}
                      </div>

                      {/* Procesado toggle */}
                      <button
                        onClick={() => toggleProcesado(entry)}
                        disabled={isProcessing}
                        title={entry.procesado ? 'Desmarcar como procesado' : 'Marcar como procesado (issue creada)'}
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        style={entry.procesado
                          ? { backgroundColor: '#dbeafe', color: '#2563eb' }
                          : { backgroundColor: '#f3f4f6', color: '#c7d2fe' }}
                      >
                        {isProcessing ? (
                          <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                        ) : (
                          /* Branch/issue icon */
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        )}
                      </button>

                      {/* Resuelto toggle */}
                      <button
                        onClick={() => toggleResuelto(entry)}
                        disabled={isResolving}
                        title={entry.resuelto ? 'Marcar como pendiente' : 'Archivar'}
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                        style={entry.resuelto
                          ? { backgroundColor: '#d1fae5', color: '#059669' }
                          : { backgroundColor: '#f3f4f6', color: '#9ca3af' }}
                      >
                        {isResolving ? (
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="font-sans text-sm leading-relaxed" style={{ color: '#1a2744' }}>
                    {entry.mensaje}
                  </p>

                  {entry.resuelto && entry.fecha_resolucion && (
                    <p className="font-sans text-xs text-gray-300 mt-3">
                      Archivado el {new Date(entry.fecha_resolucion).toLocaleString('es-ES', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            ISSUES TAB
        ══════════════════════════════════════════════════════════════════════ */}
        {tab === 'issues' && (
          <>
            {/* Sub-header info */}
            <div className="bg-white rounded-2xl px-5 py-4 flex items-center gap-3"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <span className="text-lg">📋</span>
              <p className="font-sans text-sm text-gray-500 leading-snug">
                <strong className="text-navy">{issuesAbiertas.length} pendientes</strong> de {issues.length} issues generadas
                a partir del análisis de {entries.length} entradas de feedback. Asígnatelas para atacarlas una a una.
              </p>
            </div>

            {loadingIssues && (
              <div className="flex items-center justify-center py-16">
                <svg className="animate-spin h-7 w-7" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#0DA1A4" strokeWidth="3" />
                  <path className="opacity-75" fill="#0DA1A4" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              </div>
            )}

            {/* Group headings */}
            {!loadingIssues && (['bug', 'ux', 'idea'] as const).map(tipo => {
              const group = sortedIssues.filter(i => i.tipo === tipo)
              if (group.length === 0) return null
              const tipoConf = ISSUE_TIPO_COLORS[tipo]

              return (
                <div key={tipo} className="space-y-3">
                  {/* Group title */}
                  <div className="flex items-center gap-3">
                    <span className="font-sans font-[800] text-xs uppercase tracking-widest px-3 py-1 rounded-full"
                      style={{ backgroundColor: tipoConf.bg, color: tipoConf.text }}>
                      {tipoConf.label}
                    </span>
                    <span className="font-sans font-[700] text-xs text-gray-400 uppercase tracking-widest">
                      {group.length} issue{group.length > 1 ? 's' : ''}
                    </span>
                    <div className="flex-1 h-px" style={{ backgroundColor: '#e5e0d8' }} />
                  </div>

                  {/* Issues list */}
                  {group.map(issue => {
                    const prioConf   = PRIORIDAD_COLORS[issue.prioridad]
                    const estadoConf = ESTADO_CONFIG[issue.estado]
                    const isUpdating = updatingIssue === issue.id
                    const isExpanded = expandedIssue === issue.id
                    const linkedFeedback = entries.filter(e => issue.feedback_ids.includes(e.id))

                    return (
                      <div key={issue.id}
                        className="bg-white rounded-2xl overflow-hidden transition-all"
                        style={{
                          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                          opacity: issue.estado === 'descartado' ? 0.5 : 1,
                        }}>

                        {/* Issue header */}
                        <button
                          className="w-full text-left p-5"
                          onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
                        >
                          <div className="flex items-start gap-3">
                            {/* Número */}
                            <span className="font-sans font-[900] text-sm leading-none mt-0.5 flex-shrink-0"
                              style={{ color: tipoConf.text, minWidth: '4.5rem' }}>
                              {issue.numero}
                            </span>

                            {/* Título + badges */}
                            <div className="flex-1 min-w-0">
                              <p className="font-sans font-[700] text-sm leading-snug mb-2"
                                style={{ color: '#1a2744',
                                  textDecoration: issue.estado === 'resuelto' ? 'line-through' : 'none',
                                  opacity: issue.estado === 'resuelto' ? 0.6 : 1 }}>
                                {issue.titulo}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-sans font-[700] text-xs px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: prioConf.bg, color: prioConf.text }}>
                                  {issue.prioridad.toUpperCase()}
                                </span>
                                <span className="font-sans font-[700] text-xs px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: estadoConf.bg, color: estadoConf.text }}>
                                  {estadoConf.label}
                                </span>
                                {issue.feedback_ids.length > 0 && (
                                  <span className="font-sans text-xs text-gray-400">
                                    {issue.feedback_ids.length} feedback{issue.feedback_ids.length > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Expand arrow */}
                            <svg
                              className="flex-shrink-0 h-4 w-4 text-gray-400 transition-transform mt-0.5"
                              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {/* Expanded body */}
                        {isExpanded && (
                          <div className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: '#f0ede8' }}>
                            {/* Descripción */}
                            <p className="font-sans text-sm leading-relaxed pt-4"
                              style={{ color: '#374151' }}>
                              {issue.descripcion}
                            </p>

                            {/* Estado selector */}
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-sans font-[700] text-xs uppercase tracking-widest text-gray-400">
                                Estado:
                              </span>
                              {(['pendiente', 'en_progreso', 'resuelto', 'descartado'] as Issue['estado'][]).map(est => {
                                const conf = ESTADO_CONFIG[est]
                                const isActive = issue.estado === est
                                return (
                                  <button
                                    key={est}
                                    disabled={isUpdating}
                                    onClick={() => updateIssueEstado(issue, est)}
                                    className="font-sans font-[700] text-xs px-3 py-1.5 rounded-full transition-all"
                                    style={isActive
                                      ? { backgroundColor: conf.bg, color: conf.text, outline: `2px solid ${conf.text}`, outlineOffset: '1px' }
                                      : { backgroundColor: '#f3f4f6', color: '#9ca3af' }}
                                  >
                                    {isUpdating && isActive ? '…' : conf.label}
                                  </button>
                                )
                              })}
                            </div>

                            {/* Feedback vinculado */}
                            {linkedFeedback.length > 0 && (
                              <div className="space-y-2">
                                <p className="font-sans font-[700] text-xs uppercase tracking-widest text-gray-400">
                                  Feedback vinculado:
                                </p>
                                {linkedFeedback.map(fb => {
                                  const fbColors = TIPO_COLORS[fb.tipo] ?? TIPO_COLORS.otro
                                  return (
                                    <div key={fb.id}
                                      className="rounded-xl p-3 flex items-start gap-3"
                                      style={{ backgroundColor: '#f9f8f6', border: '1px solid #e5e0d8' }}>
                                      <span className="font-sans font-[700] text-xs px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                                        style={{ backgroundColor: fbColors.bg, color: fbColors.text }}>
                                        {fb.tipo.toUpperCase()}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="font-sans text-xs leading-relaxed text-gray-600 line-clamp-3">
                                          {fb.mensaje}
                                        </p>
                                        <p className="font-sans text-xs text-gray-400 mt-1">
                                          {fb.nombre ?? 'Anónimo'}
                                          {fb.email ? ` · ${fb.email}` : ''}
                                          {fb.pagina ? ` · ${fb.pagina}` : ''}
                                        </p>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* ── Acordeón issues resueltas ── */}
            {sortedIssuesResueltas.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setResueltasOpen(v => !v)}
                  className="w-full flex items-center gap-3 py-3 px-1 group"
                >
                  <div className="flex-1 h-px" style={{ backgroundColor: '#e5e0d8' }} />
                  <span className="font-sans font-[700] text-xs uppercase tracking-widest flex items-center gap-2 flex-shrink-0"
                    style={{ color: '#9ca3af' }}>
                    <svg
                      className="h-3.5 w-3.5 transition-transform"
                      style={{ transform: resueltasOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    Issues resueltas ({sortedIssuesResueltas.length})
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: '#e5e0d8' }} />
                </button>

                {resueltasOpen && (
                  <div className="space-y-2 mt-3">
                    {sortedIssuesResueltas.map(issue => {
                      const tipoConf   = ISSUE_TIPO_COLORS[issue.tipo]
                      const estadoConf = ESTADO_CONFIG[issue.estado]
                      const isUpdating = updatingIssue === issue.id
                      const isExpanded = expandedIssue === issue.id
                      const linkedFeedback = entries.filter(e => issue.feedback_ids.includes(e.id))

                      return (
                        <div key={issue.id}
                          className="bg-white rounded-2xl overflow-hidden"
                          style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)', opacity: 0.65 }}>

                          <button
                            className="w-full text-left p-4"
                            onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-sans font-[900] text-sm flex-shrink-0"
                                style={{ color: tipoConf.text, minWidth: '4.5rem' }}>
                                {issue.numero}
                              </span>
                              <p className="flex-1 font-sans font-[700] text-sm text-gray-400 line-through truncate">
                                {issue.titulo}
                              </p>
                              <span className="font-sans font-[700] text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: estadoConf.bg, color: estadoConf.text }}>
                                {estadoConf.label}
                              </span>
                              <svg
                                className="flex-shrink-0 h-3.5 w-3.5 text-gray-300 transition-transform"
                                style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: '#f0ede8' }}>
                              <p className="font-sans text-sm leading-relaxed pt-4 text-gray-500">
                                {issue.descripcion}
                              </p>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="font-sans font-[700] text-xs uppercase tracking-widest text-gray-400">Estado:</span>
                                {(['pendiente', 'en_progreso', 'resuelto', 'descartado'] as Issue['estado'][]).map(est => {
                                  const conf = ESTADO_CONFIG[est]
                                  const isActive = issue.estado === est
                                  return (
                                    <button
                                      key={est}
                                      disabled={isUpdating}
                                      onClick={() => updateIssueEstado(issue, est)}
                                      className="font-sans font-[700] text-xs px-3 py-1.5 rounded-full transition-all"
                                      style={isActive
                                        ? { backgroundColor: conf.bg, color: conf.text, outline: `2px solid ${conf.text}`, outlineOffset: '1px' }
                                        : { backgroundColor: '#f3f4f6', color: '#9ca3af' }}
                                    >
                                      {isUpdating && isActive ? '…' : conf.label}
                                    </button>
                                  )
                                })}
                              </div>
                              {linkedFeedback.length > 0 && (
                                <div className="space-y-2">
                                  <p className="font-sans font-[700] text-xs uppercase tracking-widest text-gray-400">Feedback vinculado:</p>
                                  {linkedFeedback.map(fb => {
                                    const fbColors = TIPO_COLORS[fb.tipo] ?? TIPO_COLORS.otro
                                    return (
                                      <div key={fb.id} className="rounded-xl p-3 flex items-start gap-3"
                                        style={{ backgroundColor: '#f9f8f6', border: '1px solid #e5e0d8' }}>
                                        <span className="font-sans font-[700] text-xs px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                                          style={{ backgroundColor: fbColors.bg, color: fbColors.text }}>
                                          {fb.tipo.toUpperCase()}
                                        </span>
                                        <div className="min-w-0">
                                          <p className="font-sans text-xs leading-relaxed text-gray-600 line-clamp-3">{fb.mensaje}</p>
                                          <p className="font-sans text-xs text-gray-400 mt-1">
                                            {fb.nombre ?? 'Anónimo'}{fb.email ? ` · ${fb.email}` : ''}{fb.pagina ? ` · ${fb.pagina}` : ''}
                                          </p>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </main>
    </div>
  )
}
