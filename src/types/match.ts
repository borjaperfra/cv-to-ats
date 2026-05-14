import type { Suggestion } from './analysis'

export interface MatchResult {
  matchScore:              number        // 0–100
  nombre:                  string        // from CV
  puestoBuscado:           string        // job title extracted from JD
  empresa?:                string        // company name if found in JD
  resumenMatch:            string        // 2–3 sentence match analysis
  resumenMatchTerminos?:   string[]      // bold terms within resumenMatch
  keywordsPresentes:       string[]      // CV keywords that align with JD
  keywordsFaltantes:       string[]      // important JD keywords missing from CV
  requisitosExcluyentes?:  string[]      // must-have requirements missing from CV
  sugerencias:             Suggestion[]  // how to tailor the CV for this job
  analyzedAt:              string
}
