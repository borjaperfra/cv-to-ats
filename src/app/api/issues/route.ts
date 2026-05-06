import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'

// Issues pre-generadas a partir del análisis del feedback (seed inicial)
const SEED_ISSUES = [
  // ── BUGS ──────────────────────────────────────────────────────────────────
  {
    numero: 'BUG-01', tipo: 'bug', prioridad: 'alta',
    titulo: 'Menú principal no visible en móvil (iOS Safari)',
    descripcion: 'En iPhone con Safari el menú de hamburguesa no se muestra y las secciones Match, LinkedIn y Editor no son accesibles. Reportado en iPhone 14 Plus y iPhone 12 Pro.',
    feedback_ids: ['1776420994432-0sjtl', '1776276273833-zkxal'],
  },
  {
    numero: 'BUG-02', tipo: 'bug', prioridad: 'alta',
    titulo: 'Historial de análisis duplica entradas al navegar',
    descripcion: 'Cada vez que el usuario sale y vuelve a "Analizar CV" sin haber subido un nuevo CV, aparece una entrada duplicada en "Tus análisis recientes". Reportado por 2 usuarios.',
    feedback_ids: ['1776275117477-30481', '1776240608506-kec5k'],
  },
  {
    numero: 'BUG-03', tipo: 'bug', prioridad: 'alta',
    titulo: 'Botón de cambio de idioma no funciona',
    descripcion: 'El selector de idioma en Editor y en LinkedIn no tiene efecto al pulsarlo. Confirmado en dos secciones distintas por dos usuarios diferentes.',
    feedback_ids: ['1776275982980-mvli1', '1776176725516-78kih'],
  },
  {
    numero: 'BUG-04', tipo: 'bug', prioridad: 'media',
    titulo: 'Drag & drop en "Comparar CV" abre el PDF en nueva pestaña',
    descripcion: 'Al arrastrar un PDF desde el explorador de archivos al área de drop de "Comparar CV" en Chrome (con dos monitores), el navegador abre el PDF en una nueva pestaña en lugar de subirlo.',
    feedback_ids: ['1776326795539-ky4qs'],
  },
  {
    numero: 'BUG-05', tipo: 'bug', prioridad: 'media',
    titulo: 'Error JSON en Match: "Service Unavailable is not valid JSON"',
    descripcion: 'Al hacer match con ciertos enlaces de LinkedIn, la app muestra el error crudo de la API en lugar de un mensaje comprensible. El copy debe explicar qué ha fallado y qué puede hacer el usuario.',
    feedback_ids: ['1776328596143-2nx1a'],
  },
  {
    numero: 'BUG-06', tipo: 'bug', prioridad: 'media',
    titulo: 'Editor auto-mejora genera texto concatenado sin espacios (BBVA2023)',
    descripcion: 'Al aplicar mejoras automáticas en el editor, el texto resultante puede incluir fechas y empresas concatenadas sin separador (ej: "BBVA2023", "Madrid2024"), lo que el propio analizador luego detecta como error crítico.',
    feedback_ids: ['1776240870669-1v4q8'],
  },
  {
    numero: 'BUG-07', tipo: 'bug', prioridad: 'media',
    titulo: 'URL duplicada al usar "Probar con otra oferta"',
    descripcion: 'Al pulsar el botón "Probar con otra oferta" en Match, la URL de la oferta anterior se copia duplicada en el campo, generando un error al intentar analizarla.',
    feedback_ids: ['1776336360669-l0ffl'],
  },
  {
    numero: 'BUG-08', tipo: 'bug', prioridad: 'media',
    titulo: 'LinkedIn C&P duplica contenido si no se expande "ver más"',
    descripcion: 'Si el usuario copia el perfil sin expandir el summary de LinkedIn, el texto pegado incluye párrafos duplicados y el análisis detecta esa duplicación como un error del perfil.',
    feedback_ids: ['1776179731685-g010p'],
  },
  {
    numero: 'BUG-09', tipo: 'bug', prioridad: 'baja',
    titulo: 'Análisis LinkedIn: feedback vago sobre inconsistencias y fechas',
    descripcion: 'El análisis menciona "inconsistencia de empresa" y "fechas en el futuro" sin especificar cuáles ni dónde, lo que impide al usuario saber qué corregir.',
    feedback_ids: ['1776192147164-bwfoo'],
  },
  {
    numero: 'BUG-10', tipo: 'bug', prioridad: 'baja',
    titulo: 'Fondo del PDF generado no cubre la última página',
    descripcion: 'El color de fondo del PDF exportado no llega hasta el borde inferior del último folio, dejando un espacio blanco visible.',
    feedback_ids: ['1776275342064-5550r'],
  },
  // ── UX ────────────────────────────────────────────────────────────────────
  {
    numero: 'UX-01', tipo: 'ux', prioridad: 'alta',
    titulo: 'Puntuación no determinista: el mismo CV da notas distintas',
    descripcion: 'Sin modificar el CV, el mismo archivo puede obtener puntuaciones que varían ±10 puntos entre análisis. Es consecuencia de la IA, pero hay que gestionar la expectativa o añadir mayor consistencia en el prompt.',
    feedback_ids: ['1776421399789-ny6i8', '1776191709043-1rcv9', '1776195194538-wi22i'],
  },
  {
    numero: 'UX-02', tipo: 'ux', prioridad: 'alta',
    titulo: 'Seguir sugerencias baja la puntuación (proceso no lineal no comunicado)',
    descripcion: 'Los usuarios aplican las mejoras sugeridas y la puntuación baja en el siguiente análisis. El proceso de análisis iterativo descubre nuevos problemas en cada ciclo, pero la UI lo presenta como lineal. Hay que comunicar explícitamente que la puntuación puede fluctuar.',
    feedback_ids: ['1776340596796-wftow', '1776327050340-dn3ob', '1776195194538-wi22i'],
  },
  {
    numero: 'UX-03', tipo: 'ux', prioridad: 'alta',
    titulo: 'Estado no persiste al navegar entre secciones',
    descripcion: 'Al cambiar de sección y volver, los datos cargados (perfil LinkedIn, CV analizado) se pierden. El usuario tiene que empezar desde cero. El estado debería mantenerse durante la sesión.',
    feedback_ids: ['1776276202430-1dydp'],
  },
  {
    numero: 'UX-04', tipo: 'ux', prioridad: 'alta',
    titulo: 'CV subido en "Analizar" no pre-carga en sección Match',
    descripcion: 'Si el usuario ya subió su CV en "Analizar CV", tiene que volver a subirlo en Match con oferta. Debería detectar que ya existe un CV en sesión y ofrecerlo como opción pre-seleccionada.',
    feedback_ids: ['1776275039375-5mink'],
  },
  {
    numero: 'UX-05', tipo: 'ux', prioridad: 'media',
    titulo: 'No detecta si el archivo subido no es un CV',
    descripcion: 'Al subir un documento que no es un CV (ej: una factura), la app analiza igualmente y da una puntuación muy baja. Debería detectar que el documento no parece un CV y mostrar un mensaje claro.',
    feedback_ids: ['1776421552242-1384v'],
  },
  {
    numero: 'UX-06', tipo: 'ux', prioridad: 'media',
    titulo: 'Editor: scrolls del panel de edición y vista previa no son independientes',
    descripcion: 'Con CVs largos el usuario debe hacer scroll muy lejos para editar los campos inferiores mientras la vista previa queda fuera de pantalla. Cada panel debería tener su propio scroll.',
    feedback_ids: ['1776197535544-jfa39'],
  },
  {
    numero: 'UX-07', tipo: 'ux', prioridad: 'media',
    titulo: 'Editor: secciones en español aunque el CV esté en inglés',
    descripcion: 'Cuando el CV está escrito en inglés, las etiquetas de sección del editor aparecen en castellano, creando una mezcla de idiomas confusa.',
    feedback_ids: ['1776379180353-l6xoy', '1776197535544-jfa39'],
  },
  {
    numero: 'UX-08', tipo: 'ux', prioridad: 'media',
    titulo: 'Editor: "Mejorar" no indica qué ha cambiado',
    descripcion: 'Al pulsar "Mejorar" en el editor, el CV se modifica pero no hay ningún feedback visual de qué ha cambiado. El usuario no sabe qué revisar ni qué aceptar.',
    feedback_ids: ['1776197535544-jfa39'],
  },
  {
    numero: 'UX-09', tipo: 'ux', prioridad: 'media',
    titulo: 'Editor: campos no se pre-rellenan con datos del CV subido',
    descripcion: 'El editor de CV obliga al usuario a rellenar todos los campos desde cero aunque ya haya subido su CV. Debería parsear el CV y pre-rellenar los campos automáticamente.',
    feedback_ids: ['1776275712655-sce1e'],
  },
  {
    numero: 'UX-10', tipo: 'ux', prioridad: 'baja',
    titulo: 'Hover en botones y enlaces apenas se nota (accesibilidad)',
    descripcion: 'Los elementos accionables no tienen estados hover visualmente claros. Solo cambia el cursor, pero no hay cambio de color ni contraste suficiente. Impacta en accesibilidad y UX.',
    feedback_ids: ['1776276073487-s1rwk'],
  },
  {
    numero: 'UX-11', tipo: 'ux', prioridad: 'media',
    titulo: 'LinkedIn: análisis debería funcionar solo con URL',
    descripcion: 'El flujo actual requiere copiar y pegar el perfil manualmente. Los usuarios esperan que baste con pegar la URL. Requiere explorar scraping controlado, extensión o API de LinkedIn.',
    feedback_ids: ['1776243304671-5lrvh', '1776197226048-dcxqz'],
  },
  {
    numero: 'UX-12', tipo: 'ux', prioridad: 'media',
    titulo: 'Botón de descarga PDF poco visible y funcionalidades no descubribles',
    descripcion: 'Varios usuarios tardaron en encontrar el botón de descargar PDF y no descubrieron secciones como Match o LinkedIn hasta releer las instrucciones. La navegación principal necesita más visibilidad.',
    feedback_ids: ['1776336301058-zdcz7'],
  },
  {
    numero: 'UX-13', tipo: 'ux', prioridad: 'baja',
    titulo: 'Formulario de feedback: adjuntar imágenes y Ctrl+Enter para enviar',
    descripcion: 'El formulario de feedback no permite adjuntar capturas de pantalla, limitando la calidad del reporte de bugs. Tampoco responde a Ctrl+Enter (enviar) ni a Escape (cerrar).',
    feedback_ids: ['1776275175161-me8dt', '1776275712655-sce1e'],
  },
  {
    numero: 'UX-14', tipo: 'ux', prioridad: 'baja',
    titulo: 'Alerta de superposición de roles sin alternativa de gestión',
    descripcion: 'El análisis detecta superposición de roles en el historial laboral pero no ofrece ninguna orientación para resolverla. El feedback debería incluir una sugerencia accionable.',
    feedback_ids: ['1776339650645-63sk4'],
  },
  {
    numero: 'UX-15', tipo: 'ux', prioridad: 'media',
    titulo: 'CV generado por GetManfred no pasa el ATS Killer (contradicción de marca)',
    descripcion: 'Un usuario descargó su CV de GetManfred y obtuvo resultados negativos por elementos propios de la plataforma (pies de página, saltos, "BUT WAIT"). Hay que identificar y descontar artefactos generados por la propia plataforma.',
    feedback_ids: ['1776240906049-ujy0r'],
  },
  // ── IDEAS ──────────────────────────────────────────────────────────────────
  {
    numero: 'IDEA-01', tipo: 'idea', prioridad: 'media',
    titulo: 'CV de ejemplo precargado en la landing page',
    descripcion: 'Los usuarios llegan a la landing y se les pide el CV sin saber qué van a obtener. Un CV de ejemplo precargado que muestre el informe reducirá la fricción de entrada.',
    feedback_ids: ['1776276424553-y8zfa'],
  },
  {
    numero: 'IDEA-02', tipo: 'idea', prioridad: 'media',
    titulo: 'Comparar CVs directamente desde la lista sin entrar en uno',
    descripcion: 'Actualmente la comparación se hace entrando en un CV y seleccionando otro. Sería más útil poder seleccionar dos CVs desde la vista de lista y lanzar la comparación directamente.',
    feedback_ids: ['1776327802836-2yllc'],
  },
  {
    numero: 'IDEA-03', tipo: 'idea', prioridad: 'baja',
    titulo: 'Más plantillas y estilos en el Editor de CV; opción de foto',
    descripcion: 'El editor solo ofrece el formato Harvard. Los usuarios piden más plantillas, estilos visuales distintos y la opción de incluir o no foto en el CV.',
    feedback_ids: ['1776327556536-fuqq1', '1776241046180-a5vjq', '1776176800218-sh78b'],
  },
  {
    numero: 'IDEA-04', tipo: 'idea', prioridad: 'media',
    titulo: 'Botón "Sugiéreme uno" para aplicar mejoras de texto automáticamente',
    descripcion: 'Cuando el análisis da un consejo de redacción, el usuario quiere un botón que aplique esa mejora automáticamente y muestre el resultado para que lo acepte o descarte.',
    feedback_ids: ['1776276625600-cz7z0'],
  },
  {
    numero: 'IDEA-05', tipo: 'idea', prioridad: 'baja',
    titulo: 'Adaptar el CV automáticamente durante el match con una oferta',
    descripcion: 'Cuando se hace el match CV-oferta, además del análisis de brecha, ofrecer la opción de adaptar automáticamente el CV a los requisitos de esa oferta concreta.',
    feedback_ids: ['1776194268122-2xhk8'],
  },
  {
    numero: 'IDEA-06', tipo: 'idea', prioridad: 'baja',
    titulo: 'Match en batch: analizar varias ofertas a la vez',
    descripcion: 'Poder pegar o subir múltiples ofertas y obtener un ranking de compatibilidad del CV con cada una, ahorrando tiempo en la búsqueda activa de empleo.',
    feedback_ids: ['1776177000542-7g9dh'],
  },
  {
    numero: 'IDEA-07', tipo: 'idea', prioridad: 'baja',
    titulo: 'Integración real con LinkedIn vía API (en lugar de C&P)',
    descripcion: 'La integración actual mediante copia-pega es provisional. Una integración vía API oficial o extensión de navegador aportaría el 100% del contenido (incluyendo secciones "ver más") y reduciría la fricción.',
    feedback_ids: ['1776275435522-hzrbs', '1776197226048-dcxqz'],
  },
]

