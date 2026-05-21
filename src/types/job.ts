export interface JobSignal {
  titulo: string
  descripcion: string
}

export interface JobAnalysisResult {
  score: number
  puesto: string
  empresa: string
  resumen: string
  veredicto: string
  senalesPositivas: JobSignal[]
  senalesAlerta: JobSignal[]
  loQueNoDice: string[]
  analyzedAt?: string
}
