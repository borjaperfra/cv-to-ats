import type { ATSAnalysisResult } from '@/types/analysis'

const STORAGE_KEY = 'atsHistory'
const MAX_ENTRIES = 5

export interface HistoryEntry {
  id:         string
  nombre:     string
  score:      number
  headline:   string
  analyzedAt: string
  result:     ATSAnalysisResult
}

export function getHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
  } catch {
    return []
  }
}

export function saveToHistory(result: ATSAnalysisResult): void {
  if (typeof window === 'undefined') return
  try {
    const history = getHistory()
    // Skip if this exact analysis is already in history (navigating back doesn't duplicate)
    if (history.some(e => e.analyzedAt === result.analyzedAt)) return
    const entry: HistoryEntry = {
      id:         Date.now().toString(),
      nombre:     result.nombre || 'CV',
      score:      result.overallScore,
      headline:   result.headline,
      analyzedAt: result.analyzedAt,
      result,
    }
    const updated = [entry, ...history].slice(0, MAX_ENTRIES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem('cv-editor-draft')
  localStorage.removeItem('atsCvText')
  sessionStorage.removeItem('atsCvText')
  sessionStorage.removeItem('atsResult')
}