export async function GET() {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .order('id', { ascending: true })

    if (error) throw error

    // Auto-seed on first use
    if (!data || data.length === 0) {
      const { data: seeded, error: seedError } = await supabase
        .from('issues')
        .insert(SEED_ISSUES)
        .select()

      if (seedError) throw seedError
      return NextResponse.json(seeded ?? [])
    }

    return NextResponse.json(data)
  } catch (e) {
    console.error('GET /api/issues error:', e)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { numero, tipo, titulo, descripcion, prioridad, feedback_ids } = body

    if (!numero || !tipo || !titulo || !descripcion) {
      return NextResponse.json({ error: 'Campos obligatorios: numero, tipo, titulo, descripcion.' }, { status: 400 })
    }

    const { data, error } = await getSupabase()
      .from('issues')
      .insert({ numero, tipo, titulo, descripcion, prioridad: prioridad ?? 'media', feedback_ids: feedback_ids ?? [] })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ ok: true, issue: data })
  } catch (e) {
    console.error('POST /api/issues error:', e)
    return NextResponse.json({ error: 'Error inesperado.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...fields } = body

    if (!id) return NextResponse.json({ error: 'id requerido.' }, { status: 400 })

    const allowed = ['titulo', 'descripcion', 'tipo', 'prioridad', 'estado', 'feedback_ids', 'asignado_a']
    const update: Record<string, unknown> = { fecha_actualizacion: new Date().toISOString() }
    for (const key of allowed) {
      if (key in fields) update[key] = fields[key]
    }

    const { data, error } = await getSupabase()
      .from('issues')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ ok: true, issue: data })
  } catch (e) {
    console.error('PATCH /api/issues error:', e)
    return NextResponse.json({ error: 'Error inesperado.' }, { status: 500 })
  }
}
