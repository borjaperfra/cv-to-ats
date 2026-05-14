import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'Cómo funciona la puntuación ATS — ATS Killer by Manfred',
  description: 'Entiende cómo evaluamos tu CV y cómo lo evalúan los sistemas ATS reales. Qué dimensiones analizamos, qué peso tiene cada una y qué significa tu puntuación.',
}

const CATEGORIES = [
  {
    num: '01',
    name: 'Keywords y habilidades técnicas',
    importance: 'Muy importante',
    importanceColor: { bg: '#fff1f2', text: '#be123c', border: '#fda4af' },
    desc: 'Contamos las tecnologías, lenguajes, frameworks, herramientas y certificaciones que aparecen de forma explícita en el CV. Solo cuentan términos concretos — "Python", "React", "AWS" — no frases genéricas como "experiencia en cloud" o "habilidades de comunicación".',
    tip: 'Cuantos más términos técnicos nombrados tengas, mejor te irá contra los filtros automáticos. Los ATS buscan coincidencias exactas de palabras clave.',
  },
  {
    num: '02',
    name: 'Formato y parseabilidad',
    importance: 'Muy importante',
    importanceColor: { bg: '#fff1f2', text: '#be123c', border: '#fda4af' },
    desc: 'Detectamos si el CV tiene problemas estructurales que impiden que un ATS lo lea correctamente: columnas dobles en paralelo, tablas con celdas fusionadas, texto incrustado como imagen, o caracteres decorativos como bullets (★, ⬛). Un CV ilegible para el ATS se descarta antes de que llegue a un humano.',
    tip: 'El error más común y más grave. Un CV visualmente bonito pero con dos columnas puede llegar al ATS como una ensalada de palabras sin sentido.',
  },
  {
    num: '03',
    name: 'Estructura de la experiencia laboral',
    importance: 'Importante',
    importanceColor: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
    desc: 'Verificamos que cada puesto de trabajo tenga los cuatro elementos que todo ATS busca: nombre de la empresa, título del puesto, fechas de inicio y fin, y al menos una línea de descripción. La ausencia de cualquiera de estos datos penaliza.',
    tip: 'Las fechas son especialmente críticas — muchos ATS calculan la antigüedad y la continuidad laboral automáticamente.',
  },
  {
    num: '04',
    name: 'Educación y certificaciones',
    importance: 'Relevante',
    importanceColor: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    desc: 'Evaluamos si la formación está completa: institución, titulación y año. Las certificaciones profesionales suman cuando aparecen vinculadas a la formación. Una entrada incompleta (sin año o sin institución) reduce la puntuación.',
    tip: 'Las certificaciones técnicas valen doble: aparecen como formación y como keyword técnica a la vez.',
  },
  {
    num: '05',
    name: 'Datos de contacto',
    importance: 'Relevante',
    importanceColor: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    desc: 'Comprobamos la presencia de los cuatro datos esenciales: email, teléfono, ciudad o país, y LinkedIn o portfolio. Cada elemento vale 25 puntos. Algunos ATS rechazan automáticamente candidatos sin email o sin teléfono.',
    tip: 'Parece obvio, pero es sorprendentemente frecuente que un CV llegue sin teléfono o sin LinkedIn.',
  },
  {
    num: '06',
    name: 'Longitud y optimización',
    importance: 'Secundario',
    importanceColor: { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
    desc: 'Estimamos el número de páginas. Un CV de 1–2 páginas es el formato óptimo para la mayoría de roles. A partir de 3 páginas el impacto empieza a ser negativo; 5 o más páginas o menos de 200 palabras penalizan significativamente.',
    tip: 'Más largo no es más completo. Los ATS y los reclutadores tienden a leer en diagonal — lo que no cabe en las primeras dos páginas raramente se lee.',
  },
]

const SCORE_LEVELS = [
  {
    range: '85 – 100',
    label: 'ATS-ready',
    desc: 'El ATS lo sube automáticamente a revisión humana. El reclutador lo ve casi siempre.',
    bg: '#f0fdf4', border: '#86efac', text: '#15803d', dot: '#22c55e',
  },
  {
    range: '70 – 84',
    label: 'Buen candidato',
    desc: 'Pasa el filtro inicial. El reclutador lo revisa si hay tiempo o la pila ideal está vacía.',
    bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8', dot: '#3b82f6',
  },
  {
    range: '50 – 69',
    label: 'Candidato marginal',
    desc: 'Queda en la cola. Solo se revisa si no hay suficientes candidatos mejor puntuados.',
    bg: '#fffbeb', border: '#fcd34d', text: '#b45309', dot: '#f59e0b',
  },
  {
    range: '35 – 49',
    label: 'Perfil débil',
    desc: 'Normalmente descartado sin revisión humana.',
    bg: '#fff7ed', border: '#fdba74', text: '#c2410c', dot: '#f97316',
  },
  {
    range: '< 35',
    label: 'Descartado',
    desc: 'Filtrado automático. El reclutador nunca lo ve.',
    bg: '#fff1f2', border: '#fca5a5', text: '#be123c', dot: '#ef4444',
  },
]

export default function ComoFuncionaPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0ede8' }}>
      <Header />

      <main className="max-w-2xl mx-auto px-6 py-10">

        {/* Hero */}
        <div className="mb-10">
          <p className="font-sans font-[600] text-xs uppercase tracking-widest mb-1" style={{ color: '#0DA1A4' }}>
            Metodología
          </p>
          <h1 className="font-heading font-[900] text-3xl mb-3" style={{ color: '#092c64' }}>
            Cómo evaluamos tu CV
          </h1>
          <p className="font-sans text-base leading-relaxed" style={{ color: '#4b5563' }}>
            Analizamos tu CV desde la perspectiva de un sistema ATS real — no desde la de un humano.
            Un CV visualmente impresionante puede suspender el filtro automático si no está bien estructurado.
            Aquí explicamos qué miramos y por qué.
          </p>
        </div>

        {/* What is an ATS */}
        <div className="bg-white rounded-2xl p-6 mb-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)', borderLeft: '4px solid #0DA1A4' }}>
          <h2 className="font-sans font-[800] text-sm uppercase tracking-widest mb-3" style={{ color: '#092c64' }}>
            Qué es un ATS
          </h2>
          <p className="font-sans text-sm leading-relaxed" style={{ color: '#4b5563' }}>
            Un <strong>Applicant Tracking System</strong> es el software que usan la mayoría de empresas medianas y grandes para gestionar candidaturas.
            Antes de que tu CV llegue a un reclutador, el ATS lo lee, lo puntúa y decide si lo muestra o no.
            El problema es que estos sistemas leen texto plano — no ven el diseño, no entienden el contexto, no valoran que algo &ldquo;suene bien&rdquo;.
            Buscan palabras clave exactas en una estructura predecible.
          </p>
        </div>

        {/* Our 6 categories */}
        <div className="mb-2">
          <h2 className="font-sans font-[800] text-sm uppercase tracking-widest mb-1" style={{ color: '#092c64' }}>
            Las 6 dimensiones que analizamos
          </h2>
          <p className="font-sans text-xs mb-5" style={{ color: '#9ca3af' }}>
            La puntuación final es una media ponderada de estas dimensiones. Cada una tiene un peso distinto según su impacto real en los filtros ATS.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {CATEGORIES.map((cat) => (
            <div key={cat.num} className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <div className="flex items-start gap-4">
                <span className="font-sans font-[900] text-2xl flex-shrink-0 leading-none mt-0.5" style={{ color: '#e5e7eb' }}>
                  {cat.num}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-sans font-[700] text-sm" style={{ color: '#092c64' }}>{cat.name}</h3>
                    <span className="font-sans font-[700] text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: cat.importanceColor.bg, color: cat.importanceColor.text, border: `1px solid ${cat.importanceColor.border}` }}>
                      {cat.importance}
                    </span>
                  </div>
                  <p className="font-sans text-sm leading-relaxed mb-3" style={{ color: '#4b5563' }}>{cat.desc}</p>
                  <div className="flex items-start gap-2 rounded-xl p-3" style={{ backgroundColor: '#f8fafc' }}>
                    <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#0DA1A4' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-sans text-xs leading-relaxed" style={{ color: '#64748b' }}>{cat.tip}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ATS score thresholds */}
        <div className="mb-2">
          <h2 className="font-sans font-[800] text-sm uppercase tracking-widest mb-1" style={{ color: '#092c64' }}>
            Qué significa tu puntuación
          </h2>
          <p className="font-sans text-xs mb-5" style={{ color: '#9ca3af' }}>
            Los ATS reales no publican sus baremos — son propietarios. Estos rangos son el consenso de la industria de recruiting.
          </p>
        </div>

        <div className="space-y-3 mb-8">
          {SCORE_LEVELS.map((level) => (
            <div key={level.range} className="bg-white rounded-2xl px-5 py-4 flex items-center gap-4"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <div className="flex-shrink-0 w-2 h-2 rounded-full" style={{ backgroundColor: level.dot }} />
              <div className="flex-shrink-0 w-20">
                <span className="font-sans font-[900] text-sm" style={{ color: '#092c64' }}>{level.range}</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-sans font-[700] text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full mr-2"
                  style={{ backgroundColor: level.bg, color: level.text, border: `1px solid ${level.border}` }}>
                  {level.label}
                </span>
                <span className="font-sans text-xs" style={{ color: '#6b7280' }}>{level.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Honest disclaimer */}
        <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
          <div className="flex items-start gap-3">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#d97706' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-sans font-[700] text-xs uppercase tracking-widest mb-2" style={{ color: '#d97706' }}>
                Limitaciones importantes
              </p>
              <p className="font-sans text-sm leading-relaxed" style={{ color: '#92400e' }}>
                Nuestra puntuación es <strong>orientativa</strong>, no una predicción exacta de lo que hará el ATS de una empresa concreta.
                Cada sistema tiene su propio algoritmo, y muchos también cruzan el CV con los requisitos específicos de la oferta.
                Un CV con 90 puntos puede quedar fuera si no tiene las keywords exactas de esa oferta, y un CV con 65 puede pasar si encaja muy bien con el puesto.
                Usa esta puntuación como diagnóstico de partida, no como veredicto final.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ backgroundColor: '#092c64' }}>
          <div>
            <p className="font-sans font-[900] uppercase tracking-widest text-xs mb-1" style={{ color: '#01FFC6' }}>
              ¿Cómo está tu CV?
            </p>
            <p className="font-sans font-[800] text-base leading-snug text-white">
              Analízalo gratis en menos de 30 segundos
            </p>
          </div>
          <Link
            href="/"
            className="flex-shrink-0 inline-flex items-center gap-2 font-sans font-[700] text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#01FFC6', color: '#092c64' }}
          >
            Analizar mi CV
          </Link>
        </div>

      </main>
    </div>
  )
}
