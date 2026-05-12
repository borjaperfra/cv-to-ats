import type { Metadata } from 'next'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'Política de Privacidad — ATSKiller by Manfred',
  description: 'Información sobre el tratamiento de datos personales en ATSKiller, la herramienta gratuita de análisis de CVs de Manfred.',
}

const sections = [
  {
    title: '1. Información general',
    content: (
      <>
        <p>
          ATSKiller es una herramienta gratuita de <strong>Manfred Tech S.L.U.</strong> que permite analizar
          currículums vitae (CV) mediante inteligencia artificial a través de la API de Gemini de Google.
        </p>
        <p className="mt-3">
          La privacidad y seguridad de los datos personales es una prioridad. Esta herramienta ha sido diseñada
          para minimizar al máximo el almacenamiento y tratamiento de información personal.
        </p>
      </>
    ),
  },
  {
    title: '2. Qué datos se procesan',
    content: (
      <>
        <p>
          La herramienta puede procesar la información incluida voluntariamente por el usuario en el CV que suba
          para su análisis, incluyendo datos personales y profesionales contenidos en dicho documento.
        </p>
        <ul className="mt-3 space-y-1 list-disc list-inside text-gray-500">
          <li>Nombre y apellidos</li>
          <li>Email o teléfono</li>
          <li>Experiencia laboral</li>
          <li>Formación académica</li>
          <li>Tecnologías y habilidades</li>
          <li>Cualquier otra información incluida en el CV</li>
        </ul>
      </>
    ),
  },
  {
    title: '3. Cómo funciona el procesamiento de datos',
    content: (
      <ul className="space-y-2 list-disc list-inside text-gray-500">
        <li>El CV es procesado temporalmente para generar el análisis solicitado.</li>
        <li>La herramienta no almacena CVs ni datos personales en servidores propios.</li>
        <li>
          La información puede mantenerse localmente en el navegador del usuario mediante{' '}
          <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">localStorage</code> con el
          único objetivo de mejorar la experiencia de uso (historial de análisis, preferencias de idioma).
        </li>
        <li>
          El contenido del CV se envía temporalmente a la API de Gemini de Google para generar el análisis
          mediante inteligencia artificial.
        </li>
      </ul>
    ),
  },
  {
    title: '4. Almacenamiento de datos',
    content: (
      <>
        <p>Esta herramienta:</p>
        <ul className="mt-3 space-y-2 list-disc list-inside text-gray-500">
          <li>No crea bases de datos de candidatos.</li>
          <li>No vende información personal.</li>
          <li>No comparte CVs con terceros distintos de los proveedores tecnológicos necesarios para ejecutar el análisis.</li>
          <li>No almacena CVs en infraestructura propia.</li>
        </ul>
        <p className="mt-3">
          El almacenamiento local realizado mediante{' '}
          <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">localStorage</code> depende
          exclusivamente del navegador del usuario y puede eliminarse en cualquier momento desde la configuración
          del navegador.
        </p>
      </>
    ),
  },
  {
    title: '5. Servicios de terceros',
    content: (
      <>
        <p>Para ofrecer el análisis del CV, esta herramienta utiliza los siguientes servicios de terceros:</p>
        <div className="mt-3 space-y-3">
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="font-sans font-[700] text-sm" style={{ color: '#092c64' }}>Google Gemini API</p>
            <p className="font-sans text-xs text-gray-400 mt-1">
              Procesamiento de IA para el análisis del CV. Consulta la{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
                className="underline hover:opacity-70 transition-opacity" style={{ color: '#0DA1A4' }}>
                política de privacidad de Google
              </a>.
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="font-sans font-[700] text-sm" style={{ color: '#092c64' }}>Railway</p>
            <p className="font-sans text-xs text-gray-400 mt-1">
              Infraestructura de despliegue. Consulta la{' '}
              <a href="https://railway.com/legal/privacy" target="_blank" rel="noopener noreferrer"
                className="underline hover:opacity-70 transition-opacity" style={{ color: '#0DA1A4' }}>
                política de privacidad de Railway
              </a>.
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          El uso de dichos servicios puede implicar el procesamiento temporal de datos por parte de dichos
          proveedores conforme a sus propias políticas de privacidad.
        </p>
      </>
    ),
  },
  {
    title: '6. Base legal',
    content: (
      <p>
        La base legal para el tratamiento de los datos es el <strong>consentimiento del usuario</strong>,
        otorgado al subir voluntariamente su CV para ser analizado.
      </p>
    ),
  },
  {
    title: '7. Derechos del usuario',
    content: (
      <>
        <p>El usuario puede:</p>
        <ul className="mt-3 space-y-2 list-disc list-inside text-gray-500">
          <li>Dejar de utilizar la herramienta en cualquier momento.</li>
          <li>Eliminar los datos almacenados localmente borrando el almacenamiento del navegador.</li>
          <li>Solicitar información adicional sobre privacidad y tratamiento de datos contactando con Manfred.</li>
        </ul>
      </>
    ),
  },
  {
    title: '8. Seguridad',
    content: (
      <p>
        Se aplican medidas razonables para minimizar el tratamiento y exposición de datos personales. No
        obstante, ningún sistema conectado a internet puede garantizar una seguridad absoluta.
      </p>
    ),
  },
  {
    title: '9. Cambios en esta política',
    content: (
      <p>
        Esta política de privacidad puede actualizarse para reflejar mejoras técnicas, cambios legales o
        modificaciones en el funcionamiento de la herramienta. La fecha de última actualización se indica
        al inicio de este documento.
      </p>
    ),
  },
  {
    title: '10. Contacto',
    content: (
      <>
        <p>
          Para cualquier consulta relacionada con privacidad o protección de datos, puedes contactar con
          Manfred Tech S.L.U.:
        </p>
        <div className="mt-3 rounded-xl border border-gray-100 p-4 space-y-1">
          <p className="font-sans text-sm font-[700]" style={{ color: '#092c64' }}>Manfred Tech S.L.U.</p>
          <p className="font-sans text-xs text-gray-500">Calle Labastida 1, 28034 Madrid, España</p>
          <a href="mailto:hello@getmanfred.com"
            className="font-sans text-xs underline hover:opacity-70 transition-opacity block mt-1"
            style={{ color: '#0DA1A4' }}>
            hello@getmanfred.com
          </a>
        </div>
      </>
    ),
  },
]

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0ede8' }}>
      <Header />

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="font-sans font-[600] text-xs uppercase tracking-widest text-gray-400 mb-1">
            Legal
          </p>
          <h1 className="font-heading font-[900] text-3xl" style={{ color: '#1a2744' }}>
            Política de Privacidad
          </h1>
          <p className="font-sans text-xs text-gray-400 mt-2">
            Última actualización: 12 de mayo de 2026
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <div
              key={section.title}
              className="bg-white rounded-2xl p-6"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
            >
              <h2 className="font-sans font-[800] text-sm uppercase tracking-widest mb-3"
                style={{ color: '#092c64' }}>
                {section.title}
              </h2>
              <div className="font-sans text-sm leading-relaxed" style={{ color: '#4b5563' }}>
                {section.content}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
