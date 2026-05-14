export interface MatchRecurso {
  nombre: string
  url?:   string
}

export interface MatchSuggestion {
  tipo:        'formacion' | 'proyecto' | 'experiencia'
  titulo:      string          // actionable title
  descripcion: string          // 2-3 sentences: what gap it closes + concrete action
  terminos?:   string[]        // substrings to bold in descripcion
  impacto:     'alto' | 'medio' | 'bajo'
  recursos?:   MatchRecurso[]  // 1-3 specific resources with optional links
}

export interface MatchResult {
  matchScore:              number             // 0–100
  nombre:                  string             // from CV
  puestoBuscado:           string             // job title extracted from JD
  empresa?:                string             // company name if found in JD
  resumenMatch:            string             // 2–3 sentence match analysis
  resumenMatchTerminos?:   string[]           // bold terms within resumenMatch
  keywordsPresentes:       string[]           // CV keywords that align with JD
  keywordsFaltantes:       string[]           // important JD keywords missing from CV
  requisitosExcluyentes?:  string[]           // must-have requirements missing from CV
  sugerencias:             MatchSuggestion[]  // training / projects / experience to close the gap
  analyzedAt:              string
}
