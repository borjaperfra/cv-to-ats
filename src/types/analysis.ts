export type Prioridad = 'alta' | 'media' | 'baja'

export interface SubItem {
  texto:     string
  terminos?: string[]
}

export interface Suggestion {
  titulo:     string      // card title — bold heading for the suggestion group
  pasos:      SubItem[]   // 2–4 specific actionable bullet points
  prioridad:  Prioridad
  sugerencia?: string    // concrete copy-paste example showing the improved text
}

export interface CategoryAnalysis {
  category:    string
  score:       number
  status:      'good' | 'needs-work' | 'critical'
  summary:     string
  suggestions: Suggestion[]
}

export interface Metricas {
  palabras:         number   // approximate word count
  paginasEstimadas: number   // 1–4
  densidadKeywords: number   // 0–100, % of ATS-relevant keywords over total words
}

export interface ATSAnalysisResult {
  overallScore:     number
  nombre:           string
  saludo:           string         // 2–4 sentence analysis paragraph shown in score card
  saludoTerminos?:  string[]       // key substrings to bold within saludo
  headline:         string         // short technical summary (fallback)
  skillsDetectadas?: string[]      // detected skills/technologies as tags (max 15)
  metricas?:        Metricas
  alertasCriticas?: string[]       // critical parsing issues — empty array = none
  gapsCarrera?:     string[]       // detected employment gaps >6 months (informational)
  categories:       CategoryAnalysis[]
  topPriorities:    string[]
  analyzedAt:       string
}
